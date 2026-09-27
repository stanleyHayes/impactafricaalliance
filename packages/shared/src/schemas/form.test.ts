import { describe, expect, it } from 'vitest';

import { PILLARS } from '../constants/content.js';

import {
  acceptedFormatsFor,
  answersToMap,
  applicantFromAnswers,
  FORM_TEMPLATES,
  formAnswersSchema,
  formCreateSchema,
  formDefinitionProblems,
  formInputSchema,
  formListQuerySchema,
  formPublishProblems,
  formTemplate,
  formUpdateSchema,
  formWindowState,
  isAcceptedFilename,
  isReservedFormSlug,
  isRuleMet,
  isVisible,
  maxFileBytesFor,
  pruneHiddenAnswers,
  validateAnswer,
  validateAnswers,
  visibleSteps,
  type FileAnswer,
  type FormField,
  type FormStep,
  type VisibilityRule,
} from './form.js';
import { STABLE_ID_PATTERN } from './work.js';

const field = (id: string, type: FormField['type'], extra: Partial<FormField> = {}): FormField => ({
  id,
  type,
  label: id,
  required: false,
  options: [],
  ...extra,
});

const choices = (...values: string[]) => values.map((value) => ({ value, label: value }));

const file = (name: string, extra: Partial<FileAnswer> = {}): FileAnswer => ({
  publicId: `iaa/applications/form/draft/${name}`,
  url: `https://res.cloudinary.com/iaa/image/authenticated/${name}`,
  name,
  ...extra,
});

const rule = (
  fieldId: string,
  operator: VisibilityRule['operator'],
  value?: string,
): VisibilityRule => (value === undefined ? { fieldId, operator } : { fieldId, operator, value });

describe('checking one answer', () => {
  describe('text', () => {
    const text = field('bio', 'long-text', { validation: { minLength: 10, maxLength: 20 } });

    it('holds drafts to the maximum only, so half-written answers still save', () => {
      expect(validateAnswer(text, 'Short', 'draft')).toBeNull();
      expect(validateAnswer(text, 'x'.repeat(21), 'draft')).toMatch(/20 characters/);
    });

    it('holds submissions to the minimum too', () => {
      expect(validateAnswer(text, 'Short', 'submit')).toMatch(/at least 10/);
      expect(validateAnswer(text, 'Long enough now', 'submit')).toBeNull();
    });

    it('wants text, not another kind of answer', () => {
      expect(validateAnswer(field('name', 'short-text'), 42, 'draft')).toMatch(/text/);
      expect(validateAnswer(field('name', 'short-text'), ['a'], 'draft')).toMatch(/text/);
    });

    it('limits short text even without a set maximum', () => {
      expect(validateAnswer(field('name', 'short-text'), 'x'.repeat(501), 'draft')).not.toBeNull();
      expect(validateAnswer(field('story', 'long-text'), 'x'.repeat(5000), 'submit')).toBeNull();
    });
  });

  it('checks an email address on submit, not while it is being typed', () => {
    const email = field('email', 'email');
    expect(validateAnswer(email, 'ada@', 'draft')).toBeNull();
    expect(validateAnswer(email, 'ada@', 'submit')).toMatch(/email address/);
    expect(validateAnswer(email, ' ada@example.org ', 'submit')).toBeNull();
  });

  it('accepts phone numbers written the way people write them', () => {
    const phone = field('phone', 'phone');
    expect(validateAnswer(phone, '+233 20 123 4567', 'submit')).toBeNull();
    expect(validateAnswer(phone, '(020) 123-4567', 'submit')).toBeNull();
    expect(validateAnswer(phone, 'call me', 'draft')).toBeNull();
    expect(validateAnswer(phone, 'call me', 'submit')).toMatch(/country code/);
    expect(validateAnswer(phone, '123', 'submit')).not.toBeNull();
  });

  it('wants a real number, in range on submit', () => {
    const years = field('years', 'number', { validation: { min: 1, max: 60 } });
    expect(validateAnswer(years, '12', 'draft')).toMatch(/number/);
    expect(validateAnswer(years, Number.POSITIVE_INFINITY, 'draft')).toMatch(/number/);
    expect(validateAnswer(years, 0, 'draft')).toBeNull();
    expect(validateAnswer(years, 0, 'submit')).toMatch(/1 or more/);
    expect(validateAnswer(years, 61, 'submit')).toMatch(/60 or less/);
    expect(validateAnswer(years, 12, 'submit')).toBeNull();
  });

  it('accepts a calendar day or a full timestamp as a date', () => {
    const date = field('available', 'date');
    expect(validateAnswer(date, '2026-10-05', 'submit')).toBeNull();
    expect(validateAnswer(date, '2026-10-05T12:00:00.000Z', 'submit')).toBeNull();
    expect(validateAnswer(date, '05/10/2026', 'submit')).toMatch(/date/);
    expect(validateAnswer(date, '2026-02-30', 'submit')).toMatch(/date/);
  });

  it('holds single choices to the options on submit', () => {
    for (const type of ['select', 'radio'] as const) {
      const choice = field('format', type, { options: choices('keynote', 'panel') });
      expect(validateAnswer(choice, 'panel', 'submit')).toBeNull();
      expect(validateAnswer(choice, 'dropped-option', 'draft')).toBeNull();
      expect(validateAnswer(choice, 'dropped-option', 'submit')).toMatch(/options/);
      expect(validateAnswer(choice, ['panel'], 'draft')).toMatch(/options/);
    }
  });

  it('holds multiple choices to the options, once each, within the count', () => {
    const topics = field('topics', 'multi-select', {
      options: choices('a', 'b', 'c'),
      validation: { min: 1, max: 2 },
    });
    expect(validateAnswer(topics, ['a', 'b'], 'submit')).toBeNull();
    expect(validateAnswer(topics, ['a', 'z'], 'submit')).toMatch(/options/);
    expect(validateAnswer(topics, ['a', 'a'], 'submit')).toMatch(/options/);
    expect(validateAnswer(topics, ['a', 'b', 'c'], 'submit')).toMatch(/no more than 2/);
    expect(validateAnswer(topics, ['a', 'b', 'c'], 'draft')).toBeNull();
    expect(validateAnswer(topics, 'a', 'draft')).toMatch(/options/);
  });

  it('wants a tick-box answered with a tick', () => {
    const box = field('newsletter', 'checkbox');
    expect(validateAnswer(box, true, 'submit')).toBeNull();
    expect(validateAnswer(box, false, 'submit')).toBeNull();
    expect(validateAnswer(box, 'yes', 'draft')).toMatch(/Tick/);
    expect(validateAnswer({ ...box, required: true }, false, 'submit')).toMatch(/Tick this box/);
  });

  it('accepts web links and nothing that could run', () => {
    const link = field('talk', 'url');
    expect(validateAnswer(link, 'https://youtu.be/abc', 'submit')).toBeNull();
    expect(validateAnswer(link, 'http://example.com/talk', 'submit')).toBeNull();
    expect(validateAnswer(link, 'ftp://example.com/talk', 'submit')).toMatch(/link/);
    expect(validateAnswer(link, 'javascript:alert(1)', 'submit')).toMatch(/link/);
    expect(validateAnswer(link, 'example.com', 'submit')).toMatch(/link/);
  });

  describe('files', () => {
    const photo = field('headshot', 'file', {
      validation: { fileKinds: ['image'], maxFiles: 1, maxSizeMB: 5 },
    });

    it('accepts a file of the right kind and size', () => {
      expect(validateAnswer(photo, [file('me.jpg', { bytes: 1024 })], 'submit')).toBeNull();
      expect(validateAnswer(photo, [file('me.PNG')], 'draft')).toBeNull();
    });

    it('refuses too many, the wrong kind or too large, even in a draft', () => {
      expect(validateAnswer(photo, [file('a.jpg'), file('b.jpg')], 'draft')).toMatch(/one file/);
      expect(validateAnswer(photo, [file('cv.pdf')], 'draft')).toMatch(/not a type/);
      expect(validateAnswer(photo, [file('big.jpg', { bytes: 6 * 1024 * 1024 })], 'draft')).toMatch(
        /larger than 5 MB/,
      );
    });

    it('trusts the stored format over the name when there is one', () => {
      expect(validateAnswer(photo, [file('upload', { format: 'webp' })], 'submit')).toBeNull();
    });

    it('refuses something that is not an upload', () => {
      expect(validateAnswer(photo, ['me.jpg'], 'draft')).toMatch(/Upload/);
    });

    // Drafts are read back from storage before any schema sees them, so the
    // answer check has to hold the same line as the request schema.
    it('refuses a file whose address could run script or whose id climbs out of its folder', () => {
      const unsafe = [
        file('me.jpg', { url: 'javascript:alert(1)' }),
        file('me.jpg', { url: 'http://res.cloudinary.com/iaa/me.jpg' }),
        file('me.jpg', { url: 'https://res.cloudinary.com@evil.example/me.jpg' }),
        file('me.jpg', { publicId: 'iaa/applications/form/draft/../../other/me.jpg' }),
        file('me.jpg', { publicId: '/iaa/me.jpg' }),
      ];
      for (const answer of unsafe) {
        expect(validateAnswer(photo, [answer], 'draft')).toMatch(/Upload/);
      }
    });

    it('allows several files when the question does', () => {
      const papers = field('papers', 'file', { validation: { maxFiles: 3 } });
      expect(
        validateAnswer(papers, [file('a.pdf'), file('b.docx'), file('c.xlsx')], 'submit'),
      ).toBeNull();
      expect(
        validateAnswer(
          papers,
          [file('a.pdf'), file('b.pdf'), file('c.pdf'), file('d.pdf')],
          'submit',
        ),
      ).toMatch(/no more than 3/);
    });
  });

  it('needs consent agreed to on submit, required or not', () => {
    const consent = field('consent', 'consent', { consentText: 'I agree.' });
    expect(validateAnswer(consent, true, 'submit')).toBeNull();
    expect(validateAnswer(consent, false, 'draft')).toBeNull();
    expect(validateAnswer(consent, false, 'submit')).toMatch(/agree/);
    expect(validateAnswer(consent, undefined, 'submit')).toMatch(/agree/);
  });

  it('asks for required answers on submit only', () => {
    const name = field('name', 'short-text', { required: true });
    expect(validateAnswer(name, '   ', 'draft')).toBeNull();
    expect(validateAnswer(name, '   ', 'submit')).toMatch(/needs an answer/);
    expect(validateAnswer(name, null, 'submit')).toMatch(/needs an answer/);
    expect(
      validateAnswer(field('topics', 'multi-select', { required: true }), [], 'submit'),
    ).toMatch(/at least one/);
    expect(validateAnswer(field('cv', 'file', { required: true }), [], 'submit')).toMatch(
      /Add a file/,
    );
  });
});

describe('visibility rules', () => {
  it('compares text without regard to case or spaces', () => {
    expect(isRuleMet(rule('a', 'equals', 'yes'), { a: ' YES ' })).toBe(true);
    expect(isRuleMet(rule('a', 'not-equals', 'yes'), { a: 'no' })).toBe(true);
    expect(isRuleMet(rule('a', 'not-equals', 'yes'), {})).toBe(true);
  });

  it('checks a multi-select for one of its choices', () => {
    const answers = { topics: ['digital-skills', 'stem-learning'] };
    expect(isRuleMet(rule('topics', 'includes', 'stem-learning'), answers)).toBe(true);
    expect(isRuleMet(rule('topics', 'includes', 'youth-inclusion'), answers)).toBe(false);
    expect(isRuleMet(rule('topics', 'not-includes', 'youth-inclusion'), answers)).toBe(true);
    // Equals on a multi-select means it is the only thing chosen.
    expect(isRuleMet(rule('topics', 'equals', 'stem-learning'), answers)).toBe(false);
    expect(
      isRuleMet(rule('topics', 'equals', 'stem-learning'), { topics: ['stem-learning'] }),
    ).toBe(true);
  });

  it('checks text for a phrase', () => {
    expect(isRuleMet(rule('why', 'includes', 'Climate'), { why: 'Youth climate work' })).toBe(true);
    expect(isRuleMet(rule('why', 'includes', ''), { why: 'anything' })).toBe(false);
  });

  it('compares ticks and numbers sensibly', () => {
    expect(isRuleMet(rule('box', 'equals', 'true'), { box: true })).toBe(true);
    expect(isRuleMet(rule('box', 'equals', 'true'), { box: false })).toBe(false);
    expect(isRuleMet(rule('count', 'equals', '3'), { count: 3 })).toBe(true);
    expect(isRuleMet(rule('count', 'equals', ''), { count: 0 })).toBe(false);
  });

  it('knows empty from answered', () => {
    expect(isRuleMet(rule('a', 'is-empty'), {})).toBe(true);
    expect(isRuleMet(rule('a', 'is-empty'), { a: '  ' })).toBe(true);
    expect(isRuleMet(rule('a', 'is-empty'), { a: [] })).toBe(true);
    expect(isRuleMet(rule('a', 'is-not-empty'), { a: 'x' })).toBe(true);
    expect(isRuleMet(rule('a', 'is-not-empty'), { a: 0 })).toBe(true);
  });

  it('does not mistake a built-in property for an answer', () => {
    expect(isRuleMet(rule('constructor', 'is-empty'), {})).toBe(true);
  });

  it('matches all rules or any rule, and shows things with no condition', () => {
    const rules = [rule('a', 'equals', 'yes'), rule('b', 'equals', 'yes')];
    const answers = { a: 'yes', b: 'no' };
    expect(isVisible({ match: 'all', rules }, answers)).toBe(false);
    expect(isVisible({ match: 'any', rules }, answers)).toBe(true);
    expect(isVisible(null, answers)).toBe(true);
    expect(isVisible(undefined, answers)).toBe(true);
    expect(isVisible({ match: 'all', rules: [] }, answers)).toBe(true);
  });
});

const whenYes = { match: 'all' as const, rules: [rule('spoken', 'equals', 'yes')] };

const conditionalForm: FormStep[] = [
  {
    id: 'about',
    title: 'About you',
    fields: [
      field('name', 'short-text', { required: true, mapsTo: 'applicant-name' }),
      field('spoken', 'radio', { required: true, options: choices('yes', 'no') }),
      field('talk-link', 'url', { required: true, visibility: whenYes }),
      field('talk-notes', 'long-text', {
        required: true,
        visibility: { match: 'all', rules: [rule('talk-link', 'is-not-empty')] },
      }),
    ],
  },
  {
    id: 'speaking',
    title: 'Speaking history',
    visibility: whenYes,
    fields: [field('events', 'long-text', { required: true })],
  },
  {
    id: 'contact',
    title: 'Contact',
    fields: [field('email', 'email', { required: true }), field('backup-email', 'email')],
  },
];

describe('answers across a whole form', () => {
  it('does not require a required question that is hidden', () => {
    const problems = validateAnswers(
      conditionalForm,
      [
        { fieldId: 'name', value: 'Ada' },
        { fieldId: 'spoken', value: 'no' },
        { fieldId: 'email', value: 'ada@example.org' },
      ],
      { mode: 'submit' },
    );
    expect(problems).toEqual([]);
  });

  it('requires it once its condition is met, and says which step it is on', () => {
    const problems = validateAnswers(
      conditionalForm,
      { name: 'Ada', spoken: 'yes', email: 'ada@example.org' },
      { mode: 'submit' },
    );
    expect(problems.map((problem) => [problem.stepId, problem.fieldId])).toEqual([
      ['about', 'talk-link'],
      ['speaking', 'events'],
    ]);
  });

  it('hides what depends on a hidden question, even if it was answered earlier', () => {
    const answers = {
      name: 'Ada',
      spoken: 'no',
      'talk-link': 'https://example.org/talk',
      email: 'ada@example.org',
    };
    const steps = visibleSteps(conditionalForm, answers);
    expect(steps.map((step) => step.id)).toEqual(['about', 'contact']);
    expect(steps[0]?.fields.map((question) => question.id)).toEqual(['name', 'spoken']);
    expect(validateAnswers(conditionalForm, answers, { mode: 'submit' })).toEqual([]);
  });

  // A question removed from a published form while someone was part-way
  // through leaves an answer they have no screen to remove. Refusing it would
  // trap them; pruning drops it instead.
  it('lets a submission through with an answer to a question the form no longer has', () => {
    const answers = { name: 'Ada', spoken: 'no', email: 'ada@example.org', shoe: '42' };
    expect(validateAnswers(conditionalForm, answers, { mode: 'draft' })).toEqual([]);
    expect(validateAnswers(conditionalForm, answers, { mode: 'submit' })).toEqual([]);
    expect(pruneHiddenAnswers(conditionalForm, answers).map((answer) => answer.fieldId)).toEqual([
      'name',
      'spoken',
      'email',
    ]);
  });

  it('skips a step whose questions are all hidden, but keeps a step with none to answer', () => {
    const steps: FormStep[] = [
      {
        id: 'start',
        title: 'Start',
        fields: [field('student', 'radio', { options: choices('yes', 'no') })],
      },
      { id: 'note', title: 'Before you go on', description: 'Read this first.', fields: [] },
      {
        id: 'school',
        title: 'Your school',
        fields: [
          field('school-name', 'short-text', {
            required: true,
            visibility: { match: 'all', rules: [rule('student', 'equals', 'yes')] },
          }),
        ],
      },
    ];
    expect(visibleSteps(steps, { student: 'no' }).map((step) => step.id)).toEqual([
      'start',
      'note',
    ]);
    expect(visibleSteps(steps, { student: 'yes' }).map((step) => step.id)).toEqual([
      'start',
      'note',
      'school',
    ]);
    expect(validateAnswers(steps, { student: 'no' }, { mode: 'submit' })).toEqual([]);
  });

  it('keeps only visible answers, in form order', () => {
    expect(
      pruneHiddenAnswers(conditionalForm, [
        { fieldId: 'email', value: 'ada@example.org' },
        { fieldId: 'talk-link', value: 'https://example.org/talk' },
        { fieldId: 'events', value: 'Plenty' },
        { fieldId: 'shoe', value: '42' },
        { fieldId: 'spoken', value: 'no' },
        { fieldId: 'name', value: 'Ada' },
      ]),
    ).toEqual([
      { fieldId: 'name', value: 'Ada' },
      { fieldId: 'spoken', value: 'no' },
      { fieldId: 'email', value: 'ada@example.org' },
    ]);
  });

  it('lets a later answer to the same question win when building a map', () => {
    expect(
      answersToMap([
        { fieldId: 'a', value: 'first' },
        { fieldId: 'a', value: 'second' },
      ]),
    ).toEqual({ a: 'second' });
  });
});

describe('who applied', () => {
  it('reads the mapped questions and tidies the email', () => {
    const steps: FormStep[] = [
      {
        id: 'you',
        title: 'You',
        fields: [
          field('full-name', 'short-text', { mapsTo: 'applicant-name' }),
          field('work-email', 'email', { mapsTo: 'applicant-email' }),
          field('mobile', 'phone', { mapsTo: 'applicant-phone' }),
        ],
      },
    ];
    expect(
      applicantFromAnswers(steps, {
        'full-name': '  Ada Lovelace ',
        'work-email': ' Ada@Example.org ',
        mobile: '+233 20 123 4567',
      }),
    ).toEqual({ name: 'Ada Lovelace', email: 'ada@example.org', phone: '+233 20 123 4567' });
  });

  it('falls back to the first answered email question when none is mapped', () => {
    expect(
      applicantFromAnswers(conditionalForm, {
        name: 'Ada',
        spoken: 'no',
        'backup-email': 'ada@example.org',
      }),
    ).toEqual({ name: 'Ada', email: 'ada@example.org' });
  });

  // The acknowledgement goes to this address. Once the form names the
  // applicant's own email question, any other email question belongs to
  // someone else, such as a referee.
  it('never takes another email question once one is mapped, even if that one is blank', () => {
    const steps: FormStep[] = [
      {
        id: 'you',
        title: 'You',
        fields: [
          field('own-email', 'email', { mapsTo: 'applicant-email' }),
          field('referee-email', 'email'),
        ],
      },
    ];
    expect(applicantFromAnswers(steps, { 'referee-email': 'referee@example.org' })).toEqual({});
  });

  it('does not return an email that is not an address, as in a half-typed draft', () => {
    expect(
      applicantFromAnswers(conditionalForm, { name: 'Ada', spoken: 'no', email: 'ada@exam' }),
    ).toEqual({ name: 'Ada' });
  });

  it('ignores hidden questions', () => {
    const steps: FormStep[] = [
      {
        id: 'you',
        title: 'You',
        fields: [
          field('has-email', 'radio', { options: choices('yes', 'no') }),
          field('email', 'email', {
            mapsTo: 'applicant-email',
            visibility: { match: 'all', rules: [rule('has-email', 'equals', 'yes')] },
          }),
        ],
      },
    ];
    expect(applicantFromAnswers(steps, { 'has-email': 'no', email: 'old@example.org' })).toEqual(
      {},
    );
  });
});

describe('the answer window', () => {
  const settings = { opensAt: '2026-10-01T09:00:00.000Z', closesAt: '2026-10-31T17:00:00.000Z' };

  it('is not yet open before the opening time', () => {
    expect(formWindowState(settings, new Date('2026-09-30T12:00:00.000Z'))).toBe('not-yet-open');
  });

  it('is open in between', () => {
    expect(formWindowState(settings, new Date('2026-10-15T12:00:00.000Z'))).toBe('open');
  });

  it('closes at the closing time exactly', () => {
    expect(formWindowState(settings, new Date('2026-10-31T17:00:00.000Z'))).toBe('closed');
  });

  it('is always open without a schedule', () => {
    expect(formWindowState(undefined, new Date())).toBe('open');
    expect(formWindowState({ opensAt: null, closesAt: null }, new Date())).toBe('open');
  });
});

describe('problems with a form definition', () => {
  it('finds nothing wrong with a sound form', () => {
    expect(formDefinitionProblems(conditionalForm)).toEqual([]);
  });

  it('refuses the same id twice, across steps or between a step and a question', () => {
    const steps: FormStep[] = [
      {
        id: 'one',
        title: 'One',
        fields: [field('name', 'short-text'), field('one', 'short-text')],
      },
      { id: 'two', title: 'Two', fields: [field('name', 'short-text')] },
    ];
    const problems = formDefinitionProblems(steps);
    expect(
      problems.filter((problem) => problem.includes('"name" is used more than once')),
    ).toHaveLength(1);
    expect(problems.some((problem) => problem.includes('"one" is used more than once'))).toBe(true);
  });

  it('wants options on choice questions, each with its own value', () => {
    const steps: FormStep[] = [
      {
        id: 's',
        title: 'S',
        fields: [
          field('empty', 'select'),
          field('twice', 'radio', {
            options: [...choices('yes'), { value: 'yes', label: 'Yes!' }],
          }),
        ],
      },
    ];
    expect(formDefinitionProblems(steps)).toEqual([
      '"empty" needs at least one option to choose from.',
      '"twice" has two options with the same value.',
    ]);
  });

  it('wants the words a consent question asks people to agree to', () => {
    const steps: FormStep[] = [{ id: 's', title: 'S', fields: [field('consent', 'consent')] }];
    expect(formDefinitionProblems(steps)).toEqual([
      '"consent" needs the words people are agreeing to.',
    ]);
  });

  it('refuses a condition on a later question, in the same step or a later one', () => {
    const steps: FormStep[] = [
      {
        id: 'first',
        title: 'First',
        fields: [
          field('early', 'short-text', {
            visibility: { match: 'all', rules: [rule('late', 'is-empty')] },
          }),
          field('late', 'short-text'),
        ],
      },
      {
        id: 'second',
        title: 'Second',
        visibility: { match: 'all', rules: [rule('own', 'is-empty')] },
        fields: [field('own', 'short-text')],
      },
    ];
    const problems = formDefinitionProblems(steps);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/"early" depends on "late", which comes after it/);
    expect(problems[1]).toMatch(/Step "Second" depends on "own", which comes after it/);
  });

  it('refuses a condition on a question that does not exist, or with nothing to compare', () => {
    const steps: FormStep[] = [
      {
        id: 's',
        title: 'S',
        fields: [
          field('a', 'short-text'),
          field('b', 'short-text', {
            visibility: { match: 'all', rules: [rule('ghost', 'is-empty')] },
          }),
          field('c', 'short-text', { visibility: { match: 'all', rules: [rule('a', 'equals')] } }),
        ],
      },
    ];
    expect(formDefinitionProblems(steps)).toEqual([
      '"b" depends on a question that is not on the form.',
      '"c" has a condition on "a" with nothing to compare against.',
    ]);
  });

  // Each of these would hide its question for good, with nothing on the public
  // form to say why.
  it('refuses a condition that can never be met by the kind of question it reads', () => {
    const when = (fieldId: string, operator: VisibilityRule['operator'], value?: string) => ({
      visibility: { match: 'all' as const, rules: [rule(fieldId, operator, value)] },
    });
    const steps: FormStep[] = [
      {
        id: 's',
        title: 'S',
        fields: [
          field('spoken', 'radio', { options: choices('yes', 'no') }),
          field('agreed', 'checkbox'),
          field('age', 'number'),
          field('cv', 'file'),
          field('typo', 'short-text', when('spoken', 'equals', 'maybe')),
          field('tick', 'short-text', when('agreed', 'equals', 'ticked')),
          field('count', 'short-text', when('age', 'equals', 'twenty')),
          field('upload', 'short-text', when('cv', 'includes', 'cv.pdf')),
        ],
      },
    ];
    expect(formDefinitionProblems(steps)).toEqual([
      '"typo" has a condition on "spoken" for "maybe", which is not one of its options.',
      '"tick" has a condition on "agreed" that can only compare with true (ticked) or false (not ticked).',
      '"count" has a condition on "age" that compares a number with "twenty".',
      '"upload" has a condition on "cv" that can only check whether a file was added. Use "is empty" or "is not empty".',
    ]);
  });

  it('accepts conditions that match the question they read, in any case', () => {
    const when = (fieldId: string, operator: VisibilityRule['operator'], value?: string) => ({
      visibility: { match: 'all' as const, rules: [rule(fieldId, operator, value)] },
    });
    const steps: FormStep[] = [
      {
        id: 's',
        title: 'S',
        fields: [
          field('spoken', 'radio', { options: choices('yes', 'no') }),
          field('agreed', 'checkbox'),
          field('age', 'number'),
          field('cv', 'file'),
          field('a', 'short-text', when('spoken', 'not-equals', ' Yes ')),
          field('b', 'short-text', when('agreed', 'equals', 'TRUE')),
          field('c', 'short-text', when('age', 'equals', '21')),
          field('d', 'short-text', when('cv', 'is-not-empty')),
          field('e', 'short-text', when('a', 'includes', 'anything at all')),
        ],
      },
    ];
    expect(formDefinitionProblems(steps)).toEqual([]);
  });

  it('checks applicant details come from suitable questions, once each', () => {
    const steps: FormStep[] = [
      {
        id: 's',
        title: 'S',
        fields: [
          field('email', 'short-text', { mapsTo: 'applicant-email' }),
          field('name', 'short-text', { mapsTo: 'applicant-name' }),
          field('nickname', 'short-text', { mapsTo: 'applicant-name' }),
        ],
      },
    ];
    expect(formDefinitionProblems(steps)).toEqual([
      "Only one question can supply the applicant's name.",
      '"email" cannot supply the applicant\'s email.',
    ]);
  });

  it('refuses limits that cannot both hold', () => {
    const steps: FormStep[] = [
      {
        id: 's',
        title: 'S',
        fields: [
          field('text', 'short-text', { validation: { minLength: 10, maxLength: 5 } }),
          field('count', 'number', { validation: { min: 10, max: 5 } }),
        ],
      },
    ];
    expect(formDefinitionProblems(steps)).toHaveLength(2);
  });
});

describe('publishing a form', () => {
  it('needs at least one question', () => {
    expect(formPublishProblems({ title: 'Mentors', steps: [] })).toEqual([
      'Add at least one question.',
    ]);
    expect(
      formPublishProblems({ title: 'Mentors', steps: [{ id: 's', title: 'S', fields: [] }] }),
    ).toEqual(['Add at least one question.']);
  });

  it('needs the closing date after the opening date', () => {
    expect(
      formPublishProblems({
        title: 'Mentors',
        steps: conditionalForm,
        settings: { opensAt: '2026-10-31T00:00:00.000Z', closesAt: '2026-10-01T00:00:00.000Z' },
      }),
    ).toEqual(['The closing date must be after the opening date.']);
  });

  it('includes the definition problems', () => {
    const steps: FormStep[] = [{ id: 's', title: 'S', fields: [field('pick', 'select')] }];
    expect(formPublishProblems({ title: 'Mentors', steps })).toEqual([
      '"pick" needs at least one option to choose from.',
    ]);
  });
});

describe('the speaker application template', () => {
  const template = FORM_TEMPLATES['speaker-application'];

  it('is ready to publish as it stands', () => {
    expect(formPublishProblems(template)).toEqual([]);
  });

  it('passes the form schema and uses stable ids throughout', () => {
    const parsed = formInputSchema.safeParse({ ...template, slug: 'speak-at-iaa-2026' });
    expect(parsed.success).toBe(true);
    for (const step of template.steps) {
      expect(step.id).toMatch(STABLE_ID_PATTERN);
      for (const question of step.fields) {
        expect(question.id).toMatch(STABLE_ID_PATTERN);
      }
    }
  });

  it('offers the programme areas the public site names', () => {
    const topics = template.steps.flatMap((step) => step.fields).find((q) => q.id === 'topics');
    expect(topics?.options.map((option) => option.value)).toEqual(
      PILLARS.map((pillar) => pillar.key),
    );
  });

  it('asks for past talks only from people who have spoken before', () => {
    const base = { 'spoken-before': 'no' };
    const hidden = visibleSteps(template.steps, base).flatMap((step) => step.fields);
    expect(hidden.some((question) => question.id === 'past-talks')).toBe(false);
    const shown = visibleSteps(template.steps, { 'spoken-before': 'yes' }).flatMap(
      (step) => step.fields,
    );
    expect(shown.some((question) => question.id === 'past-talks')).toBe(true);
  });

  it('accepts a complete application', () => {
    const answers = {
      'full-name': 'Ama Mensah',
      email: 'ama@example.org',
      country: 'Ghana',
      organisation: 'Tamale Tech Hub',
      role: 'Programme Director',
      'session-title': 'Teaching code where the power goes out',
      abstract: 'x'.repeat(120),
      format: 'workshop',
      'audience-level': 'all-levels',
      topics: ['digital-skills'],
      'spoken-before': 'no',
      bio: 'Ama Mensah runs digital skills programmes across the Northern Region of Ghana.',
      headshot: [file('ama.jpg', { bytes: 200_000 })],
      'travel-support': 'no',
      'privacy-consent': true,
    };
    expect(validateAnswers(template.steps, answers, { mode: 'submit' })).toEqual([]);
    expect(applicantFromAnswers(template.steps, answers)).toEqual({
      name: 'Ama Mensah',
      email: 'ama@example.org',
    });
  });

  it('hands out a fresh copy each time', () => {
    const first = formTemplate('speaker-application').steps[0];
    if (first) first.title = 'Changed';
    expect(first?.title).toBe('Changed');
    expect(FORM_TEMPLATES['speaker-application'].steps[0]?.title).toBe('About you');
    expect(formTemplate('speaker-application').steps[0]?.title).toBe('About you');
  });

  it('refuses edits to the shared reference copy instead of changing later forms', () => {
    const reference = FORM_TEMPLATES['speaker-application'];
    expect(() => reference.steps.push({ id: 'extra', title: 'Extra', fields: [] })).toThrow(
      TypeError,
    );
    expect(() => {
      const question = reference.steps[0]?.fields[0];
      if (question) question.required = false;
    }).toThrow(TypeError);
    expect(reference.steps).toHaveLength(5);
  });
});

describe('file questions', () => {
  it('accepts every kind when none is chosen', () => {
    const formats = acceptedFormatsFor(field('any', 'file'));
    expect(formats).toEqual(expect.arrayContaining(['jpg', 'pdf', 'docx', 'xlsx', 'pptx']));
    expect(new Set(formats).size).toBe(formats.length);
  });

  it('narrows to the chosen kinds and reads extensions in any case', () => {
    const photo = field('photo', 'file', { validation: { fileKinds: ['image'] } });
    expect(isAcceptedFilename(photo, 'Portrait.JPG')).toBe(true);
    expect(isAcceptedFilename(photo, 'cv.pdf')).toBe(false);
    expect(isAcceptedFilename(photo, 'no-extension')).toBe(false);
  });

  it('defaults to 5 MB and never exceeds 10 MB', () => {
    expect(maxFileBytesFor(field('a', 'file'))).toBe(5 * 1024 * 1024);
    expect(maxFileBytesFor(field('a', 'file', { validation: { maxSizeMB: 8 } }))).toBe(
      8 * 1024 * 1024,
    );
  });
});

describe('form schemas', () => {
  it('starts a new form with drafts allowed and no steps', () => {
    expect(formInputSchema.parse({ title: 'Mentors', slug: 'mentors' })).toEqual({
      title: 'Mentors',
      slug: 'mentors',
      type: 'general',
      settings: { allowDrafts: true },
      steps: [],
    });
  });

  it('refuses a form whose ids repeat', () => {
    const steps = [{ id: 'a', title: 'A', fields: [{ id: 'a', type: 'short-text', label: 'A' }] }];
    expect(formInputSchema.safeParse({ title: 'Mentors', slug: 'mentors', steps }).success).toBe(
      false,
    );
  });

  it('accepts a template to start from', () => {
    expect(
      formCreateSchema.parse({
        title: 'Speakers',
        slug: 'speakers',
        template: 'speaker-application',
      }).template,
    ).toBe('speaker-application');
    expect(
      formCreateSchema.safeParse({ title: 'Speakers', slug: 'speakers', template: 'x' }).success,
    ).toBe(false);
  });

  it('replaces settings whole on update, without defaults', () => {
    expect(formUpdateSchema.parse({})).toEqual({});
    expect(formUpdateSchema.safeParse({ settings: { opensAt: null } }).success).toBe(false);
    expect(formUpdateSchema.parse({ settings: { allowDrafts: false } })).toEqual({
      settings: { allowDrafts: false },
    });
    expect(formUpdateSchema.parse({ intro: null, description: '' })).toEqual({
      intro: null,
      description: null,
    });
  });

  it('keeps addresses the public site already uses under /apply/', () => {
    expect(isReservedFormSlug('preview')).toBe(true);
    expect(isReservedFormSlug(' Preview ')).toBe(true);
    expect(isReservedFormSlug('preview-2027')).toBe(false);
  });

  it('reads the archive filters from the query string', () => {
    expect(formListQuerySchema.parse({})).toMatchObject({ page: 1 });
    expect(formListQuerySchema.parse({}).archived).toBeUndefined();
    expect(formListQuerySchema.parse({ archived: 'true', includeArchived: 'false' })).toMatchObject(
      { archived: true, includeArchived: false },
    );
    expect(formListQuerySchema.safeParse({ archived: 'yes' }).success).toBe(false);
  });

  it('accepts each answer once, and files only over https', () => {
    expect(
      formAnswersSchema.safeParse([
        { fieldId: 'a', value: 'x' },
        { fieldId: 'a', value: 'y' },
      ]).success,
    ).toBe(false);
    expect(formAnswersSchema.safeParse([{ fieldId: 'cv', value: [file('cv.pdf')] }]).success).toBe(
      true,
    );
    expect(
      formAnswersSchema.safeParse([
        { fieldId: 'cv', value: [file('cv.pdf', { url: 'http://example.com/cv.pdf' })] },
      ]).success,
    ).toBe(false);
    expect(formAnswersSchema.safeParse([{ fieldId: 'a', value: { nested: true } }]).success).toBe(
      false,
    );
  });
});

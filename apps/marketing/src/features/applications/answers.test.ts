import type { FormField, FormStep } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import {
  fileRulesText,
  firstStepErrors,
  formatBytes,
  formatCalendarDate,
  locateProblems,
  sameAnswer,
  savableAnswers,
  summariseAnswer,
} from './answers';

const field = (overrides: Partial<FormField> & Pick<FormField, 'id' | 'type'>): FormField => ({
  label: overrides.id,
  required: false,
  options: [],
  ...overrides,
});

const steps: FormStep[] = [
  {
    id: 'one',
    title: 'One',
    fields: [
      field({ id: 'name', type: 'short-text', validation: { maxLength: 5 } }),
      field({
        id: 'choice',
        type: 'radio',
        options: [
          { value: 'yes', label: 'Yes please' },
          { value: 'no', label: 'No thanks' },
        ],
      }),
    ],
  },
  {
    id: 'two',
    title: 'Two',
    fields: [
      field({
        id: 'detail',
        type: 'long-text',
        visibility: {
          match: 'all',
          rules: [{ fieldId: 'choice', operator: 'equals', value: 'yes' }],
        },
      }),
      field({
        id: 'topics',
        type: 'multi-select',
        options: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ],
      }),
    ],
  },
];

describe('savableAnswers', () => {
  it('keeps visible answers that pass draft checks, in form order', () => {
    expect(
      savableAnswers(steps, { topics: ['a'], name: 'Ama', choice: 'no', detail: 'hidden now' }),
    ).toEqual([
      { fieldId: 'name', value: 'Ama' },
      { fieldId: 'choice', value: 'no' },
      { fieldId: 'topics', value: ['a'] },
    ]);
  });

  it('leaves out an answer the server would refuse, so the rest still save', () => {
    expect(savableAnswers(steps, { name: 'Far too long', choice: 'yes' })).toEqual([
      { fieldId: 'choice', value: 'yes' },
    ]);
  });
});

describe('problems', () => {
  it('collects the first failing step’s errors and the question to focus', () => {
    expect(
      firstStepErrors([
        { fieldId: 'name', stepId: 'one', message: 'Needed' },
        { fieldId: 'choice', stepId: 'one', message: 'Choose' },
        { fieldId: 'topics', stepId: 'two', message: 'Pick' },
      ]),
    ).toEqual({
      stepId: 'one',
      errors: { name: 'Needed', choice: 'Choose' },
      focusFieldId: 'name',
    });
    expect(firstStepErrors([])).toBeNull();
  });

  it('places server problems on visible steps and drops the rest', () => {
    expect(
      locateProblems(
        [
          { fieldId: 'topics', message: 'Pick one' },
          { fieldId: 'ghost', message: 'Gone' },
        ],
        steps,
      ),
    ).toEqual([{ fieldId: 'topics', stepId: 'two', message: 'Pick one' }]);
  });
});

describe('showing answers back', () => {
  const byId = (id: string): FormField => {
    const found = steps.flatMap((step) => step.fields).find((item) => item.id === id);
    if (!found) {
      throw new Error(id);
    }
    return found;
  };

  it('uses option labels, lists and plain words', () => {
    expect(summariseAnswer(byId('choice'), { choice: 'yes' })).toEqual({
      kind: 'text',
      text: 'Yes please',
    });
    expect(summariseAnswer(byId('topics'), { topics: ['b', 'a'] })).toEqual({
      kind: 'list',
      items: ['Beta', 'Alpha'],
    });
    expect(summariseAnswer(byId('name'), { name: '  ' })).toEqual({ kind: 'empty' });
    expect(summariseAnswer(field({ id: 'ok', type: 'consent' }), { ok: true })).toEqual({
      kind: 'text',
      text: 'Agreed',
    });
    // An empty tick-box is a "no", not a skipped question.
    const tick = field({ id: 'tick', type: 'checkbox' });
    expect(summariseAnswer(tick, { tick: false })).toEqual({ kind: 'text', text: 'No' });
    expect(summariseAnswer(tick, {})).toEqual({ kind: 'text', text: 'No' });
    expect(summariseAnswer(tick, { tick: true })).toEqual({ kind: 'text', text: 'Yes' });
    expect(summariseAnswer(field({ id: 'when', type: 'date' }), { when: '2026-10-05' })).toEqual({
      kind: 'text',
      text: '5 October 2026',
    });
    expect(
      summariseAnswer(field({ id: 'cv', type: 'file' }), {
        cv: [{ publicId: 'a/b', url: 'https://x.test/b', name: 'cv.pdf' }],
      }),
    ).toEqual({ kind: 'list', items: ['cv.pdf'] });
  });

  it('formats sizes, dates and file rules for people', () => {
    expect(formatBytes(900)).toBe('1 KB');
    expect(formatBytes(820 * 1024)).toBe('820 KB');
    expect(formatBytes(2.45 * 1024 * 1024)).toBe('2.5 MB');
    expect(formatCalendarDate('not a date')).toBe('not a date');
    expect(
      fileRulesText(
        field({ id: 'f', type: 'file', validation: { fileKinds: ['pdf', 'image'], maxFiles: 3 } }),
      ),
    ).toBe('Up to 3 files, 5 MB each. Accepted types: PDF, JPG, JPEG, PNG, WEBP, GIF.');
  });

  it('treats equal values as the same answer', () => {
    expect(sameAnswer(['a'], ['a'])).toBe(true);
    expect(sameAnswer('a', 'b')).toBe(false);
    expect(sameAnswer(undefined, null)).toBe(true);
  });
});

import { z } from 'zod';

import {
  clearableDate,
  paginationQuerySchema,
  slugSchema,
  type MediaAsset,
  type Timestamped,
} from './common.js';
import { partialForUpdate } from './update.js';
import {
  booleanQueryParam,
  clearableTextField,
  FILE_RESOURCE_TYPES,
  httpsMediaAssetSchema,
  httpsUrlSchema,
  isCalendarDateKey,
  optionalTextField,
  stableIdSchema,
  type PersonSummary,
} from './work.js';

/**
 * Forms are built in the dashboard and filled in on the public site. One
 * reusable builder rather than a speaker form, a mentor form and a volunteer
 * form, each with its own model: the type says what a form is for, and the
 * steps say what it asks.
 *
 * Every rule about what counts as a valid answer lives here, once, and runs in
 * the applicant's browser and again on the server against the stored version.
 */

export const FORM_TYPES = [
  'speaker-application',
  'volunteer',
  'mentor',
  'partnership',
  'event',
  'survey',
  'general',
] as const;
export type FormType = (typeof FORM_TYPES)[number];

/** Only a published form has a public page; closed keeps the page up but refuses new answers. */
export const FORM_STATUSES = ['draft', 'published', 'closed'] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const FORM_FIELD_TYPES = [
  'short-text',
  'long-text',
  'email',
  'phone',
  'number',
  'date',
  'select',
  'multi-select',
  'radio',
  'checkbox',
  'url',
  'file',
  'consent',
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/** Question types answered by picking from a list, which therefore need options. */
export const CHOICE_FIELD_TYPES = [
  'select',
  'multi-select',
  'radio',
] as const satisfies readonly FormFieldType[];
export type ChoiceFieldType = (typeof CHOICE_FIELD_TYPES)[number];

export const isChoiceFieldType = (type: FormFieldType): type is ChoiceFieldType =>
  (CHOICE_FIELD_TYPES as readonly FormFieldType[]).includes(type);

/**
 * Kinds of file a question can accept. An editor thinks "a CV" or "a photo",
 * not a list of extensions, so questions choose kinds and the formats follow.
 */
export const FILE_KINDS = ['image', 'pdf', 'document', 'spreadsheet', 'presentation'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const FILE_KIND_FORMATS: Record<FileKind, readonly string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  pdf: ['pdf'],
  document: ['doc', 'docx', 'odt', 'rtf', 'txt'],
  spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
  presentation: ['ppt', 'pptx', 'odp'],
};

/** Size limit for a file question that does not set its own. */
export const DEFAULT_MAX_FILE_MB = 5;
/** Largest file any question may accept; applicant uploads are signed with this ceiling. */
export const MAX_FILE_MB = 10;
/** Most files one question may accept. */
export const MAX_FILES_PER_QUESTION = 10;

/**
 * Most questions in one form. It matches the cap on answers in a submission,
 * so a form can never ask more than an applicant is allowed to send back.
 */
export const MAX_FORM_FIELDS = 300;

export const VISIBILITY_OPERATORS = [
  'equals',
  'not-equals',
  'includes',
  'not-includes',
  'is-empty',
  'is-not-empty',
] as const;
export type VisibilityOperator = (typeof VISIBILITY_OPERATORS)[number];

/** Whether every rule must hold, or any one of them. */
export const VISIBILITY_MATCHES = ['all', 'any'] as const;
export type VisibilityMatch = (typeof VISIBILITY_MATCHES)[number];

/**
 * Which question feeds the applicant's name, email and phone on the
 * application list. Labels vary from form to form; the mapping does not.
 */
export const APPLICANT_MAPPINGS = ['applicant-name', 'applicant-email', 'applicant-phone'] as const;
export type ApplicantMapping = (typeof APPLICANT_MAPPINGS)[number];

/**
 * Addresses a form may not take, because the public site already uses them
 * under `/apply/`: a form called "preview" would sit behind the staff preview
 * page and `GET /api/forms/preview`, and no applicant could ever open it.
 */
export const RESERVED_FORM_SLUGS = ['preview'] as const;

/** True when `slug` is one of `RESERVED_FORM_SLUGS`. */
export const isReservedFormSlug = (slug: string): boolean =>
  (RESERVED_FORM_SLUGS as readonly string[]).includes(slug.trim().toLowerCase());

/** Ready-made forms an editor can start from. */
export const FORM_TEMPLATE_KEYS = ['speaker-application'] as const;
export type FormTemplateKey = (typeof FORM_TEMPLATE_KEYS)[number];

/** Whether a published form is taking answers right now, from its schedule alone. */
export const FORM_WINDOW_STATES = ['open', 'not-yet-open', 'closed'] as const;
export type FormWindowState = (typeof FORM_WINDOW_STATES)[number];

/**
 * An option's stored value. Answers keep the value, never the label, so an
 * option can be reworded without rewriting every submission that chose it.
 */
export const FORM_OPTION_VALUE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,59}$/;

export const visibilityRuleSchema = z.object({
  /** An earlier question; see `formDefinitionProblems`. */
  fieldId: stableIdSchema,
  operator: z.enum(VISIBILITY_OPERATORS),
  /** Compared with the answer. Not used by `is-empty` or `is-not-empty`. */
  value: z.string().max(200).optional(),
});

/** When a step or question is shown. No condition means always. */
export const visibilitySchema = z.object({
  match: z.enum(VISIBILITY_MATCHES),
  rules: z.array(visibilityRuleSchema).min(1).max(10),
});

export const formOptionSchema = z.object({
  value: z
    .string()
    .regex(
      FORM_OPTION_VALUE_PATTERN,
      'Use lowercase letters, numbers, hyphens or underscores for option values',
    ),
  label: z.string().trim().min(1).max(200),
});

/**
 * Limits on an answer. Which ones apply depends on the question type: lengths
 * for text, `min`/`max` for numbers (and for how many choices a multi-select
 * takes), the rest for files. No defaults, so an unset limit stays unset.
 */
export const fieldValidationSchema = z.object({
  minLength: z.number().int().min(0).max(10000).optional(),
  maxLength: z.number().int().min(1).max(10000).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  maxFiles: z.number().int().min(1).max(MAX_FILES_PER_QUESTION).optional(),
  /** Empty or absent accepts every kind. */
  fileKinds: z.array(z.enum(FILE_KINDS)).max(FILE_KINDS.length).optional(),
  maxSizeMB: z.number().min(1).max(MAX_FILE_MB).optional(),
});

/** One question. Its id is what answers are stored against, so it never changes. */
export const formFieldSchema = z.object({
  id: stableIdSchema,
  type: z.enum(FORM_FIELD_TYPES),
  label: z.string().trim().min(1).max(300),
  helpText: optionalTextField(500),
  placeholder: optionalTextField(120),
  required: z.boolean().default(false),
  options: z.array(formOptionSchema).max(50).default([]),
  validation: fieldValidationSchema.optional(),
  visibility: visibilitySchema.nullable().optional(),
  /** The words a consent question asks the applicant to agree to. */
  consentText: optionalTextField(1000),
  mapsTo: z.enum(APPLICANT_MAPPINGS).nullable().optional(),
});

/** One screen of the public form. */
export const formStepSchema = z.object({
  id: stableIdSchema,
  title: z.string().trim().min(1).max(160),
  description: optionalTextField(1000),
  image: httpsMediaAssetSchema.nullable().optional(),
  visibility: visibilitySchema.nullable().optional(),
  fields: z.array(formFieldSchema).max(30).default([]),
});

/** The cover slide an applicant sees before Begin. */
export const formIntroSchema = z.object({
  heading: z.string().trim().min(1).max(160),
  description: optionalTextField(2000),
  image: httpsMediaAssetSchema.nullable().optional(),
});

/**
 * Schedule and behaviour. No defaults inside: the whole object is replaced on
 * every save, and a default here would quietly reset a setting that a partial
 * object left out.
 */
export const formSettingsSchema = z.object({
  opensAt: clearableDate.optional(),
  closesAt: clearableDate.optional(),
  /** Autosave and "email me a link to finish later". */
  allowDrafts: z.boolean(),
  successMessage: optionalTextField(1000),
  /** Stops taking answers after this many submissions. */
  submissionLimit: z.number().int().min(1).nullable().optional(),
  /** Who hears about each submission; falls back to the site's notification address. */
  notifyEmails: z.array(z.string().trim().toLowerCase().email().max(200)).max(5).optional(),
  /** Email the applicant a copy of their reference number. */
  acknowledgeApplicant: z.boolean().optional(),
});

const idsInOrder = (steps: readonly { id: string; fields: readonly { id: string }[] }[]) =>
  steps.flatMap((step) => [step.id, ...step.fields.map((field) => field.id)]);

/**
 * Creating or replacing a form. Step and question ids must be unique across
 * the whole form, since answers are stored against them; everything else a
 * form needs before it can go live is checked by `formPublishProblems`, so a
 * half-built form can still be saved.
 */
export const formInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: slugSchema,
  type: z.enum(FORM_TYPES).default('general'),
  /** Internal note for the team; never shown to applicants. */
  description: optionalTextField(500),
  intro: formIntroSchema.optional(),
  settings: formSettingsSchema.default(() => ({ allowDrafts: true })),
  steps: z
    .array(formStepSchema)
    .max(20)
    .refine(
      (steps) => {
        const ids = idsInOrder(steps);
        return new Set(ids).size === ids.length;
      },
      { message: 'Every step and question needs its own id' },
    )
    .default([]),
});
export type FormInput = z.infer<typeof formInputSchema>;

/** Creating a form, optionally seeded from a template in `FORM_TEMPLATES`. */
export const formCreateSchema = formInputSchema.extend({
  template: z.enum(FORM_TEMPLATE_KEYS).optional(),
});
export type FormCreateInput = z.infer<typeof formCreateSchema>;

/**
 * Editing a form. `settings`, `intro` and `steps` are replaced whole when
 * sent; null clears the introduction or the internal note.
 */
export const formUpdateSchema = partialForUpdate(formInputSchema).extend({
  description: clearableTextField(500),
  intro: formIntroSchema.nullable().optional(),
});
export type FormUpdate = z.infer<typeof formUpdateSchema>;

/** Publishing, closing or returning a form to draft. */
export const formStatusChangeSchema = z.object({
  status: z.enum(FORM_STATUSES),
});
export type FormStatusChange = z.infer<typeof formStatusChangeSchema>;

/** Archiving hides a form from the list; it is never deleted once answered. */
export const formArchiveSchema = z.object({
  archived: z.boolean(),
});
export type FormArchiveInput = z.infer<typeof formArchiveSchema>;

/**
 * `GET /api/admin/forms`. Archived forms are left out unless
 * `includeArchived` is set; `archived` lists only the archived ones, which is
 * what the Archived tab shows.
 */
export const formListQuerySchema = paginationQuerySchema.extend({
  q: optionalTextField(80),
  status: z.enum(FORM_STATUSES).optional(),
  type: z.enum(FORM_TYPES).optional(),
  includeArchived: booleanQueryParam,
  archived: booleanQueryParam,
});
export type FormListQuery = z.infer<typeof formListQuerySchema>;

/**
 * The shape of an applicant file's Cloudinary id: slash-separated segments,
 * none of them `.` or `..`. The API chooses these ids and checks that each one
 * sits inside the draft's own folder; with no dot segments, a prefix check on
 * the id cannot be walked out of that folder.
 */
export const FILE_PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-][\w.-]*(?:\/[A-Za-z0-9_-][\w.-]*)*$/;

/**
 * An uploaded file in an answer. Applicant files are stored as authenticated
 * Cloudinary assets, so `url` is not a public link; the dashboard asks the API
 * for a signed one.
 */
export const fileAnswerSchema = z.object({
  publicId: z.string().min(1).max(300).regex(FILE_PUBLIC_ID_PATTERN, 'Upload the file again'),
  url: httpsUrlSchema,
  name: z.string().trim().min(1).max(200),
  format: z.string().trim().max(20).optional(),
  bytes: z.number().int().min(0).optional(),
  resourceType: z.enum(FILE_RESOURCE_TYPES).optional(),
});
export type FileAnswer = z.infer<typeof fileAnswerSchema>;

/**
 * Every shape an answer can take: text, a list of choices, a tick, a number,
 * files, or null for "no answer". Which shape a question expects is checked by
 * `validateAnswer`.
 */
export const answerValueSchema = z.union([
  z.string().max(10000),
  z.array(z.string().max(200)).max(50),
  z.boolean(),
  z.number(),
  z.array(fileAnswerSchema).max(MAX_FILES_PER_QUESTION),
  z.null(),
]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

/**
 * One answer. Answers travel as a list of pairs rather than an object keyed by
 * question id, because the API's body sanitiser drops object keys it considers
 * unsafe and an answer must never vanish on the way in.
 */
export const formAnswerSchema = z.object({
  fieldId: stableIdSchema,
  value: answerValueSchema,
});
export type FormAnswer = z.infer<typeof formAnswerSchema>;

export const formAnswersSchema = z
  .array(formAnswerSchema)
  .max(MAX_FORM_FIELDS)
  .refine((answers) => new Set(answers.map((answer) => answer.fieldId)).size === answers.length, {
    message: 'Each question can only be answered once',
  });

/** Answers by question id, for looking one up. */
export type AnswerMap = Record<string, AnswerValue>;

/** Answers in either shape: the stored list or a map by question id. */
export type AnswerSource = readonly FormAnswer[] | Readonly<AnswerMap>;

/** How strictly to check answers. See `validateAnswer`. */
export type AnswerValidationMode = 'draft' | 'submit';

export interface FormOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  maxFiles?: number;
  fileKinds?: FileKind[];
  maxSizeMB?: number;
}

export interface VisibilityRule {
  fieldId: string;
  operator: VisibilityOperator;
  value?: string;
}

export interface VisibilityCondition {
  match: VisibilityMatch;
  rules: VisibilityRule[];
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  required: boolean;
  options: FormOption[];
  validation?: FieldValidation;
  visibility?: VisibilityCondition | null;
  consentText?: string;
  mapsTo?: ApplicantMapping | null;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  image?: MediaAsset | null;
  visibility?: VisibilityCondition | null;
  fields: FormField[];
}

export interface FormIntro {
  heading: string;
  description?: string;
  image?: MediaAsset | null;
}

export interface FormSettings {
  opensAt?: string | null;
  closesAt?: string | null;
  allowDrafts: boolean;
  successMessage?: string;
  submissionLimit?: number | null;
  notifyEmails?: string[];
  acknowledgeApplicant?: boolean;
}

/** A form as the dashboard sees it. */
export interface FormDefinition extends Timestamped {
  title: string;
  slug: string;
  type: FormType;
  description?: string;
  status: FormStatus;
  intro?: FormIntro;
  settings: FormSettings;
  steps: FormStep[];
  /** Raised each time a published form's questions change; see `FormVersionSnapshot`. */
  version: number;
  publishedAt?: string | null;
  closedAt?: string | null;
  archivedAt?: string | null;
  /** Submitted applications only; drafts in progress are not counted. */
  submissionCount: number;
  createdBy?: PersonSummary | null;
  updatedBy?: PersonSummary | null;
}

/** A form as a list row. */
export interface FormListItem extends Timestamped {
  title: string;
  slug: string;
  type: FormType;
  status: FormStatus;
  version: number;
  stepCount: number;
  fieldCount: number;
  submissionCount: number;
  opensAt?: string | null;
  closesAt?: string | null;
  publishedAt?: string | null;
  closedAt?: string | null;
  archivedAt?: string | null;
}

/** The settings an applicant's page needs, and nothing about who is notified. */
export interface PublicFormSettings {
  allowDrafts: boolean;
  successMessage?: string;
  opensAt?: string | null;
  closesAt?: string | null;
}

/**
 * A form as the public page sees it. `intro` falls back to the title when the
 * form has none, so the cover slide always has a heading.
 */
export interface PublicForm {
  slug: string;
  title: string;
  type: FormType;
  intro: FormIntro;
  steps: FormStep[];
  settings: PublicFormSettings;
  version: number;
  window: FormWindowState;
}

/**
 * The questions exactly as they were at one version. A submission records the
 * version it was checked against, so its answers are always shown with the
 * labels and order the applicant actually saw.
 */
export interface FormVersionSnapshot {
  formId: string;
  version: number;
  title: string;
  intro?: FormIntro;
  steps: FormStep[];
  createdAt: string;
}

/** A problem with one answer, with the step to send the applicant back to. */
export interface AnswerProblem {
  fieldId: string;
  stepId: string;
  message: string;
}

const hasOwn = (map: Readonly<AnswerMap>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(map, key);

/**
 * The answer to one question, or undefined. Looks only at the map's own keys,
 * so a question whose id happens to be `constructor` is not answered by
 * `Object.prototype`.
 */
export const answerFor = (
  answers: Readonly<AnswerMap>,
  fieldId: string,
): AnswerValue | undefined => (hasOwn(answers, fieldId) ? answers[fieldId] : undefined);

/** Answers as a map by question id. A later answer to the same question wins. */
export const answersToMap = (answers: AnswerSource): AnswerMap => {
  if (!Array.isArray(answers)) {
    return { ...(answers as Readonly<AnswerMap>) };
  }
  return Object.fromEntries(
    (answers as readonly FormAnswer[]).map((answer) => [answer.fieldId, answer.value]),
  );
};

/**
 * True when there is nothing to use: no value, blank text, an empty list, or
 * an unticked box. An unticked box counts as empty because it says nothing the
 * applicant chose to say; a required tick-box therefore has to be ticked.
 */
export const isEmptyAnswer = (value: AnswerValue | undefined): boolean => {
  if (value === undefined || value === null || value === false) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return Array.isArray(value) && value.length === 0;
};

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && (value as unknown[]).every((item) => typeof item === 'string');

// The full schema rather than a glance at the keys: these answers may come
// from a draft read back from storage, and a file with a `javascript:` address
// or a dot-segment id must not pass just because it has the right keys.
const isFileAnswerList = (value: unknown): value is FileAnswer[] =>
  Array.isArray(value) &&
  (value as unknown[]).every((item) => fileAnswerSchema.safeParse(item).success);

const normalise = (value: string): string => value.trim().toLowerCase();

const scalarMatches = (answer: AnswerValue | undefined, expected: string): boolean => {
  if (typeof answer === 'string') {
    return normalise(answer) === normalise(expected);
  }
  if (typeof answer === 'boolean') {
    return String(answer) === normalise(expected);
  }
  if (typeof answer === 'number') {
    return expected.trim() !== '' && Number(expected) === answer;
  }
  return false;
};

// On a multi-select, "equals" means the only thing chosen; "includes" means
// among the things chosen.
const answerEquals = (answer: AnswerValue | undefined, expected: string): boolean => {
  if (Array.isArray(answer)) {
    return isStringList(answer) && answer.length === 1 && scalarMatches(answer[0], expected);
  }
  return scalarMatches(answer, expected);
};

const answerIncludes = (answer: AnswerValue | undefined, expected: string): boolean => {
  if (isStringList(answer)) {
    return answer.some((item) => scalarMatches(item, expected));
  }
  if (typeof answer === 'string') {
    return expected.trim() !== '' && normalise(answer).includes(normalise(expected));
  }
  return scalarMatches(answer, expected);
};

const RULE_TESTS: Record<
  VisibilityOperator,
  (answer: AnswerValue | undefined, expected: string) => boolean
> = {
  equals: answerEquals,
  'not-equals': (answer, expected) => !answerEquals(answer, expected),
  includes: answerIncludes,
  'not-includes': (answer, expected) => !answerIncludes(answer, expected),
  'is-empty': (answer) => isEmptyAnswer(answer),
  'is-not-empty': (answer) => !isEmptyAnswer(answer),
};

/**
 * Whether one rule holds. Text is compared without regard to case or
 * surrounding spaces; a tick-box compares as `true` or `false`; a number
 * compares numerically.
 */
export const isRuleMet = (rule: VisibilityRule, answers: Readonly<AnswerMap>): boolean =>
  RULE_TESTS[rule.operator](answerFor(answers, rule.fieldId), rule.value ?? '');

/** Whether a condition holds. No condition, or one without rules, always holds. */
export const isVisible = (
  visibility: VisibilityCondition | null | undefined,
  answers: Readonly<AnswerMap>,
): boolean => {
  if (!visibility || visibility.rules.length === 0) {
    return true;
  }
  return visibility.match === 'any'
    ? visibility.rules.some((rule) => isRuleMet(rule, answers))
    : visibility.rules.every((rule) => isRuleMet(rule, answers));
};

export const isFieldVisible = (
  field: Pick<FormField, 'visibility'>,
  answers: Readonly<AnswerMap>,
): boolean => isVisible(field.visibility, answers);

export const isStepVisible = (
  step: Pick<FormStep, 'visibility'>,
  answers: Readonly<AnswerMap>,
): boolean => isVisible(step.visibility, answers);

interface ResolvedForm {
  steps: FormStep[];
  answers: AnswerMap;
}

/**
 * Walk the form in order, deciding what is shown from the answers to what is
 * shown before it. An answer to a hidden question does not count: otherwise
 * hiding a question would not hide the questions that depend on it.
 *
 * A step whose questions are all hidden is hidden too, so the applicant never
 * lands on a screen with nothing to answer. A step built with no questions at
 * all is kept: that is a page of information, and meant to be read.
 */
const resolveVisibility = (steps: readonly FormStep[], source: AnswerSource): ResolvedForm => {
  const all = answersToMap(source);
  const answers: AnswerMap = {};
  const visible: FormStep[] = [];
  for (const step of steps) {
    if (!isStepVisible(step, answers)) {
      continue;
    }
    const fields: FormField[] = [];
    for (const field of step.fields) {
      if (!isFieldVisible(field, answers)) {
        continue;
      }
      fields.push(field);
      const value = answerFor(all, field.id);
      if (value !== undefined) {
        answers[field.id] = value;
      }
    }
    if (step.fields.length === 0 || fields.length > 0) {
      visible.push({ ...step, fields });
    }
  }
  return { steps: visible, answers };
};

/** The steps an applicant sees, each holding only the questions they see. */
export const visibleSteps = (steps: readonly FormStep[], answers: AnswerSource): FormStep[] =>
  resolveVisibility(steps, answers).steps;

/**
 * Only the answers to questions the applicant can currently see, in form
 * order. The server stores this, never the raw list: an answer to a hidden
 * question is something the applicant chose to take back, and an answer to a
 * question the form does not have is not an answer at all.
 */
export const pruneHiddenAnswers = (
  steps: readonly FormStep[],
  answers: AnswerSource,
): FormAnswer[] => {
  const resolved = resolveVisibility(steps, answers);
  return resolved.steps.flatMap((step) =>
    step.fields
      .filter((field) => hasOwn(resolved.answers, field.id))
      .map((field) => ({ fieldId: field.id, value: resolved.answers[field.id] as AnswerValue })),
  );
};

const extensionOf = (filename: string): string => {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
};

/** File extensions a question accepts, lowercase and without the dot. */
export const acceptedFormatsFor = (field: Pick<FormField, 'validation'>): string[] => {
  const chosen = field.validation?.fileKinds;
  const kinds = chosen && chosen.length > 0 ? chosen : FILE_KINDS;
  return [...new Set(kinds.flatMap((kind) => FILE_KIND_FORMATS[kind]))];
};

/** Whether a file's name has an extension the question accepts. */
export const isAcceptedFilename = (
  field: Pick<FormField, 'validation'>,
  filename: string,
): boolean => acceptedFormatsFor(field).includes(extensionOf(filename.trim()));

/** Largest file a question accepts, in bytes. */
export const maxFileBytesFor = (field: Pick<FormField, 'validation'>): number =>
  Math.min(field.validation?.maxSizeMB ?? DEFAULT_MAX_FILE_MB, MAX_FILE_MB) * 1024 * 1024;

/** How many files a question accepts. One unless the question says otherwise. */
export const maxFilesFor = (field: Pick<FormField, 'validation'>): number =>
  field.validation?.maxFiles ?? 1;

// Longest answer each text-like type takes when the question sets no limit.
const DEFAULT_TEXT_MAX: Partial<Record<FormFieldType, number>> = {
  'short-text': 500,
  'long-text': 10000,
  email: 254,
  phone: 40,
  url: 2000,
  date: 40,
};

const emailFormat = z.string().email();
// Loose on purpose: people write numbers with spaces, dots and brackets, and a
// strict E.164 check would turn away real applicants over formatting.
const PHONE_SEPARATORS = /[\s().-]/g;
const PHONE_DIGITS = /^\+?\d{7,15}$/;
// A host of dot-separated labels, at least two. No label may contain a dot, so
// the pattern cannot match the same text two ways: a version where it could
// took about 90 ms on one hostile 10,000-character answer, on the API's only
// thread.
const WEB_LINK = /^https?:\/\/[^\s/?#.]+(?:\.[^\s/?#.]+)+(?:[/?#]\S*)?$/i;
const isoDateTime = z.string().datetime();

type FieldValidator = (
  field: FormField,
  value: AnswerValue,
  mode: AnswerValidationMode,
) => string | null;

const textLengthProblem = (field: FormField, text: string, mode: AnswerValidationMode) => {
  const max = field.validation?.maxLength ?? DEFAULT_TEXT_MAX[field.type] ?? 10000;
  const length = text.trim().length;
  if (length > max) {
    return `Keep this to ${max} characters or fewer.`;
  }
  const min = field.validation?.minLength;
  if (mode === 'submit' && min !== undefined && length < min) {
    return `Write at least ${min} characters (${length} so far).`;
  }
  return null;
};

/**
 * Text checked for shape: a draft only has to be text of a sensible length;
 * a submission also has to pass `check`.
 */
const textValidator =
  (check?: (text: string) => string | null): FieldValidator =>
  (field, value, mode) => {
    if (typeof value !== 'string') {
      return 'Answer this with text.';
    }
    const lengthProblem = textLengthProblem(field, value, mode);
    if (lengthProblem || mode === 'draft' || !check) {
      return lengthProblem;
    }
    return check(value.trim());
  };

const emailProblem = (text: string) =>
  emailFormat.safeParse(text).success ? null : 'Enter an email address, like name@example.com.';

const phoneProblem = (text: string) =>
  PHONE_DIGITS.test(text.replace(PHONE_SEPARATORS, ''))
    ? null
    : 'Enter a phone number with its country code, like +233 20 123 4567.';

const urlProblem = (text: string) =>
  WEB_LINK.test(text) ? null : 'Enter a full link, starting with https://';

const dateProblem = (text: string) =>
  isCalendarDateKey(text) || isoDateTime.safeParse(text).success ? null : 'Enter a date.';

const numberValidator: FieldValidator = (field, value, mode) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Enter a number.';
  }
  if (mode === 'draft') {
    return null;
  }
  const { min, max } = field.validation ?? {};
  if (min !== undefined && value < min) {
    return `Enter ${min} or more.`;
  }
  if (max !== undefined && value > max) {
    return `Enter ${max} or less.`;
  }
  return null;
};

const optionValues = (field: FormField): Set<string> =>
  new Set(field.options.map((option) => option.value));

// A draft may still hold a choice the form has since dropped; the applicant
// fixes it before submitting rather than having every autosave refused.
const singleChoiceValidator: FieldValidator = (field, value, mode) => {
  if (typeof value !== 'string' || value.length > 200) {
    return 'Choose one of the options.';
  }
  return mode === 'submit' && !optionValues(field).has(value) ? 'Choose one of the options.' : null;
};

const choiceCountProblem = (field: FormField, count: number): string | null => {
  const { min, max } = field.validation ?? {};
  if (min !== undefined && count < min) {
    return `Choose at least ${min}.`;
  }
  if (max !== undefined && count > max) {
    return `Choose no more than ${max}.`;
  }
  return null;
};

const multiChoiceValidator: FieldValidator = (field, value, mode) => {
  if (!isStringList(value) || value.length > 50) {
    return 'Choose from the options.';
  }
  if (mode === 'draft') {
    return null;
  }
  const allowed = optionValues(field);
  if (new Set(value).size !== value.length || value.some((item) => !allowed.has(item))) {
    return 'Choose from the options.';
  }
  return choiceCountProblem(field, value.length);
};

const checkboxValidator: FieldValidator = (_field, value) =>
  typeof value === 'boolean' ? null : 'Tick the box or leave it empty.';

const consentValidator: FieldValidator = (_field, value, mode) => {
  if (typeof value !== 'boolean') {
    return 'Tick the box to agree.';
  }
  return mode === 'submit' && !value ? 'Please agree to continue.' : null;
};

const fileProblem = (field: FormField, file: FileAnswer): string | null => {
  const formats = acceptedFormatsFor(field);
  const format = (file.format || extensionOf(file.name)).toLowerCase();
  if (!formats.includes(format)) {
    return `"${file.name}" is not a type this question accepts. Use ${formats.join(', ')}.`;
  }
  const maxBytes = maxFileBytesFor(field);
  if (file.bytes !== undefined && file.bytes > maxBytes) {
    return `"${file.name}" is larger than ${maxBytes / (1024 * 1024)} MB.`;
  }
  return null;
};

// Files are checked in drafts too: an upload is finished or absent, never
// half-typed, so a wrong type or size is never a work in progress.
const fileValidator: FieldValidator = (field, value) => {
  if (!isFileAnswerList(value)) {
    return 'Upload the file again.';
  }
  const maxFiles = maxFilesFor(field);
  if (value.length > maxFiles) {
    return maxFiles === 1 ? 'Add one file only.' : `Add no more than ${maxFiles} files.`;
  }
  for (const file of value) {
    const problem = fileProblem(field, file);
    if (problem) {
      return problem;
    }
  }
  return null;
};

const FIELD_VALIDATORS: Record<FormFieldType, FieldValidator> = {
  'short-text': textValidator(),
  'long-text': textValidator(),
  email: textValidator(emailProblem),
  phone: textValidator(phoneProblem),
  number: numberValidator,
  date: textValidator(dateProblem),
  select: singleChoiceValidator,
  'multi-select': multiChoiceValidator,
  radio: singleChoiceValidator,
  checkbox: checkboxValidator,
  url: textValidator(urlProblem),
  file: fileValidator,
  consent: consentValidator,
};

const REQUIRED_MESSAGES: Partial<Record<FormFieldType, string>> = {
  select: 'Choose an option.',
  radio: 'Choose an option.',
  'multi-select': 'Choose at least one option.',
  checkbox: 'Tick this box to continue.',
  consent: 'Please agree to continue.',
  file: 'Add a file.',
};

/**
 * What is wrong with one answer, or null when nothing is.
 *
 * - `draft` is what autosave uses: the answer must have the right shape and
 *   size, but may be unfinished. Required questions, minimum lengths, number
 *   ranges and formats are not checked, because half-typed answers fail all
 *   of them and a refused autosave loses work.
 * - `submit` checks everything, including required questions. A consent
 *   question always has to be agreed to, whether or not it is marked required.
 *
 * Visibility is not considered here; see `validateAnswers`.
 */
export const validateAnswer = (
  field: FormField,
  value: AnswerValue | undefined,
  mode: AnswerValidationMode,
): string | null => {
  if (value === undefined || isEmptyAnswer(value)) {
    const required = field.required || field.type === 'consent';
    return mode === 'submit' && required
      ? (REQUIRED_MESSAGES[field.type] ?? 'This question needs an answer.')
      : null;
  }
  return FIELD_VALIDATORS[field.type](field, value, mode);
};

/**
 * Every problem with a set of answers, in form order, each tied to the step
 * the applicant can go back to and fix.
 *
 * Hidden questions are skipped entirely, so a required question behind an
 * unmet condition never blocks a submission. Answers to questions the form
 * does not have are not problems: they are left over from an earlier version
 * of a form edited while the applicant was part-way through, and the
 * applicant has no screen on which to remove them. The server stores
 * `pruneHiddenAnswers`, which drops them.
 */
export const validateAnswers = (
  steps: readonly FormStep[],
  answers: AnswerSource,
  { mode }: { mode: AnswerValidationMode },
): AnswerProblem[] => {
  const all = answersToMap(answers);
  return resolveVisibility(steps, all).steps.flatMap((step) =>
    step.fields.flatMap((field) => {
      const message = validateAnswer(field, answerFor(all, field.id), mode);
      return message ? [{ fieldId: field.id, stepId: step.id, message }] : [];
    }),
  );
};

/**
 * Whether a form is taking answers at `now`, from its schedule alone. A form
 * with status `closed` is closed whatever this says; the caller folds that in.
 */
export const formWindowState = (
  settings: Pick<FormSettings, 'opensAt' | 'closesAt'> | null | undefined,
  now: Date,
): FormWindowState => {
  const time = now.getTime();
  if (settings?.opensAt && time < Date.parse(settings.opensAt)) {
    return 'not-yet-open';
  }
  if (settings?.closesAt && time >= Date.parse(settings.closesAt)) {
    return 'closed';
  }
  return 'open';
};

const nameOf = (field: Pick<FormField, 'label' | 'id'>): string =>
  `"${field.label.trim() || field.id}"`;

const idProblems = (steps: readonly FormStep[]): string[] => {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of idsInOrder(steps)) {
    if (seen.has(id)) {
      repeated.add(id);
    }
    seen.add(id);
  }
  return [...repeated].map(
    (id) => `The id "${id}" is used more than once. Every step and question needs its own.`,
  );
};

const optionProblems = (field: FormField): string[] => {
  if (!isChoiceFieldType(field.type)) {
    return [];
  }
  if (field.options.length === 0) {
    return [`${nameOf(field)} needs at least one option to choose from.`];
  }
  const values = field.options.map((option) => option.value);
  return new Set(values).size === values.length
    ? []
    : [`${nameOf(field)} has two options with the same value.`];
};

const limitProblems = (field: FormField): string[] => {
  const { minLength, maxLength, min, max } = field.validation ?? {};
  const problems: string[] = [];
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    problems.push(`${nameOf(field)} has a minimum length above its maximum.`);
  }
  if (min !== undefined && max !== undefined && min > max) {
    problems.push(`${nameOf(field)} has a minimum above its maximum.`);
  }
  return problems;
};

const fieldProblems = (field: FormField): string[] => {
  const problems = [...optionProblems(field), ...limitProblems(field)];
  if (field.type === 'consent' && !field.consentText?.trim()) {
    problems.push(`${nameOf(field)} needs the words people are agreeing to.`);
  }
  return problems;
};

const VALUE_FREE_OPERATORS: readonly VisibilityOperator[] = ['is-empty', 'is-not-empty'];
const TICK_VALUES: readonly string[] = ['true', 'false'];

/**
 * Why a compared value can never match the question it is compared with, or
 * null when it can. Such a condition would hide its step or question for
 * good, and nothing on the public form would say why. The checks mirror how
 * `isRuleMet` compares: choices by option value, ticks as `true` or `false`,
 * numbers numerically, and files only by whether there are any.
 */
const comparedValueProblem = (owner: string, target: FormField, value: string): string | null => {
  const condition = `${owner} has a condition on ${nameOf(target)}`;
  if (target.type === 'file') {
    return `${condition} that can only check whether a file was added. Use "is empty" or "is not empty".`;
  }
  if (isChoiceFieldType(target.type)) {
    return target.options.some((option) => option.value === normalise(value))
      ? null
      : `${condition} for "${value}", which is not one of its options.`;
  }
  if (target.type === 'checkbox' || target.type === 'consent') {
    return TICK_VALUES.includes(normalise(value))
      ? null
      : `${condition} that can only compare with true (ticked) or false (not ticked).`;
  }
  if (target.type === 'number' && !Number.isFinite(Number(value))) {
    return `${condition} that compares a number with "${value}".`;
  }
  return null;
};

/**
 * Problems with one condition. `earlier` holds the questions before the thing
 * the condition is on, and `questions` every question in the form by id.
 */
const conditionProblems = (
  owner: string,
  visibility: VisibilityCondition | null | undefined,
  earlier: ReadonlySet<string>,
  questions: ReadonlyMap<string, FormField>,
): string[] =>
  (visibility?.rules ?? []).flatMap((rule) => {
    const target = questions.get(rule.fieldId);
    if (target === undefined) {
      return [`${owner} depends on a question that is not on the form.`];
    }
    if (!earlier.has(rule.fieldId)) {
      return [
        `${owner} depends on ${nameOf(target)}, which comes after it. Conditions can only use earlier questions.`,
      ];
    }
    if (VALUE_FREE_OPERATORS.includes(rule.operator)) {
      return [];
    }
    const value = rule.value?.trim() ?? '';
    if (value === '') {
      return [`${owner} has a condition on ${nameOf(target)} with nothing to compare against.`];
    }
    const problem = comparedValueProblem(owner, target, value);
    return problem ? [problem] : [];
  });

// Conditions may only look backwards. The applicant answers in order, so a
// condition on a later question would show or hide something based on an
// answer they have not been asked for yet.
const visibilityProblems = (steps: readonly FormStep[]): string[] => {
  const questions = new Map(
    steps.flatMap((step) => step.fields.map((field) => [field.id, field] as const)),
  );
  const earlier = new Set<string>();
  const problems: string[] = [];
  for (const step of steps) {
    problems.push(
      ...conditionProblems(`Step "${step.title}"`, step.visibility, earlier, questions),
    );
    for (const field of step.fields) {
      problems.push(...conditionProblems(nameOf(field), field.visibility, earlier, questions));
      earlier.add(field.id);
    }
  }
  return problems;
};

// The applicant's details are read from these questions, so the question has
// to collect the right kind of answer.
const MAPPING_FIELD_TYPES: Record<ApplicantMapping, readonly FormFieldType[]> = {
  'applicant-name': ['short-text'],
  'applicant-email': ['email'],
  'applicant-phone': ['phone', 'short-text'],
};

const mappingProblems = (steps: readonly FormStep[]): string[] => {
  const fields = steps.flatMap((step) => step.fields);
  return APPLICANT_MAPPINGS.flatMap((mapping) => {
    const mapped = fields.filter((field) => field.mapsTo === mapping);
    const problems = mapped
      .filter((field) => !MAPPING_FIELD_TYPES[mapping].includes(field.type))
      .map((field) => `${nameOf(field)} cannot supply the ${mapping.replace('-', "'s ")}.`);
    if (mapped.length > 1) {
      problems.push(`Only one question can supply the ${mapping.replace('-', "'s ")}.`);
    }
    return problems;
  });
};

/**
 * Everything wrong with a form's questions, as sentences an editor can act on.
 *
 * Checks that step and question ids are unique across the form, that option
 * values are unique within a question, that choice questions have options,
 * that consent questions say what is being agreed to, that conditions only
 * use earlier questions that exist, and that applicant details come from
 * suitable questions.
 */
export const formDefinitionProblems = (steps: readonly FormStep[]): string[] => {
  const fields = steps.flatMap((step) => step.fields);
  const problems = [
    ...idProblems(steps),
    ...fields.flatMap(fieldProblems),
    ...visibilityProblems(steps),
    ...mappingProblems(steps),
  ];
  if (fields.length > MAX_FORM_FIELDS) {
    problems.push(`A form can ask at most ${MAX_FORM_FIELDS} questions.`);
  }
  return problems;
};

/** What a form needs before it can be published. */
export interface FormPublishCandidate {
  title: string;
  steps: readonly FormStep[];
  settings?: Pick<FormSettings, 'opensAt' | 'closesAt'> | null;
}

/**
 * Everything that stops a form going live. Publishing opens a public page that
 * collects personal data, so a form is only published when this is empty.
 */
export const formPublishProblems = (form: FormPublishCandidate): string[] => {
  const problems: string[] = [];
  if (form.title.trim().length < 3) {
    problems.push('Give the form a title.');
  }
  if (!form.steps.some((step) => step.fields.length > 0)) {
    problems.push('Add at least one question.');
  }
  const opensAt = form.settings?.opensAt;
  const closesAt = form.settings?.closesAt;
  if (opensAt && closesAt && Date.parse(closesAt) <= Date.parse(opensAt)) {
    problems.push('The closing date must be after the opening date.');
  }
  return [...problems, ...formDefinitionProblems(form.steps)];
};

const textAnswer = (value: AnswerValue | undefined): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const emailAnswer = (value: AnswerValue | undefined): string | undefined => {
  const text = textAnswer(value);
  return text !== undefined && emailFormat.safeParse(text).success ? text : undefined;
};

/**
 * The applicant's name, email and phone, for the application list and emails.
 *
 * Taken from the questions mapped to them. Only when no question is mapped to
 * the email does the first answered email question stand in: once one is
 * mapped, another email question on the form is someone else's address (a
 * referee, a manager), and the applicant's acknowledgement must not go there.
 * Hidden questions are ignored, and an email is only returned when it is an
 * address, since drafts are read before their answers are checked.
 */
export const applicantFromAnswers = (
  steps: readonly FormStep[],
  answers: AnswerSource,
): { name?: string; email?: string; phone?: string } => {
  const resolved = resolveVisibility(steps, answers);
  const fields = resolved.steps.flatMap((step) => step.fields);
  const mapped = (mapping: ApplicantMapping) => {
    const field = fields.find((candidate) => candidate.mapsTo === mapping);
    return field ? answerFor(resolved.answers, field.id) : undefined;
  };
  // Every step, hidden or not: a mapped question that is hidden still means
  // the form's author named where the applicant's email comes from.
  const emailIsMapped = steps.some((step) =>
    step.fields.some((field) => field.mapsTo === 'applicant-email'),
  );
  const fallbackEmail = emailIsMapped
    ? undefined
    : fields
        .filter((field) => field.type === 'email')
        .map((field) => emailAnswer(answerFor(resolved.answers, field.id)))
        .find((value) => value !== undefined);
  const email = emailAnswer(mapped('applicant-email')) ?? fallbackEmail;
  const identity: { name?: string; email?: string; phone?: string } = {};
  const name = textAnswer(mapped('applicant-name'));
  const phone = textAnswer(mapped('applicant-phone'));
  if (name) identity.name = name;
  if (email) identity.email = email.toLowerCase();
  if (phone) identity.phone = phone;
  return identity;
};

/** A ready-made form: everything but the slug, which the editor chooses. */
export interface FormTemplate {
  title: string;
  type: FormType;
  intro: FormIntro;
  settings: FormSettings;
  steps: FormStep[];
}

const option = (value: string, label: string): FormOption => ({ value, label });

const yesNo = (): FormOption[] => [option('yes', 'Yes'), option('no', 'No')];

const question = (
  id: string,
  type: FormFieldType,
  label: string,
  extra: Partial<Omit<FormField, 'id' | 'type' | 'label'>> = {},
): FormField => ({ id, type, label, required: false, options: [], ...extra });

const speakerApplication = (): FormTemplate => ({
  title: 'Speaker application',
  type: 'speaker-application',
  intro: {
    heading: 'Speak at an Impact Africa Alliance event',
    description:
      'Tell us about yourself and the session you would like to lead. It takes about fifteen minutes, and your answers are saved as you go, so you can stop and come back later.',
  },
  settings: {
    allowDrafts: true,
    acknowledgeApplicant: true,
    successMessage:
      'Thank you for offering to speak. We read every application and will reply by email.',
  },
  steps: [
    {
      id: 'about-you',
      title: 'About you',
      description: 'So we know who you are and how to reach you.',
      fields: [
        question('full-name', 'short-text', 'Full name', {
          required: true,
          mapsTo: 'applicant-name',
          validation: { maxLength: 120 },
        }),
        question('email', 'email', 'Email address', {
          required: true,
          mapsTo: 'applicant-email',
          helpText: 'We only use this to contact you about your application.',
        }),
        question('phone', 'phone', 'Phone number', {
          mapsTo: 'applicant-phone',
          helpText: 'Include the country code, for example +233 20 123 4567.',
        }),
        question('country', 'short-text', 'Country you are based in', {
          required: true,
          validation: { maxLength: 80 },
        }),
        question('organisation', 'short-text', 'Organisation', {
          required: true,
          helpText: 'Where you work or study. Write "Independent" if that fits best.',
          validation: { maxLength: 160 },
        }),
        question('role', 'short-text', 'Your role', {
          required: true,
          placeholder: 'For example, Programme Director',
          validation: { maxLength: 120 },
        }),
      ],
    },
    {
      id: 'your-session',
      title: 'Your session',
      description: 'Tell us what you would like to speak about.',
      fields: [
        question('session-title', 'short-text', 'Proposed session title', {
          required: true,
          validation: { maxLength: 120 },
        }),
        question('abstract', 'long-text', 'What is the session about?', {
          required: true,
          helpText:
            'What will people learn, and what should they do differently afterwards? Between 100 and 2,000 characters.',
          validation: { minLength: 100, maxLength: 2000 },
        }),
        question('format', 'radio', 'Preferred format', {
          required: true,
          options: [
            option('keynote', 'Keynote'),
            option('panel', 'Panel discussion'),
            option('workshop', 'Workshop'),
            option('fireside-chat', 'Fireside chat'),
          ],
        }),
        question('audience-level', 'select', 'Who is the session for?', {
          required: true,
          options: [
            option('beginner', 'People new to the topic'),
            option('intermediate', 'People with some experience'),
            option('advanced', 'Specialists and practitioners'),
            option('all-levels', 'Everyone'),
          ],
        }),
        question('topics', 'multi-select', 'Which of our programme areas does it relate to?', {
          required: true,
          helpText: 'Choose all that apply.',
          options: [
            option('digital-skills', 'Digital skills and innovation'),
            option('stem-learning', 'STEM and vocational learning'),
            option('youth-inclusion', 'Youth inclusion and careers'),
            option('women-empowerment', "Women's empowerment and mentorship"),
          ],
        }),
      ],
    },
    {
      id: 'experience',
      title: 'Experience',
      description: 'This helps us find the right slot for you. First-time speakers are welcome.',
      fields: [
        question('spoken-before', 'radio', 'Have you spoken at an event before?', {
          required: true,
          options: yesNo(),
        }),
        question('past-talks', 'url', 'Link to a recording or slides from a past talk', {
          helpText: 'A video, a slide deck or an event page all help.',
          placeholder: 'https://',
          visibility: {
            match: 'all',
            rules: [{ fieldId: 'spoken-before', operator: 'equals', value: 'yes' }],
          },
        }),
        question('bio', 'long-text', 'Short speaker biography', {
          required: true,
          helpText: 'Written in the third person, as it would appear in the programme.',
          validation: { minLength: 50, maxLength: 600 },
        }),
        question('headshot', 'file', 'Headshot', {
          required: true,
          helpText: 'A clear, recent photo for the programme. An image file up to 5 MB.',
          validation: { fileKinds: ['image'], maxFiles: 1, maxSizeMB: 5 },
        }),
      ],
    },
    {
      id: 'logistics',
      title: 'Logistics',
      fields: [
        question('available-from', 'date', 'Earliest date you could speak', {
          helpText: 'Leave this blank if you are flexible.',
        }),
        question('travel-support', 'radio', 'Would you need help with travel costs to attend?', {
          required: true,
          options: [
            option('yes', 'Yes'),
            option('no', 'No'),
            option('online-only', 'I would speak online only'),
          ],
        }),
        question('accessibility', 'long-text', 'Accessibility needs', {
          helpText:
            'Anything that would help you take part fully, such as step-free access, captions or a seat on stage.',
          validation: { maxLength: 1000 },
        }),
      ],
    },
    {
      id: 'consent',
      title: 'Consent',
      fields: [
        question('privacy-consent', 'consent', 'Your consent', {
          required: true,
          consentText:
            'I agree that Impact Africa Alliance may keep the information in this application and use it to assess my application and contact me about it, as set out in the privacy policy at impactafricaalliance.org/privacy-policy.',
        }),
      ],
    },
  ],
});

const TEMPLATE_BUILDERS: Record<FormTemplateKey, () => FormTemplate> = {
  'speaker-application': speakerApplication,
};

// Frozen all the way down: code that edits the shared reference copy instead
// of calling `formTemplate()` gets a TypeError, rather than quietly changing
// the template for every form created after it in the same process.
const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

/**
 * Ready-made forms, keyed by template. Read-only reference copies, frozen so
 * they cannot be edited by accident: use `formTemplate(key)` for a fresh copy
 * to change.
 */
export const FORM_TEMPLATES: Readonly<Record<FormTemplateKey, FormTemplate>> = deepFreeze({
  'speaker-application': speakerApplication(),
});

/** A fresh copy of a template, safe to edit and save as a new form. */
export const formTemplate = (key: FormTemplateKey): FormTemplate => TEMPLATE_BUILDERS[key]();

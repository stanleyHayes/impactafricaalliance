import {
  formDefinitionProblems,
  formInputSchema,
  formIntroSchema,
  formPublishProblems,
  formSettingsSchema,
  formTemplate,
  isReservedFormSlug,
  newStableId,
  slugSchema,
  type FormDefinition,
  type FormInput,
  type FormIntro,
  type FormSettings,
  type FormStep,
  type FormTemplateKey,
  type FormType,
  type FormUpdate,
  type MediaAsset,
} from '@iaa/shared';
import type { z } from 'zod';

import { slugify } from '../../lib/slug';

/**
 * The form editor's state and rules (AGENTS.md stepwise pages). Everything the
 * six steps hold lives in one plain object, so moving between steps never
 * loses a value, and every check is a pure function the page and the tests
 * share.
 */

export const FORM_EDITOR_STEPS = [
  'Basics',
  'Introduction',
  'Questions',
  'Schedule & limits',
  'Confirmation',
  'Review',
] as const;

export const REVIEW_STEP = FORM_EDITOR_STEPS.length - 1;

export interface FormEditorState {
  title: string;
  slug: string;
  /** Once the editor types an address, the title stops rewriting it. */
  slugTouched: boolean;
  type: FormType;
  description: string;
  introHeading: string;
  introDescription: string;
  introImage: MediaAsset | null;
  steps: FormStep[];
  opensAt: string | null;
  closesAt: string | null;
  /** As typed; empty means no limit. */
  submissionLimit: string;
  allowDrafts: boolean;
  successMessage: string;
  acknowledgeApplicant: boolean;
  notifyEmails: string[];
  /**
   * The form was published when the editor opened it. A live form has to
   * stay ready to take applications, so its questions are held to the
   * publishing checks rather than saved half-built (the API refuses too).
   */
  live?: boolean;
}

/** An address made from a title, in the shape `slugSchema` accepts. */
export const slugFromTitle = (title: string): string => slugify(title).slice(0, 120);

export const emptyFormState = (): FormEditorState => ({
  title: '',
  slug: '',
  slugTouched: false,
  type: 'general',
  description: '',
  introHeading: '',
  introDescription: '',
  introImage: null,
  steps: [{ id: newStableId('step'), title: 'About you', fields: [] }],
  opensAt: null,
  closesAt: null,
  submissionLimit: '',
  allowDrafts: true,
  successMessage: '',
  acknowledgeApplicant: false,
  notifyEmails: [],
});

/**
 * A new form started from a template: its questions, introduction and
 * settings, with the address made from its title until the editor changes it.
 */
export const templateState = (key: FormTemplateKey): FormEditorState => {
  const template = formTemplate(key);
  return {
    ...emptyFormState(),
    title: template.title,
    slug: slugFromTitle(template.title),
    type: template.type,
    introHeading: template.intro.heading,
    introDescription: template.intro.description ?? '',
    introImage: template.intro.image ?? null,
    steps: template.steps,
    allowDrafts: template.settings.allowDrafts,
    successMessage: template.settings.successMessage ?? '',
    acknowledgeApplicant: template.settings.acknowledgeApplicant ?? false,
  };
};

const isLive = (form: FormDefinition): boolean => form.status === 'published' && !form.archivedAt;

export const formToState = (form: FormDefinition): FormEditorState => ({
  title: form.title,
  slug: form.slug,
  slugTouched: true,
  type: form.type,
  description: form.description ?? '',
  introHeading: form.intro?.heading ?? '',
  introDescription: form.intro?.description ?? '',
  introImage: form.intro?.image ?? null,
  steps: form.steps,
  opensAt: form.settings.opensAt ?? null,
  closesAt: form.settings.closesAt ?? null,
  submissionLimit: form.settings.submissionLimit ? String(form.settings.submissionLimit) : '',
  allowDrafts: form.settings.allowDrafts,
  successMessage: form.settings.successMessage ?? '',
  acknowledgeApplicant: form.settings.acknowledgeApplicant ?? false,
  notifyEmails: form.settings.notifyEmails ?? [],
  live: isLive(form),
});

const LIMIT_PATTERN = /^\d+$/;

/** The limit as a number, null for none, or NaN when what was typed is not a whole number. */
const parsedLimit = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return LIMIT_PATTERN.test(trimmed) ? Number(trimmed) : Number.NaN;
};

export const settingsOf = (state: FormEditorState): FormSettings => {
  const limit = parsedLimit(state.submissionLimit);
  return {
    allowDrafts: state.allowDrafts,
    opensAt: state.opensAt,
    closesAt: state.closesAt,
    ...(state.successMessage.trim() ? { successMessage: state.successMessage.trim() } : {}),
    submissionLimit: limit !== null && Number.isFinite(limit) ? limit : null,
    notifyEmails: state.notifyEmails,
    acknowledgeApplicant: state.acknowledgeApplicant,
  };
};

/** The cover slide, or undefined when the editor left it empty (the title stands in). */
export const introOf = (state: FormEditorState): FormIntro | undefined => {
  const heading = state.introHeading.trim();
  if (!heading) return undefined;
  return {
    heading,
    ...(state.introDescription.trim() ? { description: state.introDescription.trim() } : {}),
    ...(state.introImage ? { image: state.introImage } : {}),
  };
};

/** The body for `POST /admin/forms`. */
export const createBody = (state: FormEditorState): FormInput => {
  const intro = introOf(state);
  return {
    title: state.title.trim(),
    slug: state.slug.trim(),
    type: state.type,
    ...(state.description.trim() ? { description: state.description.trim() } : {}),
    ...(intro ? { intro } : {}),
    settings: settingsOf(state),
    steps: state.steps,
  };
};

/**
 * The body for `PATCH /admin/forms/:id`: everything, with null for the
 * internal note and the introduction when they were emptied, because leaving
 * a key out of a PATCH keeps the old value.
 */
export const updateBody = (state: FormEditorState): FormUpdate => {
  const { description, intro, ...rest } = createBody(state);
  return { ...rest, description: description ?? null, intro: intro ?? null };
};

type Issue = z.core.$ZodIssue;

const ordinal = (index: unknown): number => (typeof index === 'number' ? index + 1 : 0);

// What a schema complaint about the questions means, said about the question.
const questionIssue = (issue: Issue): string => {
  const [stepIndex, part, fieldIndex, key] = issue.path;
  const where = `step ${ordinal(stepIndex)}`;
  if (part === 'title') return `Give ${where} a title.`;
  if (part !== 'fields') return `Check ${where}: ${issue.message}`;
  const question = `Question ${ordinal(fieldIndex)} on ${where}`;
  if (key === 'label') return `${question} needs a label.`;
  if (key === 'options') return `${question} has an option with no label.`;
  return `${question}: ${issue.message}`;
};

const firstIssue = (result: {
  success: boolean;
  error?: { issues: Issue[] };
}): Issue | undefined => (result.success ? undefined : result.error?.issues[0]);

const basicsProblem = (state: FormEditorState): string | undefined => {
  if (state.title.trim().length < 3) return 'Give the form a title of at least 3 characters.';
  if (state.title.trim().length > 160) return 'Keep the title to 160 characters or fewer.';
  if (!slugSchema.safeParse(state.slug.trim()).success) {
    return 'Use lowercase letters, numbers and single hyphens for the address, such as speaker-call-2027.';
  }
  if (isReservedFormSlug(state.slug)) {
    return `"${state.slug.trim()}" is used by the public site for previews. Choose a different address.`;
  }
  return undefined;
};

const introProblem = (state: FormEditorState): string | undefined => {
  const intro = introOf(state);
  if (!intro) {
    return state.introDescription.trim() || state.introImage
      ? 'Add a heading for the cover, or clear the introduction.'
      : undefined;
  }
  const issue = firstIssue(formIntroSchema.safeParse(intro));
  return issue ? `Check the introduction: ${issue.message}` : undefined;
};

// What a live form's questions must not have: what `formPublishProblems`
// says about the questions, since the other steps check the rest.
const liveQuestionsProblem = (steps: readonly FormStep[]): string | undefined => {
  const problem = steps.some((step) => step.fields.length > 0)
    ? formDefinitionProblems(steps)[0]
    : 'Add at least one question.';
  return problem
    ? `This form is live, so its questions have to stay ready for applicants. ${problem}`
    : undefined;
};

const questionsProblem = (state: FormEditorState): string | undefined => {
  if (state.steps.length === 0) return 'Add at least one step.';
  const issue = firstIssue(formInputSchema.shape.steps.safeParse(state.steps));
  if (issue) return issue.path.length === 0 ? issue.message : questionIssue(issue);
  return state.live ? liveQuestionsProblem(state.steps) : undefined;
};

const scheduleProblem = (state: FormEditorState): string | undefined => {
  const limit = parsedLimit(state.submissionLimit);
  if (limit !== null && (!Number.isFinite(limit) || limit < 1)) {
    return 'Enter the most applications as a whole number of 1 or more, or leave it empty.';
  }
  if (state.opensAt && state.closesAt && Date.parse(state.closesAt) <= Date.parse(state.opensAt)) {
    return 'The closing date must be after the opening date.';
  }
  return undefined;
};

const confirmationProblem = (state: FormEditorState): string | undefined => {
  const issue = firstIssue(formSettingsSchema.safeParse(settingsOf(state)));
  if (!issue) return undefined;
  if (issue.path[0] === 'notifyEmails') {
    return 'Check the notification emails: each must be a full address, and there can be up to five.';
  }
  return issue.path[0] === 'successMessage'
    ? 'Keep the confirmation message to 1,000 characters or fewer.'
    : issue.message;
};

const STEP_CHECKS: ((state: FormEditorState) => string | undefined)[] = [
  basicsProblem,
  introProblem,
  questionsProblem,
  scheduleProblem,
  confirmationProblem,
  () => undefined,
];

/** What stops one step being left, or undefined when it is complete. */
export const stepProblem = (state: FormEditorState, step: number): string | undefined =>
  STEP_CHECKS[step]?.(state);

/** The first step with a problem, for returning the editor to it on save. */
export const firstProblem = (
  state: FormEditorState,
): { step: number; message: string } | undefined => {
  for (let step = 0; step < STEP_CHECKS.length; step += 1) {
    const message = stepProblem(state, step);
    if (message) return { step, message };
  }
  const issue = firstIssue(formInputSchema.safeParse(createBody(state)));
  return issue ? { step: stepForPath(issue.path.map(String)), message: issue.message } : undefined;
};

const SETTINGS_STEP: Record<string, number> = {
  opensAt: 3,
  closesAt: 3,
  submissionLimit: 3,
  allowDrafts: 3,
  successMessage: 4,
  notifyEmails: 4,
  acknowledgeApplicant: 4,
};

/** Which step holds the value a server or schema complaint is about. */
export const stepForPath = (path: readonly string[]): number => {
  const [head, next] = path;
  if (head === 'intro') return 1;
  if (head === 'steps') return 2;
  if (head === 'settings') return SETTINGS_STEP[next ?? ''] ?? 3;
  return 0;
};

/** What publishing looks at. */
export interface PublishCandidate {
  title: string;
  steps: readonly FormStep[];
  opensAt?: string | null;
  closesAt?: string | null;
}

/**
 * What would stop a form being published, as the Review step and the form's
 * page list it: the shared `formPublishProblems`, and a closing date already
 * past, which the API also refuses.
 */
export const publishBlockers = (form: PublishCandidate, now = new Date()): string[] => {
  const problems = formPublishProblems({
    title: form.title,
    steps: form.steps,
    settings: { opensAt: form.opensAt ?? null, closesAt: form.closesAt ?? null },
  });
  if (form.closesAt && Date.parse(form.closesAt) <= now.getTime()) {
    problems.push('The closing date has passed. Move it later or clear it.');
  }
  return problems;
};

/**
 * The same checks on the editor's unsaved state. A live form is already
 * published, so a closing date that has passed only means it has stopped
 * taking applications; the rest must still hold for it to be saved.
 */
export const publishChecklist = (state: FormEditorState, now = new Date()): string[] => {
  const { title, steps, opensAt, closesAt } = state;
  return state.live
    ? formPublishProblems({ title, steps, settings: { opensAt, closesAt } })
    : publishBlockers({ title, steps, opensAt, closesAt }, now);
};

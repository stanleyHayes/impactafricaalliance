import {
  formWindowState,
  UserRole,
  type ApplicantDraft,
  type FormDefinition,
  type FormIntro,
  type FormListItem,
  type FormSettings,
  type FormStep,
  type FormVersionSnapshot,
  type FormWindowState,
  type PersonSummary,
  type PublicForm,
} from '@iaa/shared';
import type { Request } from 'express';
import type { Types } from 'mongoose';

import { UnauthorizedError } from '../../common/errors.js';

import type { FormSubmissionDocument } from './form-submission.model.js';
import type { FormVersionDocument } from './form-version.model.js';
import type { FormDocument, FormSettingsRecord } from './form.model.js';

/**
 * Turning stored forms, versions and drafts into the shapes the dashboard and
 * the public site read. Kept apart from the services so each response shape
 * is built in exactly one place.
 */

/** A form read with `lean()`. */
export type StoredForm = FormDocument & { _id: Types.ObjectId };
/** A form version read with `lean()`. */
export type StoredFormVersion = FormVersionDocument & { _id: Types.ObjectId };
/** A submission or draft read with `lean()`. */
export type StoredSubmission = FormSubmissionDocument & { _id: Types.ObjectId };

/** Who is making a change, always taken from the signed-in user (plan D16). */
export interface Actor {
  id: string;
  email: string;
  role: UserRole;
}

/** The actor behind an authenticated request. */
export const actorOf = (req: Request): Actor => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return { id: req.user.sub, email: req.user.email, role: req.user.role };
};

export const isAdmin = (actor: Actor): boolean => actor.role === UserRole.Admin;

const isoOrNull = (date: Date | null | undefined): string | null =>
  date ? date.toISOString() : null;

/** Settings as the API sends them: the schedule as ISO text, every optional value explicit. */
export const settingsToDto = (settings: FormSettingsRecord | null | undefined): FormSettings => ({
  allowDrafts: settings?.allowDrafts ?? true,
  opensAt: isoOrNull(settings?.opensAt),
  closesAt: isoOrNull(settings?.closesAt),
  ...(settings?.successMessage ? { successMessage: settings.successMessage } : {}),
  submissionLimit: settings?.submissionLimit ?? null,
  notifyEmails: settings?.notifyEmails ?? [],
  acknowledgeApplicant: settings?.acknowledgeApplicant ?? false,
});

/**
 * Settings as stored. A cleared date or limit is left out rather than stored
 * as null: the whole object is replaced on every save, so leaving it out is
 * how it is cleared.
 */
export const settingsFromInput = (input: FormSettings): FormSettingsRecord => ({
  allowDrafts: input.allowDrafts,
  ...(input.opensAt ? { opensAt: new Date(input.opensAt) } : {}),
  ...(input.closesAt ? { closesAt: new Date(input.closesAt) } : {}),
  ...(input.successMessage ? { successMessage: input.successMessage } : {}),
  ...(input.submissionLimit ? { submissionLimit: input.submissionLimit } : {}),
  ...(input.notifyEmails?.length ? { notifyEmails: input.notifyEmails } : {}),
  ...(input.acknowledgeApplicant !== undefined
    ? { acknowledgeApplicant: input.acknowledgeApplicant }
    : {}),
});

// Mongoose and the request describe "nothing here" in different ways: an
// absent key, null, an empty object or an empty list. All of them mean the
// same thing to a form, so they compare as the same.
const canonical = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    const items = value.map(canonical);
    return items.length === 0 ? undefined : items;
  }
  if (typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, canonical((value as Record<string, unknown>)[key])] as const)
      .filter(([, item]) => item !== undefined);
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }
  return value;
};

/**
 * Whether two versions of a form's questions (or introduction) differ in
 * anything an applicant would see. Decides whether a published form needs a
 * new version snapshot (plan D14).
 */
export const definitionChanged = (before: unknown, after: unknown): boolean =>
  JSON.stringify(canonical(before)) !== JSON.stringify(canonical(after));

/**
 * Whether a form is taking answers now. A closed form is closed whatever its
 * dates say; otherwise its schedule decides.
 */
export const publicWindow = (
  form: Pick<StoredForm, 'status' | 'settings'>,
  now: Date,
): FormWindowState =>
  form.status === 'closed' ? 'closed' : formWindowState(settingsToDto(form.settings), now);

const introOf = (form: Pick<StoredForm, 'intro'>): FormIntro | undefined =>
  form.intro ? (form.intro as FormIntro) : undefined;

/** A form as the dashboard sees it. */
export const toFormDefinition = (
  form: StoredForm,
  submissionCount: number,
  people: ReadonlyMap<string, PersonSummary>,
): FormDefinition => {
  const intro = introOf(form);
  return {
    id: form._id.toString(),
    title: form.title,
    slug: form.slug,
    type: form.type,
    ...(form.description ? { description: form.description } : {}),
    status: form.status,
    ...(intro ? { intro } : {}),
    settings: settingsToDto(form.settings),
    steps: form.steps ?? [],
    version: form.version,
    publishedAt: isoOrNull(form.publishedAt),
    closedAt: isoOrNull(form.closedAt),
    archivedAt: isoOrNull(form.archivedAt),
    submissionCount,
    createdBy: form.createdBy ? (people.get(form.createdBy.toString()) ?? null) : null,
    updatedBy: form.updatedBy ? (people.get(form.updatedBy.toString()) ?? null) : null,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
};

/** A form as a list row. */
export const toFormListItem = (form: StoredForm, submissionCount: number): FormListItem => {
  const steps = form.steps ?? [];
  return {
    id: form._id.toString(),
    title: form.title,
    slug: form.slug,
    type: form.type,
    status: form.status,
    version: form.version,
    stepCount: steps.length,
    fieldCount: steps.reduce((total, step) => total + step.fields.length, 0),
    submissionCount,
    opensAt: isoOrNull(form.settings?.opensAt),
    closesAt: isoOrNull(form.settings?.closesAt),
    publishedAt: isoOrNull(form.publishedAt),
    closedAt: isoOrNull(form.closedAt),
    archivedAt: isoOrNull(form.archivedAt),
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
};

/**
 * A form as the public page sees it: the questions and what the page needs to
 * show, and nothing about who is notified or who built it.
 */
export const toPublicForm = (form: StoredForm, now: Date): PublicForm => {
  const settings = settingsToDto(form.settings);
  return {
    slug: form.slug,
    title: form.title,
    type: form.type,
    intro: introOf(form) ?? { heading: form.title },
    steps: form.steps ?? [],
    settings: {
      allowDrafts: settings.allowDrafts,
      ...(settings.successMessage ? { successMessage: settings.successMessage } : {}),
      opensAt: settings.opensAt ?? null,
      closesAt: settings.closesAt ?? null,
    },
    version: form.version,
    window: publicWindow(form, now),
  };
};

/** A stored snapshot as the review page reads it. */
export const toSnapshot = (version: StoredFormVersion): FormVersionSnapshot => ({
  formId: version.formId.toString(),
  version: version.version,
  title: version.title,
  ...(version.intro ? { intro: version.intro as FormIntro } : {}),
  steps: (version.steps ?? []) as FormStep[],
  createdAt: version.createdAt.toISOString(),
});

/**
 * The form's current questions presented as a snapshot, for an application
 * whose version snapshot is missing (written before snapshots existed, or lost).
 */
export const currentAsSnapshot = (form: StoredForm): FormVersionSnapshot => {
  const intro = introOf(form);
  return {
    formId: form._id.toString(),
    version: form.version,
    title: form.title,
    ...(intro ? { intro } : {}),
    steps: form.steps ?? [],
    createdAt: form.updatedAt.toISOString(),
  };
};

/** A draft as the applicant's own browser sees it. */
export const toApplicantDraft = (draft: StoredSubmission, formSlug: string): ApplicantDraft => ({
  formSlug,
  formVersion: draft.formVersion,
  status: draft.status,
  answers: (draft.answers ?? []).map((answer) => ({
    fieldId: answer.fieldId,
    value: answer.value ?? null,
  })),
  ...(draft.currentStepId ? { currentStepId: draft.currentStepId } : {}),
  updatedAt: draft.updatedAt.toISOString(),
  ...(draft.draftExpiresAt ? { expiresAt: draft.draftExpiresAt.toISOString() } : {}),
});

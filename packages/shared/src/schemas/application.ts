import { z } from 'zod';

import { objectIdSchema, paginationQuerySchema, type Timestamped } from './common.js';
import {
  formAnswersSchema,
  MAX_FILE_MB,
  type AnswerValue,
  type FormAnswer,
  type FormType,
  type FormVersionSnapshot,
} from './form.js';
import {
  calendarDateSchema,
  commaList,
  optionalTextField,
  SORT_ORDERS,
  stableIdSchema,
  type PersonSummary,
} from './work.js';

/**
 * An application is one person's answers to a published form, from the first
 * autosaved draft to a decision. Applicants have no account: a draft is
 * reached with an opaque token that only its holder has, and the id of a
 * submission is never treated as permission to see it.
 */

export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under-review',
  'shortlisted',
  'accepted',
  'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * The statuses reviewers work with. Drafts belong to the applicant until they
 * press Submit, so they never appear in the review lists.
 */
export const REVIEWABLE_APPLICATION_STATUSES = [
  'submitted',
  'under-review',
  'shortlisted',
  'accepted',
  'rejected',
] as const satisfies readonly ApplicationStatus[];
export type ReviewableApplicationStatus = (typeof REVIEWABLE_APPLICATION_STATUSES)[number];

/**
 * Whether reviewers may move an application between two statuses. Any
 * decision can be revisited, since people change their minds and the history
 * keeps every step. Nothing goes into or out of `draft`: only the applicant's
 * submission ends a draft, and a submitted application cannot be handed back.
 */
export const canChangeApplicationStatus = (
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean => from !== to && from !== 'draft' && to !== 'draft';

/** A reviewer's overall view, kept apart from the notes so a list can show it at a glance. */
export const APPLICATION_RECOMMENDATIONS = ['strong-yes', 'yes', 'maybe', 'no'] as const;
export type ApplicationRecommendation = (typeof APPLICATION_RECOMMENDATIONS)[number];

/** Header that carries an applicant's draft token. A header, not a query string, so it stays out of logs and analytics. */
export const DRAFT_TOKEN_HEADER = 'x-draft-token';

/** Days an untouched draft is kept before it is deleted. Each save starts the count again. */
export const DRAFT_RETENTION_DAYS = 30;

/** An application's public reference, such as `APP-7K2Q9M`, quoted in emails and on the confirmation. */
export const APPLICATION_REFERENCE_PATTERN = /^APP-[A-Z0-9]{6}$/;

/** Starting an application. Answers are optional because Begin comes before any question. */
export const draftCreateSchema = z.object({
  answers: formAnswersSchema.optional(),
});
export type DraftCreateInput = z.infer<typeof draftCreateSchema>;

/**
 * An autosave: the full set of answers so far, replacing what was stored, and
 * the step the applicant is on so a resumed draft opens in the same place.
 */
export const draftSaveSchema = z.object({
  answers: formAnswersSchema,
  currentStepId: stableIdSchema.optional(),
});
export type DraftSaveInput = z.infer<typeof draftSaveSchema>;

/**
 * Submitting. Answers may be sent with the submission, which is how a form
 * without drafts works; otherwise the saved draft is submitted as it stands.
 */
export const draftSubmitSchema = z.object({
  answers: formAnswersSchema.optional(),
});
export type DraftSubmitInput = z.infer<typeof draftSubmitSchema>;

/** "Email me a link to finish later". */
export const resumeLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter an email address we can send the link to')
    .max(200),
});
export type ResumeLinkInput = z.infer<typeof resumeLinkSchema>;

/**
 * Asking to upload a file for one question. The API checks the name and size
 * against that question before signing anything.
 */
export const uploadSignSchema = z.object({
  fieldId: stableIdSchema,
  filename: z.string().trim().min(1).max(200),
  bytes: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_MB * 1024 * 1024, `Files can be up to ${MAX_FILE_MB} MB`),
});
export type UploadSignInput = z.infer<typeof uploadSignSchema>;

/** Moving an application along, with an optional note for the history. */
export const applicationStatusChangeSchema = z.object({
  status: z.enum(REVIEWABLE_APPLICATION_STATUSES),
  note: optionalTextField(1000),
});
export type ApplicationStatusChangeInput = z.infer<typeof applicationStatusChangeSchema>;

/** An internal review. Never shown to the applicant. */
export const applicationReviewInputSchema = z.object({
  notes: z.string().trim().min(1).max(5000),
  recommendation: z.enum(APPLICATION_RECOMMENDATIONS).optional(),
  score: z.number().int().min(1).max(5).optional(),
});
export type ApplicationReviewInput = z.infer<typeof applicationReviewInputSchema>;

export const APPLICATION_SORTS = ['submitted', 'updated'] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

/**
 * `GET /api/admin/applications`. Drafts are never listed. `q` matches the
 * applicant's name, email or the reference; `from` and `to` are calendar days
 * of submission, both inclusive. `statuses` takes a comma list, for the review
 * queue's "new and in review"; `status`, when given, wins over it.
 */
export const applicationListQuerySchema = paginationQuerySchema.extend({
  formId: objectIdSchema.optional(),
  status: z.enum(REVIEWABLE_APPLICATION_STATUSES).optional(),
  statuses: commaList(
    z.enum(REVIEWABLE_APPLICATION_STATUSES),
    REVIEWABLE_APPLICATION_STATUSES.length,
  ).optional(),
  q: optionalTextField(120),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  sort: z.enum(APPLICATION_SORTS).default('submitted'),
  order: z.enum(SORT_ORDERS).default('desc'),
});
export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

/**
 * `GET /api/admin/applications/counts`: how many applications sit in each
 * status. With no filters, every application (the sidebar badge); with the
 * list's form, search and dates, the same applications the list shows, so the
 * status tabs never disagree with the list beside them.
 */
export const applicationCountsQuerySchema = z.object({
  formId: objectIdSchema.optional(),
  q: optionalTextField(120),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});
export type ApplicationCountsQuery = z.infer<typeof applicationCountsQuerySchema>;

/** `GET /api/admin/applications/export`: every submitted application to one form, as CSV. */
export const applicationExportQuerySchema = z.object({
  formId: objectIdSchema,
});
export type ApplicationExportQuery = z.infer<typeof applicationExportQuerySchema>;

/** Who applied, as read from the questions mapped to name, email and phone. */
export interface ApplicantIdentity {
  name?: string;
  email?: string;
  phone?: string;
}

/** A draft as the applicant's own browser sees it. Nothing internal, ever. */
export interface ApplicantDraft {
  formSlug: string;
  /** The version the answers were last saved against. */
  formVersion: number;
  status: ApplicationStatus;
  answers: FormAnswer[];
  currentStepId?: string;
  updatedAt: string;
  expiresAt?: string;
}

/**
 * A new draft and the token that reaches it. The token is shown once; only
 * its hash is stored, so a lost token cannot be recovered, only replaced
 * through a resume link.
 */
export interface DraftSession {
  token: string;
  draft: ApplicantDraft;
}

/** What the applicant sees once they have submitted. */
export interface SubmissionReceipt {
  reference: string;
  submittedAt: string;
  successMessage?: string;
}

/**
 * Everything the browser needs to upload one file straight to Cloudinary.
 * `publicId` and `folder` are chosen by the server, so a file can only land in
 * this draft's own folder.
 */
export interface SignedApplicationUpload {
  uploadUrl: string;
  /** Form fields to post with the file, signature included. */
  fields: Record<string, string>;
  publicId: string;
  folder: string;
  maxBytes: number;
  allowedFormats: string[];
}

/** One reviewer's internal review. */
export interface ApplicationReview {
  id: string;
  reviewer: PersonSummary | null;
  notes: string;
  recommendation?: ApplicationRecommendation;
  score?: number;
  createdAt: string;
}

/** One step in an application's history. The submission itself is the first. */
export interface ApplicationStatusChange {
  from: ApplicationStatus;
  to: ApplicationStatus;
  note?: string;
  /** Null for the applicant's own submission, or a reviewer who has since left. */
  by: PersonSummary | null;
  at: string;
}

/** The form an application answers, named for display. */
export interface ApplicationFormRef {
  id: string;
  title: string;
  slug: string;
  type: FormType;
}

/** An application as a list row. */
export interface ApplicationListItem {
  id: string;
  reference: string;
  form: ApplicationFormRef;
  applicant: ApplicantIdentity;
  status: ApplicationStatus;
  submittedAt: string;
  reviewCount: number;
  lastRecommendation?: ApplicationRecommendation;
}

/**
 * One answer ready to show a reviewer: labelled from the version the applicant
 * answered, so renaming a question later does not rewrite what they were
 * asked. File answers carry signed, short-lived links.
 */
export interface ApplicationAnswer {
  fieldId: string;
  label: string;
  stepId?: string;
  value: AnswerValue;
}

/** An application as the review page sees it. */
export interface AdminApplication extends Timestamped {
  reference: string;
  formId: string;
  form: ApplicationFormRef;
  formVersion: number;
  /** The questions as the applicant saw them; answers follow this order. */
  definition: FormVersionSnapshot;
  applicant: ApplicantIdentity;
  answers: ApplicationAnswer[];
  status: ApplicationStatus;
  submittedAt: string;
  /** Which privacy wording they agreed to, and when. */
  consent?: { version: string; at: string };
  reviews: ApplicationReview[];
  statusHistory: ApplicationStatusChange[];
}

/**
 * `GET /api/admin/applications/export`. The CSV comes back inside JSON rather
 * than as a download, because the dashboard sends its token in a header and a
 * plain link cannot; the browser turns `csv` into a file named `filename`.
 */
export interface ApplicationExport {
  filename: string;
  csv: string;
}

/** How many applications sit in each reviewable status, for tabs and the nav badge. */
export type ApplicationCounts = Record<ReviewableApplicationStatus, number>;

import {
  APPLICATION_RECOMMENDATIONS,
  APPLICATION_STATUSES,
  type AnswerValue,
  type ApplicantIdentity,
  type ApplicationRecommendation,
  type ApplicationStatus,
} from '@iaa/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';
import { userRef } from '../../common/work-model-helpers.js';

/**
 * One person's application to a published form, from the first draft to a
 * decision (plan §2 and D8, `packages/shared/src/schemas/application.ts`).
 *
 * Named `FormSubmission` because `Submission` is already the contact and
 * volunteer inbox. Holds applicants' personal data, so it is included in
 * privacy exports and erasure, and nothing here is ever sent to the public
 * site except the applicant's own draft.
 */

/** One answer, keyed by the question's stable id. The value's shape depends on the question. */
export interface FormAnswerRecord {
  fieldId: string;
  value: AnswerValue;
}

export interface ApplicationReviewRecord {
  id: string;
  reviewerId: Types.ObjectId;
  notes: string;
  recommendation?: ApplicationRecommendation;
  score?: number;
  createdAt: Date;
}

export interface ApplicationStatusChangeRecord {
  from: ApplicationStatus;
  to: ApplicationStatus;
  note?: string;
  /** Absent for the applicant's own submission. */
  byId?: Types.ObjectId | null;
  at: Date;
}

export interface FormSubmissionDocument {
  /** `APP-XXXXXX`, given on submission. Drafts have none. */
  reference?: string;
  formId: Types.ObjectId;
  /** The version the answers were last validated against. */
  formVersion: number;
  status: ApplicationStatus;
  /**
   * Read from the mapped questions. Optional in the type because Mongoose
   * drops an empty object on save, so a draft with no name or email yet may
   * come back from a `lean()` read without it.
   */
  applicant?: ApplicantIdentity;
  answers: FormAnswerRecord[];
  currentStepId?: string;
  /**
   * SHA-256 hashes of the draft tokens that reach this draft (at most five).
   * The tokens themselves are never stored.
   */
  tokenHashes: string[];
  /** When an untouched draft is deleted; refreshed on every save. */
  draftExpiresAt?: Date | null;
  /**
   * The ids of the files this draft has been allowed to upload (the most
   * recent fifty). Cloudinary is the only other record of them, so this is
   * what says a draft's folder may hold files its answers no longer point at:
   * a replaced CV, or one refused at submission. See `draft-files.ts`.
   */
  signedUploads?: string[];
  /** Which privacy wording the applicant agreed to, and when. */
  consent?: { version: string; at: Date } | null;
  submittedAt?: Date | null;
  reviews: ApplicationReviewRecord[];
  statusHistory: ApplicationStatusChangeRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export type FormSubmissionHydrated = HydratedDocument<FormSubmissionDocument>;

const applicantSubSchema = new Schema<ApplicantIdentity>(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false },
);

const answerSubSchema = new Schema<FormAnswerRecord>(
  {
    fieldId: { type: String, required: true },
    // Text, a list of choices, a tick, a number, files or null. Checked by
    // `validateAnswers` against the form version before it is stored.
    value: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const reviewSubSchema = new Schema<ApplicationReviewRecord>(
  {
    id: { type: String, required: true },
    reviewerId: userRef({ required: true }),
    notes: { type: String, required: true },
    recommendation: { type: String, enum: APPLICATION_RECOMMENDATIONS },
    score: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const statusChangeSubSchema = new Schema<ApplicationStatusChangeRecord>(
  {
    from: { type: String, enum: APPLICATION_STATUSES, required: true },
    to: { type: String, enum: APPLICATION_STATUSES, required: true },
    note: { type: String },
    byId: userRef(),
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const consentSubSchema = new Schema(
  {
    version: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const formSubmissionSchema = new Schema<FormSubmissionDocument>(
  {
    reference: { type: String },
    formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
    formVersion: { type: Number, required: true, min: 1 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'draft' },
    applicant: { type: applicantSubSchema, default: () => ({}) },
    answers: { type: [answerSubSchema], default: [] },
    currentStepId: { type: String },
    tokenHashes: { type: [String], default: [] },
    draftExpiresAt: { type: Date },
    signedUploads: { type: [String], default: undefined },
    consent: { type: consentSubSchema },
    submittedAt: { type: Date },
    reviews: { type: [reviewSubSchema], default: [] },
    statusHistory: { type: [statusChangeSubSchema], default: [] },
  },
  { ...baseSchemaOptions, collection: 'formsubmissions' },
);

// A reference names exactly one application. Partial because drafts have no
// reference yet, and a plain unique index would allow only one missing value.
formSubmissionSchema.index(
  { reference: 1 },
  { unique: true, partialFilterExpression: { reference: { $type: 'string' } } },
);
// A form's applications in one status, newest first; also the submission
// counts. The lists break ties on submission time by `_id`, so `_id` ends the
// key: without it MongoDB cannot read the order from the index and sorts every
// match in memory before returning a page. Also serves the CSV export, read
// backwards for oldest first.
formSubmissionSchema.index({ formId: 1, status: 1, submittedAt: -1, _id: -1 });
// The review queue and status tabs across every form, newest first, with the
// same `_id` tie-break.
formSubmissionSchema.index({ status: 1, submittedAt: -1, _id: -1 });
// Privacy export and erasure find an applicant's records by email.
formSubmissionSchema.index({ 'applicant.email': 1 });
// A draft is reached by the hash of its token (multikey).
formSubmissionSchema.index({ tokenHashes: 1 });
// A backstop for drafts left untouched past their expiry. The hourly sweep
// (`draft-files.ts`, run by POST /api/automations/run) deletes them first,
// with their uploaded files; MongoDB's TTL monitor would delete only the
// record and strand the files. A week's grace leaves the sweep time to catch
// up after a quiet spell. Partial on status so a submitted application is
// never removed, whatever its old expiry says.
export const DRAFT_TTL_GRACE_SECONDS = 7 * 86_400;
formSubmissionSchema.index(
  { draftExpiresAt: 1 },
  {
    expireAfterSeconds: DRAFT_TTL_GRACE_SECONDS,
    partialFilterExpression: { status: 'draft' },
  },
);

export const FormSubmissionModel = model<FormSubmissionDocument>(
  'FormSubmission',
  formSubmissionSchema,
);

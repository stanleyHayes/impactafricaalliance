import {
  APPLICANT_MAPPINGS,
  FILE_KINDS,
  FORM_FIELD_TYPES,
  FORM_STATUSES,
  FORM_TYPES,
  VISIBILITY_MATCHES,
  VISIBILITY_OPERATORS,
  type FormField,
  type FormIntro,
  type FormSettings,
  type FormStatus,
  type FormStep,
  type FormType,
} from '@iaa/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../common/model-helpers.js';
import { userRef } from '../../common/work-model-helpers.js';

/**
 * The form data contract (plan §2, `packages/shared/src/schemas/form.ts`).
 *
 * Steps and questions are embedded with stable string ids, never Mongo ids:
 * answers are stored against those ids, and a published form's questions are
 * copied whole into `FormVersion` snapshots.
 */

/** Settings as stored: the schedule as Dates rather than ISO text. */
export interface FormSettingsRecord extends Omit<FormSettings, 'opensAt' | 'closesAt'> {
  opensAt?: Date | null;
  closesAt?: Date | null;
}

export interface FormDocument {
  title: string;
  slug: string;
  type: FormType;
  /** Internal note for the team; never shown to applicants. */
  description?: string;
  status: FormStatus;
  intro?: FormIntro | null;
  settings: FormSettingsRecord;
  steps: FormStep[];
  /** Raised when a published form's questions change (plan D14). */
  version: number;
  publishedAt?: Date | null;
  closedAt?: Date | null;
  archivedAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FormHydrated = HydratedDocument<FormDocument>;

const visibilityRuleSubSchema = new Schema(
  {
    fieldId: { type: String, required: true },
    operator: { type: String, enum: VISIBILITY_OPERATORS, required: true },
    value: { type: String },
  },
  { _id: false },
);

const visibilitySubSchema = new Schema(
  {
    match: { type: String, enum: VISIBILITY_MATCHES, required: true },
    rules: { type: [visibilityRuleSubSchema], default: [] },
  },
  { _id: false },
);

const optionSubSchema = new Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

// No defaults inside: an unset limit stays unset, as in the shared schema.
const fieldValidationSubSchema = new Schema(
  {
    minLength: { type: Number },
    maxLength: { type: Number },
    min: { type: Number },
    max: { type: Number },
    maxFiles: { type: Number },
    fileKinds: { type: [{ type: String, enum: FILE_KINDS }], default: undefined },
    maxSizeMB: { type: Number },
  },
  { _id: false },
);

const fieldSubSchema = new Schema<FormField>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: FORM_FIELD_TYPES, required: true },
    label: { type: String, required: true },
    helpText: { type: String },
    placeholder: { type: String },
    required: { type: Boolean, default: false },
    options: { type: [optionSubSchema], default: [] },
    validation: { type: fieldValidationSubSchema },
    visibility: { type: visibilitySubSchema },
    consentText: { type: String },
    // Null clears a mapping; Mongoose's enum check lets null through.
    mapsTo: { type: String, enum: APPLICANT_MAPPINGS },
  },
  { _id: false },
);

/** One screen of a form. Shared with `FormVersion`, which snapshots the same shape. */
export const formStepSubSchema = new Schema<FormStep>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    image: { type: mediaSubSchema },
    visibility: { type: visibilitySubSchema },
    fields: { type: [fieldSubSchema], default: [] },
  },
  { _id: false },
);

/** The cover slide. Shared with `FormVersion`. */
export const formIntroSubSchema = new Schema<FormIntro>(
  {
    heading: { type: String, required: true },
    description: { type: String },
    image: { type: mediaSubSchema },
  },
  { _id: false },
);

const settingsSubSchema = new Schema<FormSettingsRecord>(
  {
    opensAt: { type: Date },
    closesAt: { type: Date },
    allowDrafts: { type: Boolean, default: true },
    successMessage: { type: String },
    submissionLimit: { type: Number },
    notifyEmails: { type: [String], default: undefined },
    acknowledgeApplicant: { type: Boolean },
  },
  { _id: false },
);

const formSchema = new Schema<FormDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    type: { type: String, enum: FORM_TYPES, default: 'general' },
    description: { type: String },
    status: { type: String, enum: FORM_STATUSES, default: 'draft' },
    intro: { type: formIntroSubSchema },
    settings: { type: settingsSubSchema, default: () => ({ allowDrafts: true }) },
    steps: { type: [formStepSubSchema], default: [] },
    // Starts at 1; publishing snapshots the current version (plan D14).
    version: { type: Number, default: 1, min: 1 },
    publishedAt: { type: Date },
    closedAt: { type: Date },
    archivedAt: { type: Date },
    createdBy: userRef(),
    updatedBy: userRef(),
  },
  { ...baseSchemaOptions, collection: 'forms' },
);

// The public page finds a form by slug, and a clash on save is reported as a 409.
formSchema.index({ slug: 1 }, { unique: true });
// The forms list: one status, most recently changed first.
formSchema.index({ status: 1, updatedAt: -1 });

export const FormModel = model<FormDocument>('Form', formSchema);

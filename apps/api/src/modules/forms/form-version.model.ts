import type { FormIntro, FormStep } from '@iaa/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';
import { userRef } from '../../common/work-model-helpers.js';

import { formIntroSubSchema, formStepSubSchema } from './form.model.js';

/**
 * A form's questions exactly as they were at one version (plan D14).
 *
 * Written when a form is published, and again whenever a published form's
 * introduction or questions change. A submission records the version it was
 * checked against, so a reviewer always sees the labels and order the
 * applicant saw, however the form has been edited since. Never updated in
 * place.
 */
export interface FormVersionDocument {
  formId: Types.ObjectId;
  version: number;
  title: string;
  intro?: FormIntro | null;
  steps: FormStep[];
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FormVersionHydrated = HydratedDocument<FormVersionDocument>;

const formVersionSchema = new Schema<FormVersionDocument>(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
    version: { type: Number, required: true, min: 1 },
    title: { type: String, required: true },
    intro: { type: formIntroSubSchema },
    steps: { type: [formStepSubSchema], default: [] },
    createdBy: userRef(),
  },
  { ...baseSchemaOptions, collection: 'formversions' },
);

// One snapshot per version of a form; also how a submission's version is read back.
formVersionSchema.index({ formId: 1, version: 1 }, { unique: true });

export const FormVersionModel = model<FormVersionDocument>('FormVersion', formVersionSchema);

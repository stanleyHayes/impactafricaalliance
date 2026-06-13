import { CONTENT_STATUSES, ContentStatus, JOB_TYPES, type JobType } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../../common/model-helpers.js';

export interface JobDocument {
  title: string;
  slug: string;
  location: string;
  type: JobType;
  description: string;
  applyUrl?: string;
  deadline?: Date;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<JobDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    location: { type: String, required: true, trim: true },
    type: { type: String, enum: JOB_TYPES, required: true },
    description: { type: String, required: true },
    applyUrl: { type: String },
    deadline: { type: Date },
    status: { type: String, enum: CONTENT_STATUSES, default: ContentStatus.Draft, index: true },
  },
  baseSchemaOptions,
);

export const JobModel = model<JobDocument>('Job', jobSchema);

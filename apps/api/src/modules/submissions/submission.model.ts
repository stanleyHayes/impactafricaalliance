import {
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
  SubmissionStatus,
  type SubmissionType,
} from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface SubmissionDocument {
  type: SubmissionType;
  status: SubmissionStatus;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<SubmissionDocument>(
  {
    type: { type: String, enum: SUBMISSION_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: SUBMISSION_STATUSES,
      default: SubmissionStatus.New,
      index: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  baseSchemaOptions,
);

export const SubmissionModel = model<SubmissionDocument>('Submission', submissionSchema);

export interface SubscriberDocument {
  email: string;
  name?: string;
  source?: string;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new Schema<SubscriberDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String },
    source: { type: String },
    unsubscribedAt: { type: Date },
  },
  baseSchemaOptions,
);

export const SubscriberModel = model<SubscriberDocument>('Subscriber', subscriberSchema);

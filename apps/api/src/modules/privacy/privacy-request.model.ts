import { randomBytes } from 'crypto';

import {
  PRIVACY_REQUEST_STATUSES,
  PRIVACY_REQUEST_TYPES,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface PrivacyRequestDocument {
  id: string;
  email: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  details?: string;
  verificationToken: string;
  fulfilledAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const privacyRequestSchema = new Schema<PrivacyRequestDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    type: { type: String, enum: PRIVACY_REQUEST_TYPES, required: true },
    status: {
      type: String,
      enum: PRIVACY_REQUEST_STATUSES,
      default: 'pending',
      index: true,
    },
    details: { type: String, required: false },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
      default: () => randomBytes(32).toString('hex'),
    },
    fulfilledAt: { type: Date, required: false },
    notes: { type: String, required: false },
  },
  baseSchemaOptions,
);

export const PrivacyRequestModel = model<PrivacyRequestDocument>(
  'PrivacyRequest',
  privacyRequestSchema,
);

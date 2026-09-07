import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export const ATTEMPT_RESULTS = ['succeeded', 'failed'] as const;
export type AttemptResult = (typeof ATTEMPT_RESULTS)[number];

/**
 * The audit trail for one try at publishing.
 *
 * Deliberately holds only a sanitised error: the build spec forbids persisting
 * secrets, authorization headers or access tokens in publication logs, and a
 * provider's raw error body is exactly where those leak.
 */
export interface PublicationAttemptDocument {
  publicationId: string;
  attemptNumber: number;
  startedAt: Date;
  completedAt?: Date;
  result: AttemptResult;
  providerHttpStatus?: number;
  providerErrorCode?: string;
  sanitizedError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const publicationAttemptSchema = new Schema<PublicationAttemptDocument>(
  {
    publicationId: { type: String, required: true, index: true },
    attemptNumber: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    result: { type: String, enum: ATTEMPT_RESULTS, required: true },
    providerHttpStatus: { type: Number },
    providerErrorCode: { type: String },
    sanitizedError: { type: String },
  },
  baseSchemaOptions,
);

export const PublicationAttemptModel = model<PublicationAttemptDocument>(
  'PublicationAttempt',
  publicationAttemptSchema,
);

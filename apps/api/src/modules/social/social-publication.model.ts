import {
  SOCIAL_DESTINATIONS,
  SOCIAL_PUBLICATION_STATUSES,
  type SocialDestination,
  type SocialPublicationStatus,
} from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

/**
 * One destination's copy of a publication, tracked on its own.
 *
 * Per the build spec: a failure on Instagram must not roll back a successful
 * Facebook or LinkedIn post, so each destination gets its own row, its own
 * status and its own retry count rather than a single result for the article.
 */
export interface SocialPublicationDocument {
  articleId?: string;
  connectionId: string;
  destination: SocialDestination;
  status: SocialPublicationStatus;
  caption: string;
  imageUrl?: string;
  canonicalUrl?: string;
  scheduledFor?: Date;
  publishedAt?: Date;
  externalPostId?: string;
  externalPostUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  /** When the worker may next pick this up; carries the backoff. */
  nextAttemptAt?: Date;
  /** Held by the worker currently running it, so two workers cannot double-post. */
  lockedAt?: Date;
  /**
   * Article + connection + destination + intent. Unique, so a retried request
   * re-uses the existing row instead of creating a second post.
   */
  idempotencyKey: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const socialPublicationSchema = new Schema<SocialPublicationDocument>(
  {
    articleId: { type: String, index: true },
    connectionId: { type: String, required: true, index: true },
    destination: { type: String, enum: SOCIAL_DESTINATIONS, required: true },
    status: {
      type: String,
      enum: SOCIAL_PUBLICATION_STATUSES,
      default: 'draft',
      required: true,
      index: true,
    },
    caption: { type: String, required: true },
    imageUrl: { type: String },
    canonicalUrl: { type: String },
    scheduledFor: { type: Date },
    publishedAt: { type: Date },
    externalPostId: { type: String },
    externalPostUrl: { type: String },
    errorCode: { type: String },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
    nextAttemptAt: { type: Date },
    lockedAt: { type: Date },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    createdBy: { type: String },
  },
  baseSchemaOptions,
);

// How the worker finds its next piece of work.
socialPublicationSchema.index({ status: 1, nextAttemptAt: 1 });

export const SocialPublicationModel = model<SocialPublicationDocument>(
  'SocialPublication',
  socialPublicationSchema,
);

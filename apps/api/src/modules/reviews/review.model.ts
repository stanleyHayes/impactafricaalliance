import { REVIEW_STATUSES, REVIEW_SUBJECTS, type ReviewStatus, type ReviewSubject } from '@iaa/shared';
import { Schema, model, type Types } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface ReviewDocument {
  id: string;
  subject: ReviewSubject;
  /** Set for event reviews, absent for reviews of the organisation. */
  eventId?: Types.ObjectId;
  rating: number;
  comment?: string;
  displayName: string;
  role?: string;
  email: string;
  /**
   * How we know the person is real: a registration they held, or an address
   * they confirmed. Stored because it decides whether the review can claim
   * they attended.
   */
  verifiedVia: 'registration' | 'email';
  /** Set once an organisation reviewer clicks the link; event reviews are born verified. */
  verifiedAt?: Date;
  /** Only for organisation reviews, and cleared the moment it is used. */
  verificationToken?: string;
  status: ReviewStatus;
  rejectionReason?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    subject: { type: String, enum: REVIEW_SUBJECTS, required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: false, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: false, trim: true },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, required: false, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    verifiedVia: { type: String, enum: ['registration', 'email'], required: true },
    verifiedAt: { type: Date, required: false },
    verificationToken: { type: String, required: false, index: true, sparse: true },
    status: { type: String, enum: REVIEW_STATUSES, default: 'pending', index: true },
    rejectionReason: { type: String, required: false, trim: true },
    publishedAt: { type: Date, required: false },
  },
  baseSchemaOptions,
);

// One review per person per event, and one per person about the organisation.
// Submitting again edits what they said rather than stacking another opinion
// on the pile — partial so the two rules cannot collide with each other.
reviewSchema.index(
  { eventId: 1, email: 1 },
  { unique: true, partialFilterExpression: { subject: 'event' } },
);
reviewSchema.index(
  { subject: 1, email: 1 },
  { unique: true, partialFilterExpression: { subject: 'organisation' } },
);

// The moderation queue and the public lists are both "this status, newest first".
reviewSchema.index({ status: 1, createdAt: -1 });

export const ReviewModel = model<ReviewDocument>('Review', reviewSchema);

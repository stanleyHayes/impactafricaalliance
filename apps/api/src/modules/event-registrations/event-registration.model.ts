import type { EventAnswer } from '@iaa/shared';
import type { Types} from 'mongoose';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface EventRegistrationDocument {
  eventId: Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  ageRange?: string;
  gender?: string;
  describesYou?: string;
  educationLevel?: string;
  field?: string;
  answers: EventAnswer[];
  consent: boolean;
  consentedAt?: Date;
  /**
   * Stamped once this person has been asked to review the event, so a run
   * interrupted half way through a room resumes rather than starting again.
   */
  reviewInvitedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const answerSubSchema = new Schema<EventAnswer>(
  {
    questionId: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const eventRegistrationSchema = new Schema<EventRegistrationDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    country: { type: String },
    city: { type: String },
    ageRange: { type: String },
    gender: { type: String },
    describesYou: { type: String },
    educationLevel: { type: String },
    field: { type: String },
    answers: { type: [answerSubSchema], default: [] },
    consent: { type: Boolean, required: true },
    consentedAt: { type: Date },
    reviewInvitedAt: { type: Date },
  },
  baseSchemaOptions,
);

// One registration per email per event — re-submitting is treated as idempotent
// rather than as an error, so a visitor who registers twice is not punished.
eventRegistrationSchema.index({ eventId: 1, email: 1 }, { unique: true });

export const EventRegistrationModel = model<EventRegistrationDocument>(
  'EventRegistration',
  eventRegistrationSchema,
);

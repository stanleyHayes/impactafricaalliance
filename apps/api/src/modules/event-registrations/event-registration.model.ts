import type { EventAnswer } from '@iaa/shared';
import type { Types} from 'mongoose';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface EventRegistrationDocument {
  eventId: Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  occupation?: string;
  organisation?: string;
  country?: string;
  answers: EventAnswer[];
  consent: boolean;
  consentedAt?: Date;
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
    dateOfBirth: { type: String },
    occupation: { type: String },
    organisation: { type: String },
    country: { type: String },
    answers: { type: [answerSubSchema], default: [] },
    consent: { type: Boolean, required: true },
    consentedAt: { type: Date },
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

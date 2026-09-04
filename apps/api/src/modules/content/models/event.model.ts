import {
  CONTENT_STATUSES,
  EVENT_QUESTION_TYPES,
  EVENT_TYPES,
  type ContentStatus,
  type EventQuestion,
  type EventType,
  type MediaAsset,
} from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface EventDocument {
  title: string;
  description: string;
  startAt: Date;
  endAt?: Date;
  location: string;
  type: EventType;
  status: ContentStatus;
  image?: MediaAsset;
  host?: string;
  hostTitle?: string;
  admission?: string;
  registrationEnabled: boolean;
  capacity?: number;
  registrationClosesAt?: Date;
  questions: EventQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const questionSubSchema = new Schema<EventQuestion>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: EVENT_QUESTION_TYPES, required: true },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
    helpText: { type: String },
  },
  { _id: false },
);

const eventSchema = new Schema<EventDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: false },
    location: { type: String, required: true, trim: true },
    type: { type: String, enum: EVENT_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: CONTENT_STATUSES,
      default: 'draft',
      index: true,
    },
    image: { type: mediaSubSchema, required: false },
    host: { type: String },
    hostTitle: { type: String },
    admission: { type: String },
    registrationEnabled: { type: Boolean, default: false },
    capacity: { type: Number },
    registrationClosesAt: { type: Date },
    questions: { type: [questionSubSchema], default: [] },
  },
  baseSchemaOptions,
);

export const EventModel = model<EventDocument>('Event', eventSchema);

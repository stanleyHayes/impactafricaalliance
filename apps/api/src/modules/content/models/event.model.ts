import {
  CONTENT_STATUSES,
  EVENT_TYPES,
  type ContentStatus,
  type EventType,
} from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../../common/model-helpers.js';

export interface EventDocument {
  title: string;
  description: string;
  startAt: Date;
  endAt?: Date;
  location: string;
  type: EventType;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  baseSchemaOptions,
);

export const EventModel = model<EventDocument>('Event', eventSchema);

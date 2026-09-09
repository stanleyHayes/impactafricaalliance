import {
  EVENT_MESSAGE_KINDS,
  EVENT_MESSAGE_STATUSES,
  type EventMessageKind,
  type EventMessageStatus,
} from '@iaa/shared';
import { Schema, model, type Types } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface EventMessageDocument {
  id: string;
  eventId: Types.ObjectId;
  kind: EventMessageKind;
  subject: string;
  body: string;
  includeMeetingLink: boolean;
  status: EventMessageStatus;
  recipientCount: number;
  failedCount: number;
  sentBy?: string;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventMessageSchema = new Schema<EventMessageDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    kind: { type: String, enum: EVENT_MESSAGE_KINDS, required: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    includeMeetingLink: { type: Boolean, default: false },
    status: { type: String, enum: EVENT_MESSAGE_STATUSES, default: 'sending' },
    recipientCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    sentBy: { type: String },
    sentAt: { type: Date, required: true },
  },
  baseSchemaOptions,
);

// The log is always read as "what went out for this event, newest first".
eventMessageSchema.index({ eventId: 1, sentAt: -1 });

export const EventMessageModel = model<EventMessageDocument>('EventMessage', eventMessageSchema);

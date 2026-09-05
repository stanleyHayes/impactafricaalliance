import { z } from 'zod';

import {
  CONTENT_STATUSES,
  EVENT_QUESTION_TYPES,
  EVENT_TYPES,
  type ContentStatus,
  type EventQuestionType,
  type EventType,
} from '../enums.js';

import { mediaAssetSchema, type MediaAsset, type Timestamped } from './common.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);
const eventTypeEnum = z.enum(EVENT_TYPES as [EventType, ...EventType[]]);
const questionTypeEnum = z.enum(
  EVENT_QUESTION_TYPES as [EventQuestionType, ...EventQuestionType[]],
);

const optionalText = z
  .string()
  .max(300)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/**
 * One question on an event's own questionnaire. Every event inherits the core
 * audience questions; these are the extra, event-specific ones an editor adds.
 */
export const eventQuestionSchema = z.object({
  /** Stable key answers are stored against, so renaming a label keeps history. */
  id: z.string().min(1).max(60),
  label: z.string().min(2).max(300).trim(),
  type: questionTypeEnum,
  /** Choices for single-choice and multi-choice; ignored for other types. */
  options: z.array(z.string().min(1).max(200)).max(30).default([]),
  required: z.boolean().default(false),
  // .optional() last so the inferred key is optional, not required-and-undefined.
  helpText: z
    .string()
    .max(300)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});
export type EventQuestion = z.infer<typeof eventQuestionSchema>;

export const eventInputSchema = z.object({
  title: z.string().min(3).max(180).trim(),
  description: z.string().min(10).max(4000).trim(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  location: z.string().min(2).max(200).trim(),
  type: eventTypeEnum,
  status: statusEnum.default('draft'),
  image: mediaAssetSchema.optional(),
  /** Speaker or facilitator, shown on the event card. */
  host: optionalText,
  hostTitle: optionalText,
  admission: optionalText,
  registrationEnabled: z.boolean().default(false),
  /** Zero or absent means unlimited. */
  capacity: z.number().int().min(0).optional(),
  registrationClosesAt: z.string().datetime().optional(),
  questions: z.array(eventQuestionSchema).max(40).default([]),
});
export type EventInput = z.infer<typeof eventInputSchema>;

/** Explicit null clears optional fields on PATCH; omission preserves their current value. */
export const eventUpdateSchema = eventInputSchema.partial().extend({
  status: statusEnum.optional(),
  registrationEnabled: z.boolean().optional(),
  questions: z.array(eventQuestionSchema).max(40).optional(),
  image: mediaAssetSchema.nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  host: optionalText.nullable(),
  hostTitle: optionalText.nullable(),
  admission: optionalText.nullable(),
  capacity: z.number().int().min(0).nullable().optional(),
  registrationClosesAt: z.string().datetime().nullable().optional(),
});
export type EventUpdate = z.infer<typeof eventUpdateSchema>;

export interface Event extends Timestamped {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt?: string;
  location: string;
  type: EventType;
  status: ContentStatus;
  image?: MediaAsset;
  host?: string;
  hostTitle?: string;
  admission?: string;
  registrationEnabled: boolean;
  capacity?: number;
  registrationClosesAt?: string;
  questions: EventQuestion[];
}

/** True when the event is still accepting registrations at `now`. */
export const isRegistrationOpen = (event: Event, now: Date): boolean => {
  if (!event.registrationEnabled) {
    return false;
  }
  const closesAt = event.registrationClosesAt ?? event.startAt;
  return new Date(closesAt).getTime() > now.getTime();
};

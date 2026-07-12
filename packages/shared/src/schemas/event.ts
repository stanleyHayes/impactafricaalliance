import { z } from 'zod';

import { CONTENT_STATUSES, EVENT_TYPES, type ContentStatus, type EventType } from '../enums.js';

import type { Timestamped } from './common.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);
const eventTypeEnum = z.enum(EVENT_TYPES as [EventType, ...EventType[]]);

export const eventInputSchema = z.object({
  title: z.string().min(3).max(180).trim(),
  description: z.string().min(10).max(4000).trim(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  location: z.string().min(2).max(200).trim(),
  type: eventTypeEnum,
  status: statusEnum.default('draft'),
});
export type EventInput = z.infer<typeof eventInputSchema>;

export const eventUpdateSchema = eventInputSchema.partial();
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
}

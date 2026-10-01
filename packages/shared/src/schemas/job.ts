import { z } from 'zod';

import { CONTENT_STATUSES, JOB_TYPES, type ContentStatus, type JobType } from '../enums.js';

import { clearableDate, slugSchema, type Timestamped } from './common.js';
import { partialForUpdate } from './update.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);
const jobTypeEnum = z.enum(JOB_TYPES as [JobType, ...JobType[]]);

/** The admin form submits '' for an emptied link; that means "none", not an invalid URL. */
const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const jobInputSchema = z.object({
  title: z.string().min(3).max(180).trim(),
  slug: slugSchema,
  location: z.string().min(2).max(120).trim(),
  type: jobTypeEnum,
  description: z.string().min(20),
  applyUrl: optionalUrl,
  deadline: clearableDate,
  status: statusEnum.default('draft'),
});
export type JobInput = z.infer<typeof jobInputSchema>;

export const jobUpdateSchema = partialForUpdate(jobInputSchema);
export type JobUpdate = z.infer<typeof jobUpdateSchema>;

export interface Job extends Timestamped {
  title: string;
  slug: string;
  location: string;
  type: JobType;
  description: string;
  applyUrl?: string;
  deadline?: string;
  status: ContentStatus;
}

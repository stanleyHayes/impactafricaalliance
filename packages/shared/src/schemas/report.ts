import { z } from 'zod';

import { CONTENT_STATUSES, type ContentStatus } from '../enums.js';

import { mediaAssetSchema, type Timestamped, type MediaAsset } from './common.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);
const currentYear = new Date().getUTCFullYear();

export const reportInputSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(600).trim().optional(),
  year: z
    .number()
    .int()
    .min(2000)
    .max(currentYear + 5),
  file: mediaAssetSchema,
  status: statusEnum.default('draft'),
  order: z.number().int().min(0).default(0),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const reportUpdateSchema = reportInputSchema.partial();
export type ReportUpdate = z.infer<typeof reportUpdateSchema>;

export interface Report extends Timestamped {
  title: string;
  description?: string;
  year: number;
  file: MediaAsset;
  status: ContentStatus;
  order: number;
}

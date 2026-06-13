import { z } from 'zod';

import { CONTENT_STATUSES, type ContentStatus } from '../enums.js';

import { mediaAssetSchema, slugSchema, type Timestamped, type MediaAsset } from './common.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);

export const storyInputSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  slug: slugSchema,
  country: z.string().min(2).max(80).trim(),
  program: z.string().min(2).max(120).trim(),
  quote: z.string().min(10).max(400).trim(),
  narrative: z.string().min(20),
  photo: mediaAssetSchema.optional(),
  featured: z.boolean().default(false),
  status: statusEnum.default('draft'),
  order: z.number().int().min(0).default(0),
});
export type StoryInput = z.infer<typeof storyInputSchema>;

export const storyUpdateSchema = storyInputSchema.partial();
export type StoryUpdate = z.infer<typeof storyUpdateSchema>;

export interface Story extends Timestamped {
  name: string;
  slug: string;
  country: string;
  program: string;
  quote: string;
  narrative: string;
  photo?: MediaAsset;
  featured: boolean;
  status: ContentStatus;
  order: number;
}

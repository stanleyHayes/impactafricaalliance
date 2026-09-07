import { z } from 'zod';

import { CONTENT_STATUSES, type ContentStatus } from '../enums.js';

import { mediaAssetSchema, slugSchema, type Timestamped, type MediaAsset } from './common.js';
import { partialForUpdate } from './update.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);

export const articleInputSchema = z.object({
  title: z.string().min(3).max(180).trim(),
  slug: slugSchema,
  excerpt: z.string().min(10).max(400).trim(),
  body: z.string().min(20),
  coverImage: mediaAssetSchema.optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  status: statusEnum.default('draft'),
  publishedAt: z.string().datetime().optional(),
  autoPostToSocial: z.boolean().default(false),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

export const articleUpdateSchema = partialForUpdate(articleInputSchema);
export type ArticleUpdate = z.infer<typeof articleUpdateSchema>;

export interface Article extends Timestamped {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage?: MediaAsset;
  tags: string[];
  status: ContentStatus;
  publishedAt?: string;
  autoPostToSocial: boolean;
}

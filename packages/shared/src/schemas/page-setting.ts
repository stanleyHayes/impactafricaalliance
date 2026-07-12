import { z } from 'zod';

import { CONTENT_STATUSES, type ContentStatus } from '../enums.js';

import { mediaAssetSchema, type MediaAsset, type Timestamped } from './common.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);

export const PAGE_KEYS = [
  'home',
  'about',
  'our-work',
  'impact',
  'get-involved',
  'contact',
  'news',
] as const;

export const pageKeySchema = z.enum(PAGE_KEYS);

export const pageSettingInputSchema = z.object({
  pageKey: pageKeySchema,
  heroImage: mediaAssetSchema.optional(),
  status: statusEnum.default('draft'),
});

export const pageSettingUpdateSchema = pageSettingInputSchema.partial();

export type PageSettingInput = z.infer<typeof pageSettingInputSchema>;
export type PageSettingUpdate = z.infer<typeof pageSettingUpdateSchema>;

export interface PageSetting extends Timestamped {
  pageKey: (typeof PAGE_KEYS)[number];
  heroImage?: MediaAsset;
  status: ContentStatus;
}

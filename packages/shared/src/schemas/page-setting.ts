import { z } from 'zod';

import { CONTENT_STATUSES, type ContentStatus } from '../enums.js';

import { mediaAssetSchema, type MediaAsset, type Timestamped } from './common.js';
import { partialForUpdate } from './update.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);

export const PAGE_KEYS = [
  'home',
  'about',
  'our-work',
  'impact',
  'get-involved',
  'contact',
  'news',
  'resources',
  'events',
  'privacy-policy',
  'cookie-policy',
  'terms-of-use',
  'privacy-request',
] as const;

export const pageKeySchema = z.enum(PAGE_KEYS);

const optionalCopy = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const optionalUrl = z.string().trim().url().optional().or(z.literal(''));

export const pageSettingInputSchema = z.object({
  pageKey: pageKeySchema,
  heroImage: mediaAssetSchema.optional(),
  seoTitle: optionalCopy(100),
  seoDescription: optionalCopy(180),
  heroEyebrow: optionalCopy(80),
  heroTitle: optionalCopy(140),
  heroSubtitle: optionalCopy(320),
  introEyebrow: optionalCopy(80),
  introTitle: optionalCopy(160),
  introBody: optionalCopy(2000),
  bodyContent: optionalCopy(50_000),
  ctaTitle: optionalCopy(160),
  ctaBody: optionalCopy(600),
  ctaLabel: optionalCopy(60),
  ctaUrl: optionalUrl,
  status: statusEnum.default('draft'),
});

export const pageSettingUpdateSchema = partialForUpdate(pageSettingInputSchema);

export type PageSettingInput = z.infer<typeof pageSettingInputSchema>;
export type PageSettingUpdate = z.infer<typeof pageSettingUpdateSchema>;

export interface PageSetting extends Timestamped {
  pageKey: (typeof PAGE_KEYS)[number];
  heroImage?: MediaAsset;
  seoTitle?: string;
  seoDescription?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  introEyebrow?: string;
  introTitle?: string;
  introBody?: string;
  bodyContent?: string;
  ctaTitle?: string;
  ctaBody?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  status: ContentStatus;
}

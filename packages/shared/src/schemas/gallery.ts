import { z } from 'zod';

import { CONTENT_STATUSES, type ContentStatus } from '../enums.js';

import { clearableDate, mediaAssetSchema, type MediaAsset, type Timestamped } from './common.js';
import { partialForUpdate } from './update.js';

const statusEnum = z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

/**
 * A single photograph from a programme or event, uploaded through the admin
 * dashboard. Replaces the hard-coded snapshot imagery on the Impact page so new
 * programme photography ships without a code change.
 */
export const galleryItemInputSchema = z.object({
  title: z.string().min(2).max(160).trim(),
  /** Which programme or event the shot is from, e.g. "Accra Impact Festival". */
  programme: z.string().min(2).max(160).trim(),
  caption: optionalText(400),
  location: optionalText(160),
  image: mediaAssetSchema,
  /** ISO date the photo was taken; drives newest-first ordering. */
  capturedOn: clearableDate,
  featured: z.boolean().default(false),
  status: statusEnum.default('draft'),
  order: z.number().int().min(0).default(0),
});
export type GalleryItemInput = z.infer<typeof galleryItemInputSchema>;

export const galleryItemUpdateSchema = partialForUpdate(galleryItemInputSchema);
export type GalleryItemUpdate = z.infer<typeof galleryItemUpdateSchema>;

export interface GalleryItem extends Timestamped {
  title: string;
  programme: string;
  caption?: string;
  location?: string;
  image: MediaAsset;
  capturedOn?: string;
  featured: boolean;
  status: ContentStatus;
  order: number;
}

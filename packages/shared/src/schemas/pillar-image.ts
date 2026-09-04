import { z } from 'zod';

import { mediaAssetSchema, type MediaAsset, type Timestamped } from './common.js';

/**
 * A CMS-uploaded photograph for one of the four pillars.
 *
 * The pillar titles, descriptions and routes stay in code — they define the
 * site's structure and are referenced by URL. Only the imagery is editable, so
 * photography can be replaced from the dashboard without risking a broken
 * route or an orphaned page.
 */
export const pillarImageInputSchema = z.object({
  pillarKey: z.string().min(2).max(60).trim(),
  image: mediaAssetSchema,
  /** Optional override for the alt text; falls back to the pillar title. */
  alt: z
    .string()
    .max(200)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  isActive: z.boolean().default(true),
});
export type PillarImageInput = z.infer<typeof pillarImageInputSchema>;

export const pillarImageUpdateSchema = pillarImageInputSchema.partial();
export type PillarImageUpdate = z.infer<typeof pillarImageUpdateSchema>;

export interface PillarImage extends Timestamped {
  pillarKey: string;
  image: MediaAsset;
  alt?: string;
  isActive: boolean;
}

/** Index published pillar imagery by key, for merging over the static fallbacks. */
export const pillarImageMap = (items: readonly PillarImage[]): Record<string, string> =>
  Object.fromEntries(
    items.filter((item) => item.isActive && item.image?.url).map((item) => [item.pillarKey, item.image.url]),
  );

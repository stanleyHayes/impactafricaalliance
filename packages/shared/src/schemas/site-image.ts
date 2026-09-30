import { z } from 'zod';

import type { MediaAsset, Timestamped } from './common.js';
import {
  isSiteImageKey,
  SITE_IMAGE_DEFAULT_FALLBACK,
  siteImageSlot,
  type SiteImageSlot,
} from './site-image-slots.js';
import { partialForUpdate } from './update.js';
import { httpsMediaAssetSchema } from './work.js';

/**
 * A photograph the public site uses in a fixed place — a page banner, the home
 * hero, the artwork shown when a record has no picture of its own.
 *
 * These lived in code as file paths, which meant every replacement was a
 * deploy. The slot catalogue (`site-image-slots.ts`) stays in code; a record
 * here only says which picture fills one of its slots.
 */
export const siteImageInputSchema = z.object({
  // One image per slot; uploading again replaces rather than accumulates.
  // Checked against the catalogue, because a record under a key no component
  // reads is a picture that never appears, with nothing to say why.
  key: z
    .string()
    .min(2)
    .max(60)
    .trim()
    .refine(isSiteImageKey, { message: 'Choose one of the places the site shows an image.' }),
  // https only: the address is drawn as a CSS background and an `<img>` on
  // every page, where a `javascript:` or `data:` address, or a plain http one
  // the browser blocks as mixed content, would never be a picture.
  image: httpsMediaAssetSchema,
  /**
   * Overrides the picture's own description for screen readers. An empty
   * string clears it, so a description can be removed as well as changed;
   * without the null, JSON drops the key and the old text stays.
   */
  alt: z
    .string()
    .max(300)
    .trim()
    .optional()
    .transform((value) => (value === '' ? null : value)),
  isActive: z.boolean().default(true),
});
export type SiteImageInput = z.infer<typeof siteImageInputSchema>;

export const siteImageUpdateSchema = partialForUpdate(siteImageInputSchema);
export type SiteImageUpdate = z.infer<typeof siteImageUpdateSchema>;

export interface SiteImage extends Timestamped {
  id: string;
  key: string;
  image: MediaAsset;
  alt?: string | null;
  isActive: boolean;
}

/** A record that is switched on and has a picture, so the site shows it. */
const isLive = (item: SiteImage): boolean => Boolean(item.isActive && item.image?.url);

/**
 * Index the published slots by key, for merging over the built-in fallbacks.
 * Inactive rows are skipped, so hiding an upload restores the shipped image
 * rather than leaving an empty banner.
 */
export const siteImageMap = (items: readonly SiteImage[]): Record<string, string> =>
  Object.fromEntries(items.filter(isLive).map((item) => [item.key, item.image.url]));

/** Where the picture a slot shows came from. */
export type SiteImageSource = 'upload' | 'inherited' | 'default';

export interface ResolvedSiteImage {
  key: string;
  /** The address to draw: an upload, or the shipped file's site-relative path. */
  src: string;
  /** What a screen reader hears. Empty for decorative slots showing their default. */
  alt: string;
  source: SiteImageSource;
  /** The record whose picture is shown, when it came from the dashboard. */
  record?: SiteImage;
  /** The slot it was borrowed from, when `source` is `inherited`. */
  inheritedFrom?: SiteImageSlot;
}

/** An editor's description first, then the library's, then the slot's name. */
const uploadAlt = (record: SiteImage, slot: SiteImageSlot | undefined): string =>
  record.alt?.trim() || record.image.alt?.trim() || slot?.label || '';

/**
 * The picture a slot shows, and why.
 *
 * The slot's own upload wins; then the upload of the slot it inherits from;
 * then the image shipped with the build. Every chain ends at today's file, so
 * an empty dashboard, a slow API and a sleeping one all draw the same page.
 */
export const resolveSiteImage = (
  key: string,
  items: readonly SiteImage[] = [],
): ResolvedSiteImage => {
  const slot = siteImageSlot(key);
  const live = (slotKey: string): SiteImage | undefined =>
    items.find((item) => item.key === slotKey && isLive(item));

  const own = live(key);
  if (own) {
    return { key, src: own.image.url, alt: uploadAlt(own, slot), source: 'upload', record: own };
  }
  const parent = slot?.inherits ? siteImageSlot(slot.inherits) : undefined;
  const borrowed = parent ? live(parent.key) : undefined;
  if (parent && borrowed) {
    return {
      key,
      src: borrowed.image.url,
      alt: uploadAlt(borrowed, parent),
      source: 'inherited',
      record: borrowed,
      inheritedFrom: parent,
    };
  }
  return {
    key,
    src: slot?.fallback ?? SITE_IMAGE_DEFAULT_FALLBACK,
    alt: slot?.defaultAlt ?? '',
    source: 'default',
  };
};

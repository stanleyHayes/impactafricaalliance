import { z } from 'zod';

import { mediaAssetSchema, type MediaAsset, type Timestamped } from './common.js';
import { partialForUpdate } from './update.js';

/**
 * A photograph the public site uses in a fixed place — a page banner, the home
 * hero, the artwork shown when a record has no picture of its own.
 *
 * These lived in code as file paths, which meant every replacement was a
 * deploy. The slot list stays in code, because each key is read by a specific
 * component; only the photograph behind a key is editable.
 */
export interface SiteImageSlot {
  key: string;
  label: string;
  /** Where this appears, in the words an editor would use. */
  usage: string;
  /** Path on the public site where the result can be seen. */
  previewPath: string;
  /** Shape the site crops to, so the preview shows the real framing. */
  aspect: string;
  /** The image shipped with the build, used until one is uploaded. */
  fallback: string;
}

export const SITE_IMAGE_SLOTS: readonly SiteImageSlot[] = [
  {
    key: 'home-hero',
    label: 'Home hero',
    usage: 'The large photograph behind the headline at the top of the home page.',
    previewPath: '/',
    aspect: '16 / 9',
    fallback: '/images/hero.webp',
  },
  {
    key: 'impact-banner',
    label: 'Our Impact banner',
    usage: 'The banner across the top of the Impact page.',
    previewPath: '/impact',
    aspect: '21 / 9',
    fallback: '/images/community.webp',
  },
  {
    key: 'community',
    label: 'Default page banner',
    usage: 'Used at the top of any page that has no banner of its own.',
    previewPath: '/news',
    aspect: '21 / 9',
    fallback: '/images/community.webp',
  },
  {
    key: 'team-artwork',
    label: 'Placeholder artwork',
    usage: 'Stands in for a team member with no portrait yet, and for events with no image.',
    previewPath: '/about#team',
    aspect: '4 / 5',
    fallback: '/images/team-alliance-artwork.webp',
  },
  {
    key: 'about-intro',
    label: 'About — Who we are',
    usage: 'The tall photograph beside the "Who we are" introduction on the About page.',
    previewPath: '/about',
    aspect: '3 / 4',
    fallback: '/images/community.webp',
  },
  {
    key: 'home-showcase-lead',
    label: 'Home — On the ground: Digital skills',
    usage: 'The tall first photograph in the "The work looks like people" band.',
    previewPath: '/',
    aspect: '4 / 5',
    fallback: '/images/home-showcase-lead-v2.webp',
  },
  {
    key: 'home-showcase-women',
    label: 'Home — On the ground: Women leading',
    usage: 'The second photograph in the "The work looks like people" band.',
    previewPath: '/',
    aspect: '16 / 9',
    fallback: '/images/home-showcase-women-v2.webp',
  },
  {
    key: 'home-showcase-work',
    label: 'Home — On the ground: Career Launchpad',
    usage: 'The third photograph in the "The work looks like people" band.',
    previewPath: '/',
    aspect: '16 / 9',
    fallback: '/images/home-showcase-work-v2.webp',
  },
  {
    key: 'home-vision-band',
    label: 'Home — Vision quote background',
    usage: 'The photograph behind the vision quote near the foot of the home page.',
    previewPath: '/',
    aspect: '21 / 9',
    fallback: '/images/program-women-empowerment.webp',
  },
  {
    key: 'get-involved-partner',
    label: 'Get Involved — Partner',
    usage: 'The tall first photograph in the "Every route in changes something" band.',
    previewPath: '/get-involved',
    aspect: '4 / 5',
    fallback: '/images/get-involved-partner-v2.webp',
  },
  {
    key: 'get-involved-mentor',
    label: 'Get Involved — Mentor',
    usage: 'The second photograph in the "Every route in changes something" band.',
    previewPath: '/get-involved',
    aspect: '16 / 9',
    fallback: '/images/get-involved-mentor-v2.webp',
  },
  {
    key: 'get-involved-give',
    label: 'Get Involved — Give',
    usage: 'The third photograph in the "Every route in changes something" band.',
    previewPath: '/get-involved',
    aspect: '16 / 9',
    fallback: '/images/get-involved-give-v2.webp',
  },
  {
    key: 'resources-banner',
    label: 'Resources banner',
    usage: 'The banner across the top of the Resources page.',
    previewPath: '/resources',
    aspect: '21 / 9',
    fallback: '/images/program-stem-learning.webp',
  },
  {
    key: 'impact-voices-band',
    label: 'Impact — Voices background',
    usage: 'The photograph behind the quotes band on the Impact page.',
    previewPath: '/impact',
    aspect: '21 / 9',
    fallback: '/images/community.webp',
  },
];

export const siteImageSlot = (key: string): SiteImageSlot | undefined =>
  SITE_IMAGE_SLOTS.find((slot) => slot.key === key);

export const siteImageInputSchema = z.object({
  // One image per slot; uploading again replaces rather than accumulates.
  key: z.string().min(2).max(60).trim(),
  image: mediaAssetSchema,
  /** Overrides the slot's own description for screen readers. */
  alt: z
    .string()
    .max(300)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  isActive: z.boolean().default(true),
});
export type SiteImageInput = z.infer<typeof siteImageInputSchema>;

export const siteImageUpdateSchema = partialForUpdate(siteImageInputSchema);
export type SiteImageUpdate = z.infer<typeof siteImageUpdateSchema>;

export interface SiteImage extends Timestamped {
  id: string;
  key: string;
  image: MediaAsset;
  alt?: string;
  isActive: boolean;
}

/**
 * Index the published slots by key, for merging over the built-in fallbacks.
 * Inactive rows are skipped, so hiding an upload restores the shipped image
 * rather than leaving an empty banner.
 */
export const siteImageMap = (items: readonly SiteImage[]): Record<string, string> =>
  Object.fromEntries(
    items
      .filter((item) => item.isActive && item.image?.url)
      .map((item) => [item.key, item.image.url]),
  );

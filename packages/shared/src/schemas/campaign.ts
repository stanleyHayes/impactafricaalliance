import { z } from 'zod';

import { clearableDate } from './common.js';
import { partialForUpdate } from './update.js';

/**
 * Banners and popups as collections rather than one of each.
 *
 * They used to be two objects inside site settings, which meant a launch
 * notice had to be typed over the top of whatever was there — the old copy was
 * gone, and the next one could not be written until the current one was
 * finished with. Keeping them as records lets a campaign be drafted, queued
 * behind a date, retired, and brought back.
 */

const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const optionalShortText = z
  .string()
  .max(120)
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** How loudly a banner reads. Tone, not decoration: it sets the colour. */
export const BANNER_TONES = ['announcement', 'success', 'warning'] as const;
export type BannerTone = (typeof BANNER_TONES)[number];

const scheduling = {
  /**
   * A name for the list, never shown to a visitor. Without it a queue of
   * banners is a wall of near-identical sentences.
   */
  name: z.string().min(2).max(120).trim(),
  isActive: z.boolean().default(false),
  /** Optional window. Absent start means "as soon as it is switched on". */
  startsAt: clearableDate,
  endsAt: clearableDate,
  /** Higher wins when more than one is live at the same moment. */
  priority: z.number().int().min(0).max(100).default(0),
};

export const announcementInputSchema = z.object({
  ...scheduling,
  message: z.string().min(2).max(300).trim(),
  linkUrl: optionalUrl,
  linkLabel: optionalShortText,
  tone: z.enum(BANNER_TONES).default('announcement'),
});
export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
export const announcementUpdateSchema = partialForUpdate(announcementInputSchema);
export type AnnouncementUpdate = z.infer<typeof announcementUpdateSchema>;

export const sitePopupInputSchema = z.object({
  ...scheduling,
  title: z.string().min(2).max(120).trim(),
  message: z.string().max(600).trim(),
  ctaLabel: optionalShortText,
  ctaUrl: optionalUrl,
  imageUrl: optionalUrl,
  /** Seconds to wait before showing, so it never lands mid-page-load. */
  delaySeconds: z.number().int().min(0).max(60).default(3),
});
export type SitePopupInput = z.infer<typeof sitePopupInputSchema>;
export const sitePopupUpdateSchema = partialForUpdate(sitePopupInputSchema);
export type SitePopupUpdate = z.infer<typeof sitePopupUpdateSchema>;

interface Scheduled {
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  priority: number;
  updatedAt: string;
}

export interface Announcement extends Scheduled {
  id: string;
  name: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  tone: BannerTone;
  createdAt: string;
}

export interface SitePopup extends Scheduled {
  id: string;
  name: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  delaySeconds: number;
  createdAt: string;
}

/** Switched on, started, and not yet finished. */
export const isLive = (item: Scheduled, now: Date = new Date()): boolean => {
  if (!item.isActive) return false;
  if (item.startsAt && new Date(item.startsAt) > now) return false;
  if (item.endsAt && new Date(item.endsAt) <= now) return false;
  return true;
};

/**
 * The one to show.
 *
 * Highest priority wins, then the most recently edited — so raising a banner
 * above the others is a number rather than a scramble to switch the rest off,
 * and two campaigns left on at once still produce one deterministic answer
 * instead of whichever the database returned first.
 */
export const currentCampaign = <T extends Scheduled>(
  items: readonly T[],
  now: Date = new Date(),
): T | undefined =>
  items
    .filter((item) => isLive(item, now))
    .sort(
      (a, b) =>
        b.priority - a.priority || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];

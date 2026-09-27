import { isSafeLink, ORG, PILLARS, type PublicImpactStory } from '@iaa/shared';

import { cloudinaryUrl } from '../../lib/cloudinary-image';

/** A programme's public name, from its key. */
export const programmeLabel = (key: string | undefined): string | undefined =>
  PILLARS.find((pillar) => pillar.key === key)?.title;

export const formatStoryDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));

/** The public address of a story. */
export const storyUrl = (slug: string): string => `${ORG.website}/impact/stories/${slug}`;

/**
 * An image address crawlers and link previews can fetch: absolute, and for a
 * Cloudinary upload, a 1200-pixel copy rather than the full original.
 */
export const absoluteImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  const absolute = url.startsWith('/') ? `${ORG.website}${url}` : url;
  return cloudinaryUrl(absolute, { width: 1200 });
};

/** What search engines and link previews show for a story: its own settings, else the story. */
export const storySeo = (
  story: PublicImpactStory,
): { title: string; description: string; image?: string; imageAlt: string } => {
  const image = story.seo?.image ?? story.cover;
  return {
    title: story.seo?.title ?? story.title,
    description: story.seo?.description ?? story.excerpt,
    image: absoluteImageUrl(image?.url),
    imageAlt: image?.alt?.trim() || story.title,
  };
};

/**
 * How a story link should be followed, or null when it must not be.
 *
 * Links were checked when the story was saved; this checks again at the last
 * moment, so a stored `javascript:` address can never become a clickable
 * link whatever happened on the way.
 */
export const storyLinkTarget = (
  url: string | undefined,
): { kind: 'internal'; to: string } | { kind: 'external'; href: string } | null => {
  const link = url?.trim();
  if (!link || !isSafeLink(link)) return null;
  return link.startsWith('/') ? { kind: 'internal', to: link } : { kind: 'external', href: link };
};

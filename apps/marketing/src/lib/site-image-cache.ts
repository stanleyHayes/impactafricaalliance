import type { MediaAsset, Paginated, SiteImage } from '@iaa/shared';

/**
 * The published site images from this browser's last visit.
 *
 * The site draws before the API answers, so a slot replaced in the dashboard
 * showed its shipped picture first and swapped to the upload a moment later,
 * on every visit, downloading both. Remembering the last answer lets a
 * returning visitor's first paint be the upload. The list is still fetched
 * straight away, so a change made since shows as soon as it arrives. While
 * the API is asleep the remembered list is what the page keeps.
 *
 * Only what the site draws is kept, and only https pictures: anything else
 * in storage is ignored rather than trusted.
 */
export const SITE_IMAGE_CACHE_KEY = 'iaa.site-images.v1';

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

/** One remembered record, trimmed to what `resolveSiteImage` reads, or null if it is not one. */
const remembered = (item: unknown): SiteImage | null => {
  const record = (typeof item === 'object' && item !== null ? item : {}) as Partial<SiteImage>;
  const image: Partial<MediaAsset> = record.image ?? {};
  const url = text(image.url, '');
  if (typeof record.key !== 'string' || !url.startsWith('https://')) return null;
  return {
    id: text(record.id, record.key),
    key: record.key,
    isActive: record.isActive === true,
    alt: text(record.alt, '') || null,
    image: {
      url,
      publicId: text(image.publicId, record.key),
      ...(typeof image.alt === 'string' ? { alt: image.alt } : {}),
    },
    createdAt: text(record.createdAt, ''),
    updatedAt: text(record.updatedAt, ''),
  };
};

const asPage = (items: SiteImage[]): Paginated<SiteImage> => ({
  items,
  page: 1,
  pageSize: 100,
  total: items.length,
  totalPages: 1,
});

/** The last visit's list, or undefined when there is none or it cannot be read. */
export const readCachedSiteImages = (): Paginated<SiteImage> | undefined => {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(SITE_IMAGE_CACHE_KEY) ?? 'null',
    ) as unknown;
    if (!Array.isArray(saved)) return undefined;
    return asPage(saved.map(remembered).filter((item): item is SiteImage => item !== null));
  } catch {
    // Private windows and blocked storage throw; the site simply starts from its defaults.
    return undefined;
  }
};

/** Remember the list for the next visit. Failing to is harmless. */
export const cacheSiteImages = (data: Paginated<SiteImage>): void => {
  try {
    const items = data.items.map(remembered).filter((item): item is SiteImage => item !== null);
    window.localStorage.setItem(SITE_IMAGE_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked: the next visit starts from the defaults, as before.
  }
};

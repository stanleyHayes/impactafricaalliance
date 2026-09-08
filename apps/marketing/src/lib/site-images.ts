import { pillarImageMap, siteImageMap, siteImageSlot, type SiteImage } from '@iaa/shared';

import { IMAGES, programImage } from '../content/images';

import { usePillarImages, useSiteImages } from './content-hooks';

/** The image shipped with the build for a slot, used until one is uploaded. */
const builtIn = (key: string): string => siteImageSlot(key)?.fallback ?? IMAGES.community;

/**
 * Resolve a site image slot to a URL.
 *
 * Every banner and piece of stock artwork used to be a path compiled into the
 * bundle, so replacing one meant a deploy. The slot list still lives in code —
 * each key is read by a named component — but the photograph behind it comes
 * from the dashboard, falling back to the shipped image so a page is never
 * left without one.
 */
export const useSiteImage = (key: string): string => {
  const { data } = useSiteImages();
  return siteImageMap(data?.items ?? [])[key] ?? builtIn(key);
};

/** Several slots at once, for a page that needs more than one. */
export const useSiteImageMap = (): ((key: string) => string) => {
  const { data } = useSiteImages();
  const uploaded = siteImageMap(data?.items ?? []);
  return (key: string) => uploaded[key] ?? builtIn(key);
};

/** Keep a showcase photo and its editor-provided description together. */
export const useShowcaseImageMap = (): ((
  key: string,
  fallbackAlt: string,
) => { src: string; alt: string }) => {
  const { data } = useSiteImages();
  return (key, fallbackAlt) => {
    const item = data?.items.find((row) => row.key === key && row.isActive && row.image?.url);
    return item
      ? {
          src: item.image.url,
          alt:
            item.alt?.trim() || item.image.alt?.trim() || siteImageSlot(key)?.label || fallbackAlt,
        }
      : { src: builtIn(key), alt: fallbackAlt };
  };
};

/**
 * The same resolution for the four programme photographs, which have their own
 * dashboard tab. Every place that draws a pillar reads this, so a photograph
 * uploaded once shows on the card, the page banner and the related list alike.
 */
export const usePillarImage = (): ((key: string) => string) => {
  const { data } = usePillarImages();
  const uploaded = pillarImageMap(data?.items ?? []);
  return (key: string) => uploaded[key] ?? programImage(key);
};

export type { SiteImage };

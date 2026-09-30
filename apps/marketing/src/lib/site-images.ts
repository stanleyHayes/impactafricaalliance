import {
  ORG,
  pillarImageMap,
  resolveSiteImage,
  SITE_IMAGE_DEFAULT_FALLBACK,
  siteImageSlot,
  type ResolvedSiteImage,
  type SiteImage,
  type SiteImageKey,
} from '@iaa/shared';

import { programImage } from '../content/images';

import { cloudinaryUrl } from './cloudinary-image';
import { usePillarImages, useSiteImages } from './content-hooks';
import { useBackgroundFallback, useImageFallback } from './image-fallback';

/**
 * Resolve every site image slot against the dashboard.
 *
 * Every banner and piece of stock artwork used to be a path compiled into the
 * bundle, so replacing one meant a deploy. The slot list still lives in code —
 * each key is read by a named component — but the picture behind it comes from
 * the dashboard: the slot's own upload, then the upload of the slot it shares
 * with, then the file shipped with the build. While the request is loading,
 * has failed, or the API is asleep, every slot draws its shipped file, so a
 * page is never left without one.
 */
export const useSiteImageResolver = (): ((key: SiteImageKey) => ResolvedSiteImage) => {
  const { data } = useSiteImages();
  const items = data?.items ?? [];
  return (key) => resolveSiteImage(key, items);
};

/** One slot's picture and its description, for an `<img>` that is read aloud. */
export const useSiteImageDetails = (key: SiteImageKey): ResolvedSiteImage =>
  useSiteImageResolver()(key);

/** One slot's address, for a background or an image whose description is fixed. */
export const useSiteImage = (key: SiteImageKey): string => useSiteImageResolver()(key).src;

/** Several slots at once, for a page that needs more than one. */
export const useSiteImageMap = (): ((key: SiteImageKey) => string) => {
  const resolve = useSiteImageResolver();
  return (key) => resolve(key).src;
};

/** A picture and what a screen reader hears for it. */
export interface DescribedImage {
  src: string;
  alt: string;
}

/** The file a slot shipped with and its description: the last resort, always there. */
export const shippedSiteImage = (key: SiteImageKey): DescribedImage => {
  const slot = siteImageSlot(key);
  return { src: slot?.fallback ?? SITE_IMAGE_DEFAULT_FALLBACK, alt: slot?.defaultAlt ?? '' };
};

/** A showcase photo, its description, and the shipped photo to fall back to if it will not load. */
export interface ShowcaseImage extends DescribedImage {
  fallback: DescribedImage;
}

/**
 * Keep a showcase photo and its description together: the editor's own
 * description when a photo was uploaded, the shipped description otherwise.
 */
export const useShowcaseImageMap = (): ((key: SiteImageKey) => ShowcaseImage) => {
  const resolve = useSiteImageResolver();
  return (key) => {
    const { src, alt } = resolve(key);
    return { src, alt, fallback: shippedSiteImage(key) };
  };
};

/**
 * One slot as an `<img>`: its picture and description, falling back to the
 * shipped file and its description if the upload will not load, so a
 * deleted upload never shows as a broken-image icon.
 */
export const useSiteImageWithFallback = (
  key: SiteImageKey,
): DescribedImage & { onError: () => void } => {
  const resolved = useSiteImageDetails(key);
  const shipped = shippedSiteImage(key);
  const { src, onError } = useImageFallback([resolved.src, shipped.src]);
  return { src, alt: src === resolved.src ? resolved.alt : shipped.alt, onError };
};

interface SlotBackgroundOptions {
  /**
   * A picture that wins over the slot, such as an article's cover or a hero
   * image published in Page Settings. The slot stands in if it will not load.
   */
  override?: string | null;
  /** Width to ask Cloudinary for. Banners are drawn edge to edge, so 1920 by default. */
  width?: number;
}

/**
 * The address to draw a slot as a CSS background: the override, then the
 * slot's upload (or the one it shares), then the shipped file, each moving
 * on if the browser cannot load it. Uploads are asked of Cloudinary at the
 * given width; the shipped file comes back exactly as given, so a page
 * nobody has changed in the dashboard draws exactly what it always did.
 */
export const useSlotBackground = (
  key: SiteImageKey,
  { override, width = 1920 }: SlotBackgroundOptions = {},
): string => {
  const slotImage = useSiteImage(key);
  const sized = (src: string): string => cloudinaryUrl(src, { width });
  return useBackgroundFallback([
    override ? sized(override) : undefined,
    sized(slotImage),
    shippedSiteImage(key).src,
  ]);
};

/**
 * A banner drawn as a CSS background, asked of Cloudinary at a width a wide
 * screen needs and in the best format the browser takes. A shipped file is
 * already sized for the web and comes back exactly as given.
 */
export const bannerImageUrl = (src: string): string => cloudinaryUrl(src, { width: 1920 });

/** A shipped file as a full address, for link previews and search results. */
export const absoluteSiteImageUrl = (src: string): string =>
  src.startsWith('/') ? `${ORG.website}${src}` : src;

/**
 * The picture a page shares when it has none of its own, as a full address:
 * crawlers and chat apps cannot follow a site-relative path.
 */
export const useDefaultShareImage = (): { url: string; alt: string } => {
  const { src, alt } = useSiteImageDetails('social-share-default');
  return { url: absoluteSiteImageUrl(cloudinaryUrl(src, { width: 1200 })), alt };
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

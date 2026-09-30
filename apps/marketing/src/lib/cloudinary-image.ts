/**
 * Right-sized, modern-format delivery for images stored on Cloudinary.
 *
 * The CMS stores Cloudinary's original `secure_url`, which serves the file
 * exactly as it was uploaded: often a multi-megabyte photo straight off a
 * phone. Rewriting the URL asks Cloudinary for a copy at the width the layout
 * needs, in the best format the browser accepts (`f_auto`) and at a quality it
 * judges visually lossless (`q_auto`). Cloudinary derives and caches each copy
 * on first request, so nothing has to be prepared at upload time.
 *
 * Modelled on `variantFor` in `@iaa/shared` (social-media-variants): the
 * transformation goes straight after `/image/upload/`, and any URL this module
 * cannot safely rewrite is handed back untouched.
 */

const CLOUDINARY_HOST = 'res.cloudinary.com';
const UPLOAD_MARKER = '/image/upload/';

/**
 * How Cloudinary fits the image to the requested width.
 *
 * `limit` shrinks but never enlarges, which is what a `srcset` wants: a 600px
 * upload offered at 1920w is still served at 600px rather than blown up and
 * made heavier. `fill`, `fit` and `scale` are there for callers that want
 * Cloudinary's other behaviours.
 */
export const CLOUDINARY_CROPS = ['limit', 'fill', 'fit', 'scale'] as const;
export type CloudinaryCrop = (typeof CLOUDINARY_CROPS)[number];

export interface CloudinaryImageOptions {
  /** Width in device pixels. Rounded; anything below 1 is ignored. */
  width?: number;
  /** `'auto'` (the default) lets Cloudinary choose; `false` keeps the upload's quality. */
  quality?: 'auto' | false;
  /** `'auto'` (the default) serves AVIF or WebP where supported; `false` keeps the upload's format. */
  format?: 'auto' | false;
  /** Only applied with a width. Defaults to `limit`. */
  crop?: CloudinaryCrop;
}

/**
 * Candidate widths for a full-bleed or content-width image.
 *
 * They cover a phone in portrait (480 at 1x, 768 and 1080 at 2x–3x), a tablet
 * or small laptop (1080–1440) and a wide desktop (1920). Fewer steps means
 * fewer derived copies for Cloudinary to create and cache; more would save
 * only a few kilobytes per image.
 */
export const RESPONSIVE_WIDTHS: readonly number[] = [480, 768, 1080, 1440, 1920];

/** A transformation segment this module writes, and so may safely replace. */
const OWN_COMPONENT = new RegExp(`^(?:f_auto|q_auto|w_\\d+|c_(?:${CLOUDINARY_CROPS.join('|')}))$`);

const isOwnSegment = (segment: string): boolean =>
  segment.length > 0 && segment.split(',').every((part) => OWN_COMPONENT.test(part));

const isCloudinaryHost = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === CLOUDINARY_HOST &&
      (parsed.protocol === 'https:' || parsed.protocol === 'http:')
    );
  } catch {
    return false;
  }
};

interface UploadUrlParts {
  /** Everything up to and including `/image/upload/`. */
  head: string;
  /** What follows, minus any transformation this module wrote earlier. */
  tail: string;
}

/**
 * Split a Cloudinary delivery URL at its transformation slot, or return null
 * when the URL must not be rewritten.
 *
 * Signed URLs (`/image/upload/s--…--/`) are refused because a transformation
 * inserted before the signature invalidates it and the image stops loading.
 * Authenticated and private deliveries use other path types and never match
 * the marker. A leading segment made only of this module's own parameters is
 * dropped, so rewriting an already-rewritten URL replaces the transformation
 * instead of stacking a second one on top.
 */
const splitUploadUrl = (url: string): UploadUrlParts | null => {
  if (!isCloudinaryHost(url)) {
    return null;
  }
  // The host is Cloudinary's, and neither a host nor user info can contain a
  // slash, so the first marker in the string is the one in the path.
  const marker = url.indexOf(UPLOAD_MARKER);
  if (marker === -1) {
    return null;
  }
  const head = url.slice(0, marker + UPLOAD_MARKER.length);
  const rest = url.slice(head.length);
  const slash = rest.indexOf('/');
  const firstSegment = slash === -1 ? '' : rest.slice(0, slash);
  if (firstSegment.startsWith('s--')) {
    return null;
  }
  return { head, tail: isOwnSegment(firstSegment) ? rest.slice(slash + 1) : rest };
};

const transformationFor = (options: CloudinaryImageOptions): string => {
  const { format = 'auto', quality = 'auto', crop = 'limit' } = options;
  const width = options.width === undefined ? NaN : Math.round(options.width);
  const parts: string[] = [];
  if (format === 'auto') parts.push('f_auto');
  if (quality === 'auto') parts.push('q_auto');
  if (Number.isFinite(width) && width >= 1) parts.push(`c_${crop}`, `w_${width}`);
  return parts.join(',');
};

/**
 * Rewrite a Cloudinary image URL to an optimised, optionally resized copy.
 *
 * `cloudinaryUrl(url, { width: 800 })` gives `…/image/upload/f_auto,q_auto,c_limit,w_800/v1/…`.
 * Anything that is not a rewritable `res.cloudinary.com` upload URL (another
 * host, a site-relative path, a signed URL) is returned exactly as given, as
 * is any URL when the options ask for nothing.
 */
export const cloudinaryUrl = (url: string, options: CloudinaryImageOptions = {}): string => {
  const parts = splitUploadUrl(url);
  const transformation = transformationFor(options);
  if (!parts || !transformation) {
    return url;
  }
  return `${parts.head}${transformation}/${parts.tail}`;
};

/**
 * A `srcset` offering the image at each width, smallest first.
 *
 * Returns `undefined` for a URL Cloudinary cannot resize, so
 * `<img srcSet={responsiveSrcSet(url)}>` simply leaves the attribute out
 * rather than listing the same file five times.
 */
export const responsiveSrcSet = (
  url: string,
  widths: readonly number[] = RESPONSIVE_WIDTHS,
): string | undefined => {
  if (!splitUploadUrl(url)) {
    return undefined;
  }
  const usable = [...new Set(widths.map((width) => Math.round(width)))]
    .filter((width) => Number.isFinite(width) && width >= 1)
    .sort((a, b) => a - b);
  if (usable.length === 0) {
    return undefined;
  }
  return usable.map((width) => `${cloudinaryUrl(url, { width })} ${width}w`).join(', ');
};

/**
 * The minimum viewport width of each MUI breakpoint. The marketing theme keeps
 * MUI's defaults; a test checks these still match it, so `sizes` agrees with
 * the `sx` breakpoints the layout is written in.
 */
export const IMAGE_BREAKPOINTS = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } as const;
export type ImageBreakpoint = keyof typeof IMAGE_BREAKPOINTS;

/** How wide the image is drawn from each breakpoint up, e.g. `{ xs: '100vw', md: '50vw' }`. */
export type ImageSizesLayout = Partial<Record<ImageBreakpoint, string>>;

const LARGEST_FIRST: readonly Exclude<ImageBreakpoint, 'xs'>[] = ['xl', 'lg', 'md', 'sm'];

/**
 * Build a `sizes` attribute from the same breakpoints `sx` uses.
 *
 * The browser takes the first matching entry, so larger breakpoints come
 * first and the `xs` width (or `100vw` without one) closes the list as the
 * unconditional default:
 * `responsiveSizes({ xs: '100vw', md: '50vw', lg: '600px' })` gives
 * `(min-width: 1200px) 600px, (min-width: 900px) 50vw, 100vw`.
 */
export const responsiveSizes = (layout: ImageSizesLayout): string => {
  const conditions = LARGEST_FIRST.flatMap((breakpoint) => {
    const size = layout[breakpoint];
    return size ? [`(min-width: ${IMAGE_BREAKPOINTS[breakpoint]}px) ${size}`] : [];
  });
  return [...conditions, layout.xs ?? '100vw'].join(', ');
};

export interface ResponsiveImageAttributes {
  src: string;
  srcSet?: string;
  sizes?: string;
}

/**
 * The `src`, `srcSet` and `sizes` of an `<img>` whose picture may come from
 * the dashboard: a Cloudinary upload is offered at every width, and a file
 * shipped with the build comes back as just its `src`, exactly as before.
 */
export const responsiveImage = (
  url: string,
  layout: ImageSizesLayout,
): ResponsiveImageAttributes => {
  const srcSet = responsiveSrcSet(url);
  return srcSet
    ? { src: cloudinaryUrl(url, { width: 1080 }), srcSet, sizes: responsiveSizes(layout) }
    : { src: url };
};

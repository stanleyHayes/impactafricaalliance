import { type SocialDestination } from '../schemas/social-publication.js';

/**
 * Cropping one image to the shape each network actually renders.
 *
 * A 4:5 portrait posted to X is letterboxed and a 16:9 banner posted to
 * Instagram is cropped by the network itself — usually through somebody's
 * face. Deriving the variants from the same upload means an editor picks one
 * picture rather than preparing five.
 */

interface Frame {
  width: number;
  height: number;
}

/** What each network shows a link or feed image at. */
export const DESTINATION_FRAMES: Record<SocialDestination, Frame> = {
  facebook: { width: 1200, height: 630 },
  linkedin: { width: 1200, height: 627 },
  x: { width: 1200, height: 675 },
  // Square rather than portrait: it is the shape that survives both the feed
  // and the profile grid.
  instagram: { width: 1080, height: 1080 },
  threads: { width: 1080, height: 1080 },
  // A link preview thumbnail rather than a posted image.
  whatsapp: { width: 1200, height: 630 },
};

const CLOUDINARY_UPLOAD = '/image/upload/';

/**
 * Rewrite a Cloudinary URL to the destination's frame.
 *
 * `g_auto` lets Cloudinary choose the crop, which keeps faces in shot far more
 * reliably than a centre crop. Anything that is not a Cloudinary URL is handed
 * back untouched — an image hosted elsewhere is still perfectly postable, it
 * just cannot be re-cropped for free.
 */
export const variantFor = (imageUrl: string, destination: SocialDestination): string => {
  const marker = imageUrl.indexOf(CLOUDINARY_UPLOAD);
  if (marker === -1) {
    return imageUrl;
  }
  const frame = DESTINATION_FRAMES[destination];
  const head = imageUrl.slice(0, marker + CLOUDINARY_UPLOAD.length);
  const tail = imageUrl.slice(marker + CLOUDINARY_UPLOAD.length);
  // Applied on top of whatever transformation the URL already carries, rather
  // than replacing it: the original may be doing something deliberate.
  return `${head}c_fill,g_auto,w_${frame.width},h_${frame.height}/${tail}`;
};

export const variantsFor = (
  imageUrl: string,
  destinations: readonly SocialDestination[],
): Record<string, string> =>
  Object.fromEntries(
    destinations.map((destination) => [destination, variantFor(imageUrl, destination)]),
  );

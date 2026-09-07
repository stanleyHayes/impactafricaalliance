/**
 * Shrink an oversized photograph in the browser before it is uploaded.
 *
 * Uploads are capped at 5 MB by the signature the API issues, and a photograph
 * taken on a phone routinely arrives at two or three times that — so the cap
 * was rejecting exactly the pictures people most wanted to use, with no way
 * through it from the dashboard.
 *
 * Nothing on the site renders wider than this, so the pixels being discarded
 * were never going to be seen. Every other route into the CMS already resizes;
 * this brings the browser into line with them.
 */

/** Wide enough for a full-bleed banner on a large display. */
const MAX_EDGE = 2400;
/** Below this, the file is already small enough to leave alone. */
const LEAVE_ALONE_BYTES = 1.5 * 1024 * 1024;

const RE_ENCODE_TYPE = 'image/webp';
const QUALITY = 0.85;

const canDownscale = (file: File): boolean =>
  file.type.startsWith('image/') &&
  // An animated GIF loses its animation through a canvas, and an SVG has no
  // pixels to resample. Neither is what the size cap is turning away.
  file.type !== 'image/gif' &&
  file.type !== 'image/svg+xml' &&
  typeof createImageBitmap === 'function';

const scaleFor = (width: number, height: number): number => {
  const longest = Math.max(width, height);
  return longest > MAX_EDGE ? MAX_EDGE / longest : 1;
};

/**
 * Returns a smaller file, or the original when shrinking is unnecessary or
 * impossible. Never throws: an upload should not fail because an optimisation
 * did.
 */
export const downscaleImage = async (file: File): Promise<File> => {
  if (!canDownscale(file) || file.size <= LEAVE_ALONE_BYTES) {
    return file;
  }

  try {
    // `from-image` applies the EXIF orientation, so a photograph taken in
    // portrait does not come out on its side.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = scaleFor(bitmap.width, bitmap.height);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, RE_ENCODE_TYPE, QUALITY);
    });
    // Keep whichever is smaller: re-encoding an already-efficient file can
    // make it bigger, and then the original was the better upload.
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const name = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${name}.webp`, { type: RE_ENCODE_TYPE, lastModified: file.lastModified });
  } catch {
    // An undecodable format, or a canvas the browser refused. The original
    // still gets its chance, and the size check will speak for itself.
    return file;
  }
};

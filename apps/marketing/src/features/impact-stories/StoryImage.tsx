import type { MediaAsset } from '@iaa/shared';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

import {
  cloudinaryUrl,
  responsiveSizes,
  responsiveSrcSet,
  type ImageSizesLayout,
} from '../../lib/cloudinary-image';

export interface StoryImageProps {
  image: MediaAsset;
  /** How wide the image is drawn at each breakpoint, for `sizes`. */
  layout: ImageSizesLayout;
  /** Overrides the image's own description, such as a partner's name for a logo. */
  alt?: string;
  /** For the image at the top of the page, which should not wait to load. */
  priority?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * A story picture, served at the width the layout needs.
 *
 * Cloudinary uploads get a `srcset` so a phone downloads a phone-sized copy,
 * and the stored width and height are passed through so the browser reserves
 * the space before the file arrives and the text below does not jump.
 * Anything off-screen loads lazily.
 */
export const StoryImage = ({
  image,
  layout,
  alt,
  priority = false,
  sx,
}: StoryImageProps): JSX.Element => (
  <Box
    component="img"
    src={cloudinaryUrl(image.url, { width: 1080 })}
    srcSet={responsiveSrcSet(image.url)}
    sizes={responsiveSizes(layout)}
    width={image.width}
    height={image.height}
    alt={alt ?? image.alt ?? ''}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    fetchPriority={priority ? 'high' : undefined}
    sx={[
      { display: 'block', maxWidth: '100%', height: 'auto' },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  />
);

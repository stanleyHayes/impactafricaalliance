import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

import { responsiveImage } from '../../lib/cloudinary-image';
import { useImageFallback } from '../../lib/image-fallback';
import { shippedSiteImage, useSiteImage } from '../../lib/site-images';

/**
 * Keeps missing and failed event media on brand without broken-image placeholders.
 *
 * The stand-in is the Events artwork slot, which shares the team placeholder
 * until it is given a picture of its own. Cards are about half the page wide
 * at most, and the event page's frame about the same.
 */
export const EventArtwork = ({ src, sx }: { src?: string; sx?: SxProps<Theme> }): JSX.Element => {
  const artwork = useSiteImage('event-artwork');
  // The event's image, then the dashboard's artwork, then the shipped artwork.
  const picture = useImageFallback([src, artwork, shippedSiteImage('event-artwork').src]);
  const ownImage = Boolean(src) && picture.src === src;
  return (
    <Box
      component="img"
      {...responsiveImage(picture.src, {
        xs: '100vw',
        md: '50vw',
        lg: '600px',
      })}
      alt=""
      onError={picture.onError}
      sx={[
        {
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          bgcolor: '#0E2A22',
          // Event artwork is usually the speaker's portrait, framed with the
          // face high. A centred crop beheads them in the card's wide shape,
          // so bias the crop upward as the team cards do.
          objectPosition: ownImage ? 'center 22%' : 'center',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

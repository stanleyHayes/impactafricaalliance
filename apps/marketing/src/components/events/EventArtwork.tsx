import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { useState } from 'react';

import { useSiteImage } from '../../lib/site-images';

/** Keeps missing and failed event media on brand without broken-image placeholders. */
export const EventArtwork = ({ src, sx }: { src?: string; sx?: SxProps<Theme> }): JSX.Element => {
  const [failed, setFailed] = useState<string>();
  const artwork = useSiteImage('team-artwork');
  return (
    <Box
      component="img"
      src={src && failed !== src ? src : artwork}
      alt=""
      onError={() => setFailed(src)}
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
          objectPosition: src && failed !== src ? 'center 22%' : 'center',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { useState } from 'react';

import { IMAGES } from '../../content/images';

/** Keeps missing and failed event media on brand without broken-image placeholders. */
export const EventArtwork = ({ src, sx }: { src?: string; sx?: SxProps<Theme> }): JSX.Element => {
  const [failed, setFailed] = useState<string>();
  return (
    <Box
      component="img"
      src={src && failed !== src ? src : IMAGES.teamArtwork}
      alt=""
      onError={() => setFailed(src)}
      sx={[
        { display: 'block', width: '100%', height: '100%', objectFit: 'cover', bgcolor: '#0E2A22' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

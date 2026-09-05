import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { useState } from 'react';

export const EventImage = ({ src, sx }: { src?: string; sx?: SxProps<Theme> }): JSX.Element => {
  const [failed, setFailed] = useState<string>();
  return (
    <Box
      component="img"
      alt=""
      src={src && failed !== src ? src : '/images/event-artwork.webp'}
      onError={() => setFailed(src)}
      sx={[
        { display: 'block', width: '100%', height: '100%', objectFit: 'cover', bgcolor: '#0E2A22' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
};

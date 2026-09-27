import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { StoryImage } from '../StoryImage';

import { BlockFrame, BlockHeading, type StoryBlockProps } from './frame';

// The first photo leads at double width once there are enough to fill the rows around it.
const leadsWide = (count: number, index: number): boolean => index === 0 && count >= 3;

/**
 * Photos laid out together, modelled on the programme gallery: the first
 * leads, the rest fill the grid, and every picture below the fold loads only
 * as it scrolls near.
 */
export const GalleryBlock = ({ data }: StoryBlockProps<'gallery'>): JSX.Element => {
  const count = data.images.length;
  return (
    <BlockFrame width="wide">
      {data.heading && <BlockHeading>{data.heading}</BlockHeading>}
      <Box
        component="ul"
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 2.5 },
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          m: 0,
          p: 0,
          listStyle: 'none',
        }}
      >
        {data.images.map((item, index) => {
          const wide = leadsWide(count, index);
          return (
            <Box
              component="li"
              key={`${item.image.publicId}-${index}`}
              sx={{ gridColumn: wide ? { sm: 'span 2' } : undefined, minWidth: 0 }}
            >
              <Box component="figure" sx={{ m: 0 }}>
                <Box
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    aspectRatio: wide ? { xs: '4 / 3', sm: '16 / 9' } : '4 / 3',
                    '& img': { transition: 'transform 500ms ease' },
                    '&:hover img': { transform: 'scale(1.04)' },
                    '@media (prefers-reduced-motion: reduce)': {
                      '& img': { transition: 'none' },
                      '&:hover img': { transform: 'none' },
                    },
                  }}
                >
                  <StoryImage
                    image={item.image}
                    layout={
                      wide ? { xs: '100vw', md: '66vw' } : { xs: '100vw', sm: '50vw', md: '33vw' }
                    }
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
                {item.caption && (
                  <Typography
                    component="figcaption"
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, lineHeight: 1.55 }}
                  >
                    {item.caption}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </BlockFrame>
  );
};

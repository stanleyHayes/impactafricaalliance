import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { ImageSizesLayout } from '../../../lib/cloudinary-image';
import { galleryTileSpans, type GalleryTileSpan } from '../story-utils';
import { StoryImage } from '../StoryImage';

import { BlockFrame, BlockHeading, type StoryBlockProps } from './frame';

/**
 * Every photo in a row is drawn at the same height from a tablet up, so a
 * wide tile and its neighbour line up and captions start level. On a phone
 * the tiles stack one to a row and keep a 4:3 shape instead.
 */
const TILE_HEIGHT = { sm: 240, md: 300 } as const;

/** How wide a tile is drawn at each breakpoint, for the image's `sizes`. */
const tileLayout = (span: GalleryTileSpan): ImageSizesLayout => ({
  xs: '100vw',
  sm: `${Math.round((span.sm / 2) * 100)}vw`,
  md: `${Math.round((span.md / 6) * 100)}vw`,
});

/**
 * Photos laid out together, modelled on the programme gallery: the first
 * leads at double width, the rest fill the grid, every tile in a row is the
 * same height, and every picture below the fold loads only as it scrolls
 * near. A short last row widens to fill the space rather than leaving holes.
 */
export const GalleryBlock = ({ data }: StoryBlockProps<'gallery'>): JSX.Element => {
  const spans = galleryTileSpans(data.images.length);
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
            md: 'repeat(6, minmax(0, 1fr))',
          },
          m: 0,
          p: 0,
          listStyle: 'none',
        }}
      >
        {data.images.map((item, index) => {
          const span = spans[index] ?? { md: 2, sm: 1 };
          return (
            <Box
              component="li"
              key={`${item.image.publicId}-${index}`}
              sx={{
                gridColumn: { sm: `span ${span.sm}`, md: `span ${span.md}` },
                minWidth: 0,
              }}
            >
              <Box component="figure" sx={{ m: 0 }}>
                <Box
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    aspectRatio: { xs: '4 / 3', sm: 'auto' },
                    height: { xs: 'auto', ...TILE_HEIGHT },
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
                    layout={tileLayout(span)}
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

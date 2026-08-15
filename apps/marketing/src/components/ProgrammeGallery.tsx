import type { GalleryItem } from '@iaa/shared';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useGallery } from '../lib/content-hooks';

import { Section } from './Section';
import { SectionReveal } from './SectionReveal';

/**
 * Featured shots lead the grid at double width, so the strongest photography
 * from a programme anchors the section regardless of upload order.
 */
const isWide = (item: GalleryItem, index: number): boolean => item.featured || index === 0;

const GalleryTile = ({ item, index }: { item: GalleryItem; index: number }): JSX.Element => (
  <Grid size={{ xs: 12, sm: 6, md: isWide(item, index) ? 8 : 4 }} sx={{ display: 'flex' }}>
    <SectionReveal delay={Math.min(index, 5) * 0.05} fillHeight>
      <Box
        component="figure"
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: { xs: 240, md: isWide(item, index) ? 420 : 300 },
          m: 0,
          overflow: 'hidden',
          borderRadius: 3,
          bgcolor: 'rgba(0,30,20,0.06)',
          '&:hover .gallery-img': { transform: 'scale(1.05)' },
        }}
      >
        <Box
          className="gallery-img"
          component="img"
          src={item.image.url}
          alt={item.image.alt ?? item.title}
          loading="lazy"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 500ms ease',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(0deg, rgba(8,31,19,0.88) 0%, rgba(8,31,19,0.35) 42%, transparent 68%)',
          }}
        />
        <Box
          component="figcaption"
          sx={{ position: 'absolute', right: 0, bottom: 0, left: 0, p: { xs: 2.25, md: 3 } }}
        >
          <Chip
            label={item.programme}
            size="small"
            sx={{
              mb: 1.25,
              bgcolor: 'rgba(255,255,255,0.16)',
              color: 'common.white',
              fontWeight: 700,
              backdropFilter: 'blur(6px)',
            }}
          />
          <Typography sx={{ color: 'common.white', fontWeight: 750, lineHeight: 1.3 }}>
            {item.title}
          </Typography>
          {item.caption && (
            <Typography
              variant="body2"
              sx={{ mt: 0.5, color: 'rgba(255,255,255,0.74)', lineHeight: 1.55 }}
            >
              {item.caption}
            </Typography>
          )}
          {item.location && (
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.58)' }}
            >
              {item.location}
            </Typography>
          )}
        </Box>
      </Box>
    </SectionReveal>
  </Grid>
);

const GallerySkeleton = (): JSX.Element => (
  <Grid container spacing={2.5}>
    {[8, 4, 4, 4, 4].map((span, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: span }}>
        <Skeleton
          variant="rounded"
          height={index === 0 ? 420 : 300}
          sx={{ borderRadius: 3, bgcolor: 'rgba(0,30,20,0.07)' }}
        />
      </Grid>
    ))}
  </Grid>
);

/**
 * Programme photography managed from the admin dashboard (Content → Gallery).
 * Renders nothing when no photos are published, so the page never shows an
 * empty band before the first upload.
 */
export const ProgrammeGallery = (): JSX.Element | null => {
  const { data, isLoading } = useGallery();
  const items = data?.items ?? [];

  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <Section
      eyebrow="From the field"
      title="Impact Programme snapshot"
      subtitle="Moments from our most recent programmes, straight from the communities we work in."
      bgcolor="background.default"
    >
      {isLoading ? (
        <GallerySkeleton />
      ) : (
        <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
          {items.map((item, index) => (
            <GalleryTile key={item.id} item={item} index={index} />
          ))}
        </Grid>
      )}
    </Section>
  );
};

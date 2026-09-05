import { brandColors } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { IMAGES } from '../content/images';

import { Watermark, type WatermarkVariant } from './Watermark';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  image?: string;
  watermark?: WatermarkVariant | false;
}

/** Inner-page banner with layered photography and restrained brand geometry. */
export const PageHero = ({
  title,
  subtitle,
  eyebrow,
  image = IMAGES.community,
  watermark,
}: PageHeroProps): JSX.Element => (
  <Box
    component="header"
    sx={{
      position: 'relative',
      minHeight: { xs: 390, md: 500 },
      overflow: 'hidden',
      bgcolor: 'common.black',
      color: 'common.white',
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: 'scale(1.035)',
      }}
    />
    {watermark && (
      <Watermark
        variant={watermark}
        position="bottom-right"
        size={{ xs: 260, md: 420 }}
        opacity={0.14}
        sx={{ color: 'primary.main', zIndex: 1 }}
      />
    )}
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(90deg, ${alpha(brandColors.deepForest, 0.94)} 0%, ${alpha(brandColors.deepForest, 0.78)} 58%, ${alpha(brandColors.deepForest, 0.48)} 100%), linear-gradient(0deg, ${alpha(brandColors.deepForest, 0.72)}, transparent 58%)`,
      }}
    />
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        right: { xs: -180, md: -80 },
        bottom: -270,
        width: { xs: 440, md: 620 },
        height: { xs: 440, md: 620 },
        border: '1px solid rgba(245,184,0,0.2)',
        borderRadius: '50%',
        boxShadow: '0 0 0 54px rgba(245,184,0,0.025), 0 0 0 108px rgba(245,184,0,0.018)',
      }}
    />
    <Container
      sx={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        minHeight: { xs: 390, md: 500 },
        alignItems: 'center',
        py: { xs: 8, md: 11 },
      }}
    >
      <Box sx={{ maxWidth: 880 }}>
        {eyebrow && (
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box sx={{ width: 38, height: 2, bgcolor: 'secondary.main' }} />
            <Typography
              variant="overline"
              sx={{ color: 'secondary.light', fontWeight: 750, letterSpacing: 2 }}
            >
              {eyebrow}
            </Typography>
          </Stack>
        )}
        <Typography
          variant="h1"
          sx={{
            mt: eyebrow ? 2 : 0,
            maxWidth: 820,
            color: 'common.white',
            fontSize: { xs: '2.6rem', sm: '3.15rem', md: '4rem' },
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{
              mt: 2.5,
              maxWidth: 680,
              color: 'rgba(255,255,255,0.82)',
              fontSize: { xs: '1rem', md: '1.15rem' },
              lineHeight: 1.75,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Container>
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        height: 3,
        background:
          'linear-gradient(90deg, transparent, rgba(245,184,0,0.92) 35%, rgba(0,214,139,0.9) 70%, transparent)',
      }}
    />
  </Box>
);

import { brandColors } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { m, useReducedMotion } from 'framer-motion';

import { AnimatedHeading } from '../../../components/AnimatedHeading';
import { rise, transitions } from '../../../theme/motion';
import { StoryImage } from '../StoryImage';

import type { StoryBlockProps } from './frame';

/**
 * A full-bleed picture with a large heading over it. The one place a story
 * uses the site's animated heading, as page heroes do elsewhere; a hero later
 * in the story is a chapter break with a second-level heading.
 */
export const HeroBlock = ({ data, lead = false, meta }: StoryBlockProps<'hero'>): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const height = lead ? { xs: 520, md: 640 } : { xs: 420, md: 520 };
  return (
    <Box
      component={lead ? 'header' : 'section'}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        minHeight: height,
        overflow: 'hidden',
        bgcolor: brandColors.deepForest,
        color: 'common.white',
      }}
    >
      {data.image && (
        <StoryImage
          image={data.image}
          layout={{ xs: '100vw' }}
          priority={lead}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, ${alpha(brandColors.deepForest, 0.9)} 0%, ${alpha(brandColors.deepForest, 0.62)} 60%, ${alpha(brandColors.deepForest, 0.3)} 100%), linear-gradient(0deg, ${alpha(brandColors.deepForest, 0.85)}, transparent 60%)`,
        }}
      />
      <Container sx={{ position: 'relative', py: { xs: 6, md: 9 } }}>
        {meta}
        <Box sx={{ maxWidth: 900 }}>
          {data.eyebrow && (
            <Typography
              variant="overline"
              sx={{ display: 'block', color: 'secondary.light', fontWeight: 750, letterSpacing: 2 }}
            >
              {data.eyebrow}
            </Typography>
          )}
          <AnimatedHeading
            text={data.heading}
            component={lead ? 'h1' : 'h2'}
            variant="h1"
            delay={0.08}
            sx={{
              mt: data.eyebrow ? 1.5 : 0,
              color: 'common.white',
              fontSize: lead
                ? { xs: '2.4rem', sm: '3.1rem', md: '4rem' }
                : { xs: '2rem', md: '3rem' },
              lineHeight: 1.08,
              overflowWrap: 'anywhere',
            }}
          />
          {data.subheading && (
            <Typography
              component={m.p}
              initial={reduceMotion ? undefined : { opacity: 0, y: rise.sm }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ ...transitions.enter, delay: 0.3 }}
              sx={{
                mt: 2.5,
                maxWidth: 720,
                color: 'rgba(255,255,255,0.86)',
                fontSize: { xs: '1.05rem', md: '1.2rem' },
                lineHeight: 1.7,
              }}
            >
              {data.subheading}
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
};

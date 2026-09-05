import { brandColors, brandFonts } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useId, useRef } from 'react';

import { AllianceSculpture } from './AllianceSculpture';
import { Watermark } from './Watermark';

interface ShowcasePanel {
  src: string;
  alt: string;
  caption: string;
  /** How far this panel drifts relative to the scroll, in viewport-height units. */
  drift: number;
}

interface ParallaxShowcaseProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  panels: ShowcasePanel[];
}

interface PanelProps {
  panel: ShowcasePanel;
  progress: MotionValue<number>;
  reduceMotion: boolean;
  index: number;
}

const ShowcaseImage = ({ panel, progress, reduceMotion, index }: PanelProps): JSX.Element => {
  // Keep image movement inside the crop so the frame never exposes empty space.
  const y = useTransform(progress, [0, 1], ['4%', `${-Math.min(panel.drift, 0.08) * 100}%`]);
  const scale = useTransform(progress, [0, 0.5, 1], [1.08, 1, 1.08]);

  return (
    <Box
      component="figure"
      sx={{
        m: 0,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        minHeight: { xs: index === 0 ? 350 : 260, md: index === 0 ? 560 : 272 },
        borderRadius: 4,
        bgcolor: brandColors.deepForest,
      }}
    >
      <Box
        component={reduceMotion ? 'div' : m.div}
        style={reduceMotion ? undefined : { y, scale }}
        sx={{ position: 'absolute', inset: '-12% 0' }}
      >
        <Box
          component="img"
          src={panel.src}
          alt={panel.alt}
          loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>

      <Box
        component="figcaption"
        sx={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          p: { xs: 3, md: 3.5 },
          pt: 8,
          background: 'linear-gradient(180deg, transparent, rgba(0,30,20,0.82))',
          pointerEvents: 'none',
        }}
      >
        <Typography
          sx={{
            color: brandColors.white,
            fontSize: index === 0 ? { xs: '1.8rem', md: '2.5rem' } : '1.25rem',
            fontFamily: brandFonts.heading,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {panel.caption}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Editorial photo mosaic with gently drifting, clipped photography. Pure transform work — no WebGL, no extra dependency — so it
 * stays cheap on the mid-range phones most of our visitors use.
 */
export const ParallaxShowcase = ({
  eyebrow,
  title,
  subtitle,
  panels,
}: ParallaxShowcaseProps): JSX.Element => {
  const headingId = useId();
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  return (
    <Box
      ref={sectionRef}
      component="section"
      aria-labelledby={headingId}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 7, md: 10 },
        bgcolor: brandColors.deepForest,
        color: brandColors.white,
      }}
    >
      <Watermark
        variant="network"
        color={brandColors.mint}
        size={620}
        opacity={0.13}
        position="top-right"
      />
      <Container sx={{ position: 'relative' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 270px' },
            gap: 3,
            alignItems: 'center',
            mb: { xs: 4, md: 6 },
          }}
        >
          <Box>
            <Typography
              sx={{
                color: brandColors.gold,
                fontSize: '.75rem',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </Typography>
            <Typography
              id={headingId}
              variant="h2"
              sx={{
                mt: 2,
                maxWidth: 650,
                fontFamily: brandFonts.heading,
                fontSize: { xs: '2.5rem', md: '3.75rem' },
                lineHeight: 1.05,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                sx={{ mt: 2.5, maxWidth: 620, color: 'rgba(255,255,255,.75)', lineHeight: 1.8 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <AllianceSculpture variant="seed" />
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.35fr 1fr' },
            gap: 2,
            '& > :first-of-type': {
              gridColumn: { sm: '1 / -1', md: 'auto' },
              gridRow: { md: panels.length === 3 ? 'span 2' : 'auto' },
            },
          }}
        >
          {panels.map((panel, index) => (
            <ShowcaseImage
              key={panel.caption}
              panel={panel}
              progress={scrollYProgress}
              reduceMotion={reduceMotion}
              index={index}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
};

import { brandColors, brandFonts } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';

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
  // Each panel travels a different distance, so the group separates as it passes.
  const y = useTransform(progress, [0, 1], ['0%', `${-panel.drift * 100}%`]);
  const scale = useTransform(progress, [0, 0.5, 1], [1.08, 1, 1.08]);

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        aspectRatio: index % 2 === 0 ? '3 / 4' : '4 / 5',
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
        sx={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          p: 2.5,
          background: 'linear-gradient(180deg, transparent, rgba(0,30,20,0.82))',
          pointerEvents: 'none',
        }}
      >
        <Typography
          sx={{
            color: brandColors.white,
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {panel.caption}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Tall scroll section: the heading pins while the photography drifts past at
 * different rates. Pure transform work — no WebGL, no extra dependency — so it
 * stays cheap on the mid-range phones most of our visitors use.
 */
export const ParallaxShowcase = ({
  eyebrow,
  title,
  subtitle,
  panels,
}: ParallaxShowcaseProps): JSX.Element => {
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
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 8, md: 14 },
        bgcolor: brandColors.deepForest,
        color: brandColors.white,
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 5, md: 8 },
            gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' },
            alignItems: 'start',
          }}
        >
          <Box sx={{ position: { md: 'sticky' }, top: { md: 120 } }}>
            <Typography
              sx={{
                color: brandColors.gold,
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </Typography>
            <Typography
              variant="h2"
              sx={{
                mt: 2,
                fontFamily: brandFonts.display,
                fontSize: { xs: '2.2rem', md: '3.4rem' },
                lineHeight: 1.08,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  maxWidth: 460,
                  mt: 2.5,
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '1.02rem',
                  lineHeight: 1.8,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 3, md: 4 }}
            alignItems="flex-start"
          >
            {panels.map((panel, index) => (
              <Box
                key={panel.caption}
                sx={{ flex: 1, width: '100%', mt: { sm: index % 2 === 0 ? 0 : 10 } }}
              >
                <ShowcaseImage
                  panel={panel}
                  progress={scrollYProgress}
                  reduceMotion={reduceMotion}
                  index={index}
                />
              </Box>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

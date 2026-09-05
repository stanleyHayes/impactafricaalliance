import { brandFonts } from '@iaa/shared';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { Box, Container, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { m, useReducedMotion } from 'framer-motion';

const PRINCIPLES = [
  { word: 'innovation', Icon: AutoAwesomeOutlinedIcon, light: '#79601E', dark: '#E9CE8A' },
  { word: 'education', Icon: MenuBookOutlinedIcon, light: '#35644E', dark: '#B5D7C1' },
  { word: 'empowerment', Icon: VolunteerActivismOutlinedIcon, light: '#655783', dark: '#CBBFE1' },
];

export const MissionStatement = (): JSX.Element => {
  const reduceMotion = useReducedMotion();
  return (
    <Box
      component="section"
      aria-labelledby="mission-statement"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 5, md: 6 },
        bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.05),
        borderBlock: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 620 340"
        aria-hidden
        focusable="false"
        sx={{
          position: 'absolute',
          right: '-5%',
          top: '-10%',
          height: '120%',
          maxWidth: '100%',
          color: 'text.secondary',
          opacity: 0.075,
          pointerEvents: 'none',
        }}
      >
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M30 290 175 65 335 180 475 40 595 285M175 65 475 40M30 290 335 180 595 285" />
          <circle cx="335" cy="180" r="90" />
          <circle cx="335" cy="180" r="140" />
          <path d="M275 250v-85a60 60 0 0 1 120 0v85M300 250v-85a35 35 0 0 1 70 0v85" />
        </g>
        <g fill="currentColor">
          <circle cx="30" cy="290" r="5" />
          <circle cx="175" cy="65" r="5" />
          <circle cx="475" cy="40" r="5" />
        </g>
      </Box>
      <Container sx={{ position: 'relative' }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 2, display: 'block', mb: 2 }}
        >
          Our purpose
        </Typography>
        <Box
          component={m.h2}
          id="mission-statement"
          aria-label="Driving sustainable impact across Africa through innovation, education, and empowerment."
          initial={reduceMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.18 } },
          }}
          sx={{
            m: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '.95fr 1.05fr' },
            gap: { xs: 3, md: 7 },
            alignItems: 'center',
            fontWeight: 500,
          }}
        >
          <Box
            component={m.span}
            aria-hidden="true"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.7 } },
            }}
            sx={{
              display: 'block',
              maxWidth: 510,
              fontFamily: brandFonts.heading,
              fontSize: { xs: '1.95rem', sm: '2.3rem', md: '2.6rem' },
              lineHeight: 1.2,
              color: 'text.primary',
            }}
          >
            Driving sustainable impact across Africa
            <Box
              component="span"
              sx={{
                display: 'block',
                mt: 1.5,
                fontFamily: brandFonts.body,
                fontSize: '.95rem',
                color: 'text.secondary',
                fontWeight: 400,
              }}
            >
              through the power of
            </Box>
          </Box>
          <Box
            component={m.span}
            aria-hidden="true"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  delayChildren: reduceMotion ? 0 : 0.2,
                  staggerChildren: reduceMotion ? 0 : 0.24,
                },
              },
            }}
            sx={{ display: 'grid', gap: 1.25, minWidth: 0 }}
          >
            {PRINCIPLES.map(({ word, Icon, light, dark }) => (
              <Box
                component={m.span}
                key={word}
                variants={{
                  hidden: { opacity: 0, x: 30 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: reduceMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1.5, md: 2 },
                  color: (theme) => (theme.palette.mode === 'dark' ? dark : light),
                }}
              >
                <Box
                  component={m.span}
                  variants={{
                    hidden: { scale: 0.8, rotate: -20, opacity: 0 },
                    visible: {
                      scale: 1,
                      rotate: 0,
                      opacity: 1,
                      transition: { duration: reduceMotion ? 0 : 0.65 },
                    },
                  }}
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    border: '1px solid',
                    borderColor: 'currentColor',
                    borderRadius: '50%',
                  }}
                >
                  <Icon sx={{ fontSize: 21 }} />
                </Box>
                <Box
                  component={m.span}
                  variants={{
                    hidden: { clipPath: 'inset(0 100% 0 0)' },
                    visible: {
                      clipPath: 'inset(0 0% 0 0)',
                      transition: { duration: reduceMotion ? 0 : 0.85, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                  sx={{
                    display: 'block',
                    fontFamily: brandFonts.heading,
                    fontSize: {
                      xs: 'clamp(1.6rem, 6.6vw, 2.3rem)',
                      md: 'clamp(2rem, 3.4vw, 3rem)',
                    },
                    lineHeight: 1.2,
                    letterSpacing: '-.03em',
                    pb: 0.2,
                  }}
                >
                  {word}
                  <Box component="span" sx={{ opacity: 0.5 }}>
                    .
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

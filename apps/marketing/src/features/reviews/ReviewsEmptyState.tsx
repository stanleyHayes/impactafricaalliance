import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { m, useReducedMotion } from 'framer-motion';

export const ReviewsEmptyState = (): JSX.Element => {
  const reduceMotion = useReducedMotion();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: { xs: 3, sm: 5 },
        py: { xs: 5, md: 7 },
        border: 1,
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
        borderRadius: 4,
        textAlign: 'center',
        background: (theme) =>
          `radial-gradient(ellipse at 50% 0%, ${alpha(theme.palette.primary.main, 0.09)}, transparent 70%)`,
      }}
    >
      <Box
        component={m.div}
        aria-hidden="true"
        initial={false}
        whileInView={reduceMotion ? {} : { y: [0, -6, 0], rotate: [0, -3, 0] }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 2, repeat: 1, ease: [0.45, 0, 0.55, 1] }}
        sx={{ width: 120, height: 112, mx: 'auto', mb: 3 }}
      >
        <Box component="svg" viewBox="0 0 120 112" sx={{ width: '100%', height: '100%' }}>
          <circle cx="60" cy="56" r="50" fill="none" stroke="currentColor" opacity="0.08" />
          <circle cx="60" cy="56" r="39" fill="#BDECCB" fillOpacity="0.14" />
          <rect x="25" y="25" width="67" height="56" rx="18" fill="#BDECCB" />
          <path
            d="M39 76v15l18-14"
            fill="#BDECCB"
            stroke="#BDECCB"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <path d="M41 47h34M41 59h22" stroke="#154734" strokeWidth="4" strokeLinecap="round" />
          <m.g
            initial={false}
            whileInView={reduceMotion ? {} : { rotate: [0, 12, -6, 0], scale: [1, 1.12, 1] }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '91px 28px' }}
          >
            <circle cx="91" cy="28" r="18" fill="#154734" />
            <path
              d="m91 17 3.2 6.5 7.2 1-5.2 5.1 1.2 7.2-6.4-3.4-6.4 3.4 1.2-7.2-5.2-5.1 7.2-1Z"
              fill="#BDECCB"
            />
          </m.g>
          <circle cx="17" cy="65" r="3" fill="#BDECCB" />
          <path
            d="M100 75v8m-4-4h8"
            stroke="currentColor"
            opacity="0.3"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Box>
      </Box>

      <Typography
        variant="overline"
        sx={{
          color: 'text.secondary',
          letterSpacing: '0.16em',
          fontSize: '0.65rem',
          fontWeight: 700,
        }}
      >
        Community voices
      </Typography>
      <Typography
        component="h2"
        variant="h4"
        sx={{
          mt: 1,
          mx: 'auto',
          maxWidth: 390,
          fontSize: { xs: '1.7rem', md: '2rem' },
          lineHeight: 1.2,
          textWrap: 'balance',
        }}
      >
        Every story starts with a voice. Yours could be first.
      </Typography>
      <Typography
        color="text.secondary"
        sx={{ mt: 2, mx: 'auto', maxWidth: 380, fontSize: '0.95rem', lineHeight: 1.75 }}
      >
        No reviews have been published yet. Share your experience with Impact Africa Alliance and
        help someone take their next step.
      </Typography>
      <Button
        component="a"
        href="#review-form"
        variant="text"
        endIcon={<ArrowForwardRoundedIcon />}
        sx={{ mt: 2.5, color: 'text.primary', fontWeight: 700 }}
      >
        Write the first review
      </Button>
    </Box>
  );
};

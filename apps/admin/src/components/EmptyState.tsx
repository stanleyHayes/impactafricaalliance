import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: JSX.Element;
  variant?: 'contained' | 'outlined' | 'text';
}

export interface EmptyStateProps {
  /** A MUI icon element featured (enlarged) inside the animated medallion. */
  icon: JSX.Element;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** Defaults to true; gated by prefers-reduced-motion regardless. */
  animated?: boolean;
}

/** Medallion settles in: gentle scale + fade. */
const medallionIn = keyframes`
  from { opacity: 0; transform: scale(0.82); }
  to   { opacity: 1; transform: scale(1); }
`;

/** Soft breathing halo behind the medallion. */
const haloPulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.85; transform: scale(1.08); }
`;

/** A light sheen sweeping diagonally across the medallion face. */
const sheenSweep = keyframes`
  0%   { transform: translateX(-160%) skewX(-18deg); }
  55%  { transform: translateX(260%) skewX(-18deg); }
  100% { transform: translateX(260%) skewX(-18deg); }
`;

/** A single gold dot orbiting the medallion ring. */
const orbit = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

/** Title, copy, and actions rise gently into view. */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
`;

const MEDALLION = 116;

/** Returns the animation shorthand when motion is enabled, else 'none'. */
const anim = (enabled: boolean, value: string): string => (enabled ? value : 'none');

/**
 * Centered, on-brand "sheen-orbit" empty state. The featured icon scales and
 * fades into a forest-green medallion while a soft white sheen sweeps across its
 * face and a single gold dot orbits a dashed ring, backed by a gently breathing
 * halo. Title, description (capped ~46ch) and the action row stagger in beneath
 * it. Every decorative layer is aria-hidden, and all motion is disabled under
 * prefers-reduced-motion.
 */
export const EmptyState = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  animated = true,
}: EmptyStateProps): JSX.Element => {
  const theme = useTheme();
  const green = theme.palette.primary.main;
  const greenLight = theme.palette.primary.light;
  const gold = theme.palette.secondary.main;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: { xs: 7, sm: 10 },
        width: '100%',
        // Honor reduced-motion: freeze every decorative animation.
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important' },
        },
      }}
    >
      {/* Animated medallion + orbit ring. */}
      <Box
        sx={{
          position: 'relative',
          width: MEDALLION,
          height: MEDALLION,
          mb: 3.5,
          animation: anim(animated, `${medallionIn} 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`),
        }}
      >
        {/* Breathing halo glow. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: -12,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 45%, ${alpha(green, 0.22)} 0%, ${alpha(green, 0)} 70%)`,
            animation: anim(animated, `${haloPulse} 4.5s ease-in-out infinite`),
          }}
        />

        {/* Orbit ring carrying a travelling gold dot. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: -7,
            borderRadius: '50%',
            border: `1px dashed ${alpha(green, 0.25)}`,
            animation: anim(animated, `${orbit} 9s linear infinite`),
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -4.5,
              left: '50%',
              width: 9,
              height: 9,
              ml: '-4.5px',
              borderRadius: '50%',
              backgroundColor: gold,
              boxShadow: `0 0 8px ${alpha(gold, 0.7)}`,
            }}
          />
        </Box>

        {/* Medallion face holding the enlarged icon. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            overflow: 'hidden',
            color: 'primary.main',
            background: `linear-gradient(155deg, ${alpha(greenLight, 0.16)} 0%, ${alpha(green, 0.1)} 100%)`,
            border: `1px solid ${alpha(green, 0.18)}`,
            boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.6)}, 0 12px 28px -16px ${alpha(green, 0.55)}`,
            '& > svg': { fontSize: 44, position: 'relative', zIndex: 1 },
          }}
        >
          {/* Sweeping light sheen across the medallion face. */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '42%',
              height: '100%',
              background: `linear-gradient(90deg, ${alpha('#ffffff', 0)} 0%, ${alpha('#ffffff', 0.6)} 50%, ${alpha('#ffffff', 0)} 100%)`,
              filter: 'blur(2px)',
              animation: anim(animated, `${sheenSweep} 5s ease-in-out 0.6s infinite`),
            }}
          />
          {icon}
        </Box>
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          animation: anim(animated, `${fadeUp} 0.5s ease 0.15s both`),
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          mt: 1,
          maxWidth: '46ch',
          color: 'text.secondary',
          lineHeight: 1.7,
          animation: anim(animated, `${fadeUp} 0.5s ease 0.22s both`),
        }}
      >
        {description}
      </Typography>

      {(primaryAction || secondaryAction) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems="center"
          justifyContent="center"
          sx={{
            mt: 4,
            animation: anim(animated, `${fadeUp} 0.5s ease 0.3s both`),
          }}
        >
          {primaryAction && (
            <Button
              variant={primaryAction.variant ?? 'contained'}
              size="large"
              startIcon={primaryAction.icon}
              onClick={primaryAction.onClick}
              sx={{ borderRadius: 2.5, px: 3, boxShadow: `0 10px 24px -12px ${alpha(green, 0.6)}` }}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant ?? 'outlined'}
              size="large"
              startIcon={secondaryAction.icon}
              onClick={secondaryAction.onClick}
              sx={{ borderRadius: 2.5, px: 3 }}
            >
              {secondaryAction.label}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
};

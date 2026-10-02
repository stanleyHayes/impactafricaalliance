import { keyframes } from '@emotion/react';
import { brandColors } from '@iaa/shared';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useState, type CSSProperties } from 'react';

/** Each piece falls from above the screen to below it, drifting sideways and turning. */
const fall = keyframes`
  0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 0; }
  6% { opacity: 1; }
  100% { transform: translate3d(var(--drift), 108vh, 0) rotate(var(--spin)); opacity: 0.9; }
`;

const COLORS = [brandColors.mint, brandColors.gold, '#7CF0C5', '#FFD24D', brandColors.white];
const PIECES = 90;
/** How long the shower lasts, from the first piece to the last landing. */
const SHOWER_MS = 4600;

/** A fixed spread rather than Math.random: every visit gets the same, even shower. */
const spread = (index: number, salt: number): number => {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const pieceStyle = (index: number): CSSProperties => {
  const size = 6 + spread(index, 2) * 8;
  const round = spread(index, 8) > 0.72;
  return {
    left: `${spread(index, 1) * 100}%`,
    width: size,
    height: round ? size : size * 0.45,
    borderRadius: round ? '50%' : 2,
    backgroundColor: COLORS[index % COLORS.length],
    animationDuration: `${Math.round(SHOWER_MS * (0.6 + spread(index, 4) * 0.4))}ms`,
    animationDelay: `${Math.round(spread(index, 3) * 1100)}ms`,
    ['--drift' as string]: `${Math.round((spread(index, 5) - 0.5) * 240)}px`,
    ['--spin' as string]: `${(spread(index, 6) > 0.5 ? 1 : -1) * Math.round(360 + spread(index, 7) * 540)}deg`,
  };
};

/**
 * A short shower of confetti in the brand's colours, played once and then removed. Nothing
 * at all for anyone who has asked their system for less motion.
 */
export const CelebrationBurst = (): JSX.Element | null => {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setFinished(true), SHOWER_MS + 1400);
    return () => window.clearTimeout(timer);
  }, []);

  if (reduceMotion || finished) {
    return null;
  }
  return (
    <Box
      aria-hidden
      data-testid="celebration"
      sx={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: (theme) => theme.zIndex.appBar + 1,
        '& > span': {
          position: 'absolute',
          top: 0,
          opacity: 0,
          animationName: `${fall}`,
          animationTimingFunction: 'cubic-bezier(0.2, 0.6, 0.35, 1)',
          animationFillMode: 'forwards',
        },
      }}
    >
      {Array.from({ length: PIECES }, (_, index) => (
        <span key={index} style={pieceStyle(index)} />
      ))}
    </Box>
  );
};

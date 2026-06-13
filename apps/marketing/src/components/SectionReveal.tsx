import Box from '@mui/material/Box';
import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionRevealProps {
  children: ReactNode;
  delay?: number;
  /** Stretch the wrapper to full width/height so a `height: 100%` child can equalise in a flex grid. */
  fillHeight?: boolean;
}

/** Fades and lifts its children into view on scroll. Respects reduced-motion. */
export const SectionReveal = ({
  children,
  delay = 0,
  fillHeight = false,
}: SectionRevealProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const fillSx = fillHeight
    ? { height: '100%', width: '100%', display: 'flex', flexDirection: 'column' as const }
    : undefined;
  if (reduceMotion) {
    return <Box sx={fillSx}>{children}</Box>;
  }
  return (
    <Box
      component={m.div}
      sx={fillSx}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </Box>
  );
};

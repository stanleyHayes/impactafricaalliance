import Box from '@mui/material/Box';
import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionRevealProps {
  children: ReactNode;
  delay?: number;
}

/** Fades and lifts its children into view on scroll. Respects reduced-motion. */
export const SectionReveal = ({ children, delay = 0 }: SectionRevealProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <Box>{children}</Box>;
  }
  return (
    <Box
      component={m.div}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </Box>
  );
};

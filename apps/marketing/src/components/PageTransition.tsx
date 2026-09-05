import Box from '@mui/material/Box';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { easing, rise } from '../theme/motion';

/**
 * Cross-fades routed pages with a short rise.
 *
 * Kept deliberately brief: a page transition that lingers reads as a slow site,
 * not a smooth one, so the outgoing page leaves in half the time the new one
 * takes to arrive.
 *
 * `mode="wait"` rather than "popLayout": the app mounts LazyMotion with
 * `domAnimation`, which excludes layout animation, and popLayout depends on it.
 */
export const PageTransition = ({ children }: { children: ReactNode }): JSX.Element => {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Box
        component={m.div}
        key={pathname}
        initial={{ opacity: 0, y: rise.sm }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.34, ease: easing.settle } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.16, ease: easing.standard } }}
        sx={{ minHeight: '60vh' }}
      >
        {children}
      </Box>
    </AnimatePresence>
  );
};

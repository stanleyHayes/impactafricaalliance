import Box from '@mui/material/Box';
import type { BoxProps } from '@mui/material/Box';
import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { inView, rise, riseChild, staggerParent, staticChild } from '../theme/motion';

interface StaggerGridProps extends Omit<BoxProps, 'children'> {
  children: ReactNode;
  /** Seconds between each child. Lower for long lists so the tail is not slow. */
  stagger?: number;
}

/**
 * Reveals its children in sequence as the group scrolls into view.
 *
 * Use on a grid or list; wrap each item in `StaggerItem`. One observer for the
 * whole group rather than one per card, so a twelve-item grid does not create
 * twelve observers or reveal in a ragged order.
 */
export const StaggerGrid = ({
  children,
  stagger = 0.06,
  ...boxProps
}: StaggerGridProps): JSX.Element => (
  <Box
    component={m.div}
    variants={staggerParent(stagger)}
    initial="hidden"
    whileInView="visible"
    viewport={inView}
    {...boxProps}
  >
    {children}
  </Box>
);

export const StaggerItem = ({
  children,
  distance = rise.md,
  ...boxProps
}: { children: ReactNode; distance?: number } & Omit<BoxProps, 'children'>): JSX.Element => {
  const reduceMotion = useReducedMotion();
  return (
    <Box
      component={m.div}
      variants={reduceMotion ? staticChild : riseChild(distance)}
      {...boxProps}
    >
      {children}
    </Box>
  );
};

import Box from '@mui/material/Box';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import { duration, easing, rise, transitions } from '../../../theme/motion';

const FILL = { display: 'flex', flex: 1, flexDirection: 'column' } as const;

/**
 * Moves between screens the way the rest of the site moves: the new screen
 * rises a little and settles, the old one fades up and away. Nothing slides
 * sideways, which would suggest pages in a carousel rather than one path.
 *
 * With reduced motion there is no movement at all; the screen is simply
 * replaced. `mode="wait"` lets the old screen leave before the new one
 * arrives, so focus lands on a heading that is already in place.
 */
export const ScreenTransition = ({
  screenKey,
  children,
}: {
  screenKey: string;
  children: ReactNode;
}): JSX.Element => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <Box key={screenKey} data-motion="none" sx={FILL}>
        {children}
      </Box>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Box
        component={m.div}
        key={screenKey}
        data-motion="rise"
        initial={{ opacity: 0, y: rise.md }}
        animate={{ opacity: 1, y: 0, transition: transitions.enter }}
        exit={{
          opacity: 0,
          y: -rise.sm,
          transition: { duration: duration.quick, ease: easing.standard },
        }}
        sx={FILL}
      >
        {children}
      </Box>
    </AnimatePresence>
  );
};

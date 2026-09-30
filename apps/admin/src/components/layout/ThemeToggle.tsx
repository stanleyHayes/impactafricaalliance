import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import GlobalStyles from '@mui/material/GlobalStyles';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useRef } from 'react';
import { flushSync } from 'react-dom';

import { skinned } from '../../theme/surfaces';
import { useThemeSettings } from '../../theme/ThemeContext';

import { topBarActionSkin } from './top-bar-action';

/**
 * The reveal itself. The browser snapshots the page before and after the
 * switch, and the new snapshot grows out of the button in a circle, so the
 * content stays visible throughout: nothing is painted over it.
 */
const revealStyles = {
  '@supports (view-transition-name: root)': {
    '::view-transition-old(root), ::view-transition-new(root)': {
      animation: 'none',
      mixBlendMode: 'normal',
    },
    '::view-transition-new(root)': {
      clipPath: 'circle(0% at var(--reveal-x, 50%) var(--reveal-y, 50%))',
      animation: 'admin-theme-reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
    },
    '@keyframes admin-theme-reveal': {
      to: { clipPath: 'circle(150% at var(--reveal-x, 50%) var(--reveal-y, 50%))' },
    },
  },
} as const;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Circular-reveal dark / light toggle for the admin console, the same reveal
 * the website uses.
 *
 * This used to grow an opaque circle in the new background colour over the
 * whole console and only switch the theme underneath it halfway through, so
 * for most of the animation the page was a blank sheet of the new colour.
 * A view transition animates real snapshots of both themes instead. The switch
 * runs inside flushSync so React has painted the new theme before the browser
 * takes the "after" snapshot. Browsers without view transitions, and anyone
 * who asks their system for less motion, get an instant switch.
 */
export const ThemeToggle = (): JSX.Element => {
  const { mode, toggleMode } = useThemeSettings();
  const isDark = mode === 'dark';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const handleClick = (): void => {
    if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
      toggleMode();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const root = document.documentElement.style;
      root.setProperty('--reveal-x', `${rect.left + rect.width / 2}px`);
      root.setProperty('--reveal-y', `${rect.top + rect.height / 2}px`);
    }
    document.startViewTransition(() => {
      flushSync(toggleMode);
    });
  };

  return (
    <>
      <GlobalStyles styles={revealStyles} />
      <Tooltip title={label}>
        <IconButton
          id="admin-theme-toggle"
          ref={buttonRef}
          size="small"
          aria-label={label}
          onClick={handleClick}
          // A top-bar action: Classic keeps its tinted square; a skin makes it
          // one of its raised controls, like the theme picker beside it.
          sx={skinned(
            {
              color: 'text.secondary',
              bgcolor: (t) =>
                isDark ? t.palette.primary.dark + '22' : t.palette.primary.main + '12',
              border: (t) => `1px solid ${t.palette.divider}`,
              '&:hover': {
                color: 'text.primary',
                bgcolor: (t) => t.palette.primary.main + '18',
              },
            },
            topBarActionSkin,
          )}
        >
          {isDark ? (
            <LightModeOutlinedIcon fontSize="small" />
          ) : (
            <DarkModeOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </>
  );
};

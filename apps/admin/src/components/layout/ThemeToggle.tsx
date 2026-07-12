import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Portal from '@mui/material/Portal';
import Tooltip from '@mui/material/Tooltip';
import { useRef, useState } from 'react';

import { createAppTheme } from '../../theme/theme';
import { useThemeSettings } from '../../theme/ThemeContext';

interface RevealState {
  x: number;
  y: number;
  size: number;
  color: string;
  active: boolean;
}

/** Circular-reveal dark / light toggle for the admin console. */
export const ThemeToggle = (): JSX.Element => {
  const themeSettings = useThemeSettings();
  const { mode, toggleMode } = themeSettings;
  const isDark = mode === 'dark';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const animatingRef = useRef(false);

  const handleClick = (): void => {
    if (animatingRef.current) return;

    const button = buttonRef.current;
    if (!button) {
      toggleMode();
      return;
    }

    const rect = button.getBoundingClientRect();
    const next = isDark ? 'light' : 'dark';
    const nextTheme = createAppTheme(themeSettings.preset, next);
    const color = nextTheme.palette.background.default;
    const radius = Math.hypot(window.innerWidth, window.innerHeight);

    animatingRef.current = true;
    setReveal({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      size: radius * 2,
      color,
      active: false,
    });

    requestAnimationFrame(() => {
      setReveal((prev) => (prev ? { ...prev, active: true } : null));
    });

    window.setTimeout(() => {
      toggleMode();
    }, 350);

    window.setTimeout(() => {
      setReveal(null);
      animatingRef.current = false;
    }, 750);
  };

  return (
    <>
      <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <IconButton
          id="admin-theme-toggle"
          ref={buttonRef}
          size="small"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={handleClick}
          sx={{
            color: 'text.secondary',
            bgcolor: (t) =>
              isDark ? t.palette.primary.dark + '22' : t.palette.primary.main + '12',
            border: (t) => `1px solid ${t.palette.divider}`,
            '&:hover': {
              color: 'text.primary',
              bgcolor: (t) => t.palette.primary.main + '18',
            },
          }}
        >
          {isDark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      {reveal && (
        <Portal>
          <Box
            aria-hidden
            sx={{
              position: 'fixed',
              left: reveal.x,
              top: reveal.y,
              width: reveal.size,
              height: reveal.size,
              ml: -reveal.size / 2,
              mt: -reveal.size / 2,
              borderRadius: '50%',
              bgcolor: reveal.color,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: reveal.active ? 'scale(1)' : 'scale(0)',
              transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </Portal>
      )}
    </>
  );
};

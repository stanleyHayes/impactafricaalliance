import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import GlobalStyles from '@mui/material/GlobalStyles';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { revealModeChange, revealStyles } from '../../theme/mode-reveal';
import { skinned } from '../../theme/surfaces';
import { useThemeSettings } from '../../theme/ThemeContext';

import { topBarActionSkin } from './top-bar-action';

/**
 * Circular-reveal dark / light toggle for the admin console, the same reveal
 * the website uses. The reveal lives in theme/mode-reveal.ts, which the mode
 * cards in Settings share, so both change mode the same way.
 *
 * This used to grow an opaque circle in the new background colour over the
 * whole console and only switch the theme underneath it halfway through, so
 * for most of the animation the page was a blank sheet of the new colour.
 * A view transition animates real snapshots of both themes instead, growing
 * out of this button.
 */
export const ThemeToggle = (): JSX.Element => {
  const { mode, toggleMode } = useThemeSettings();
  const isDark = mode === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <>
      {/* The reveal's styles, once for the whole console: Settings' mode cards use them too. */}
      <GlobalStyles styles={revealStyles} />
      <Tooltip title={label}>
        <IconButton
          id="admin-theme-toggle"
          size="small"
          aria-label={label}
          onClick={(event) => revealModeChange(event.currentTarget, toggleMode)}
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

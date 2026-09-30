import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

import { focusRingSx, skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

/** A style object `skinned()` accepts (never `null`). */
type Sx = NonNullable<SystemStyleObject<Theme>>;

/**
 * The top bar's small actions (theme, dark mode, notifications, the account
 * pill, a page's help button) each have a Classic look of their own: a faint
 * tinted square, a hairline, a tinted hover. Kept exactly in Classic through
 * `skinned()`, those looks would otherwise block a skin, because what `sx`
 * sets wins over the theme. These are what a skin lays over them instead, so
 * every action in the bar becomes one of the skin's raised controls and they
 * read as one set (the theme picker's trigger uses the same recipe).
 */
export const topBarActionSkin: Sx = {
  bgcolor: tokenVar('controlBg'),
  border: tokenVar('surfaceRaisedBorder'),
  '&:hover': { color: 'text.primary', bgcolor: tokenVar('controlBg') },
};

/**
 * An action whose panel is open is shown pressed into the bar, the skin's
 * "toggled on" state, rather than Classic's tint.
 */
export const topBarActionOpenSkin: Sx = {
  boxShadow: tokenVar('controlPressedShadow'),
};

/**
 * The account pill is a ButtonBase, which no theme override reaches, so a
 * skin gives it the whole control recipe itself: raised at rest and under the
 * pointer, pressed while held, the skin's focus ring. Its border is restated
 * under the pointer so Classic's primary hover edge does not show through.
 */
export const pillActionSkin: Sx = {
  ...surfaceSx.raised,
  bgcolor: tokenVar('controlBg'),
  boxShadow: tokenVar('controlShadow'),
  '&:hover': {
    bgcolor: tokenVar('controlBg'),
    border: tokenVar('surfaceRaisedBorder'),
    boxShadow: tokenVar('controlHoverShadow'),
  },
  '&:active': { boxShadow: tokenVar('controlPressedShadow') },
  '&:focus-visible': focusRingSx,
};

/**
 * The header strip of a top-bar panel (notifications, the account menu):
 * Classic's fading primary tint; in a skin, the tinted header its section
 * cards carry, so the strip's text is held to the contrast the skin checks.
 */
export const panelHeaderSx = skinned(
  {
    background: (t) =>
      `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)}, ${alpha(
        t.palette.primary.main,
        0,
      )})`,
  },
  { background: 'none', ...surfaceSx.tinted },
);

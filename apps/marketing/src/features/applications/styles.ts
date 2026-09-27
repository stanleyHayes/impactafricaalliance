import { alpha, type SxProps, type Theme } from '@mui/material/styles';

/**
 * Shared styling for the applicant flow. Large type and generous targets on
 * purpose: most applicants arrive on a phone, often on a slow connection.
 */

/**
 * Hidden on screen, still read by screen readers. Sizes are strings on
 * purpose: in `sx` a bare `1` means 100% and `-1` means one spacing unit.
 */
export const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

/** The small uppercase line above a heading. */
export const EYEBROW_SX: SxProps<Theme> = {
  color: 'text.secondary',
  fontSize: '0.8125rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

/** A screen's main heading, in the display face. */
export const SCREEN_HEADING_SX: SxProps<Theme> = {
  fontSize: { xs: '2rem', sm: '2.4rem', md: '2.9rem' },
  lineHeight: 1.12,
  overflowWrap: 'break-word',
  scrollMarginTop: 96,
  '&:focus': { outline: 'none' },
  '&:focus-visible': { outline: 'none' },
};

/** A question's own label. */
export const QUESTION_SX: SxProps<Theme> = {
  display: 'block',
  color: 'text.primary',
  fontSize: { xs: '1.1875rem', md: '1.375rem' },
  fontWeight: 600,
  lineHeight: 1.35,
  overflowWrap: 'break-word',
};

/** Text inputs sized for thumbs and legible without zooming (16 px or more stops iOS zooming in). */
export const INPUT_SX: SxProps<Theme> = {
  '& .MuiInputBase-input': {
    fontSize: { xs: '1.125rem', md: '1.25rem' },
    lineHeight: 1.5,
    py: 1.75,
    px: 2,
  },
  // A textarea's padding sits on its wrapper, not on the textarea itself.
  '& .MuiInputBase-multiline': { px: 2, py: 1.75 },
  '& .MuiInputBase-multiline .MuiInputBase-input': { px: 0, py: 0 },
};

const cardBorder = (theme: Theme, selected: boolean, invalid: boolean): string => {
  if (selected) {
    return theme.palette.primary.main;
  }
  return invalid ? theme.palette.error.main : theme.palette.divider;
};

/**
 * A tappable option card for radio buttons and tick-boxes. The selected card
 * is outlined and tinted, and keyboard focus draws a clear ring around the
 * whole card rather than only the small control inside it.
 */
export const optionCardSx = (selected: boolean, invalid: boolean) => (theme: Theme) => ({
  m: 0,
  width: '100%',
  minHeight: 56,
  px: 1.5,
  py: 1,
  alignItems: 'center',
  borderRadius: 3,
  border: '1.5px solid',
  borderColor: cardBorder(theme, selected, invalid),
  bgcolor: selected
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.1 : 0.14)
    : theme.palette.background.paper,
  cursor: 'pointer',
  transition: 'border-color 180ms ease, background-color 180ms ease',
  '&:hover': { borderColor: theme.palette.primary.main },
  '&:has(input:focus-visible)': {
    outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
    outlineOffset: 2,
  },
  '& .MuiFormControlLabel-label': {
    flex: 1,
    minWidth: 0,
    py: 0.75,
    fontSize: { xs: '1.0625rem', md: '1.125rem' },
    fontWeight: 500,
    lineHeight: 1.45,
    overflowWrap: 'anywhere',
  },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
});

/**
 * Text buttons in the flow (Edit, Remove, Retry, Cancel) take the body text
 * colour: the theme's mint is too pale on white and sand to read as text.
 */
export const QUIET_BUTTON_SX = { color: 'text.primary', fontWeight: 700 } as const;

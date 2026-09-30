import { skinned, tokenVar } from '../../theme/surfaces';

/**
 * The chrome the date and date-time pickers share.
 *
 * Classic's pickers have their own look: a 10px field, and a 12px calendar
 * panel with a hairline and a mid shadow. Set in `sx`, that look would block
 * the skin, so each part keeps it exactly in Classic and takes the skin's
 * field corner, overlay edge, shadow and corner everywhere else.
 */

/** The field's outline. Classic's 10px is the house field corner, so the token reproduces it. */
export const pickerFieldSx = {
  '& .MuiPickersOutlinedInput-root': { borderRadius: tokenVar('inputRadius') },
};

/** The calendar panel beside the field on a desktop: the skin's overlay. */
export const pickerDesktopPaperSx = skinned(
  { borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 8 },
  {
    borderRadius: tokenVar('overlayRadius'),
    border: tokenVar('overlayBorder'),
    boxShadow: tokenVar('overlayShadow'),
  },
);

/** The calendar dialog on a phone: the skin's dialog corner and edge. */
export const pickerMobilePaperSx = skinned(
  { borderRadius: 3, border: 1, borderColor: 'divider' },
  { borderRadius: tokenVar('dialogRadius'), border: tokenVar('overlayBorder') },
);

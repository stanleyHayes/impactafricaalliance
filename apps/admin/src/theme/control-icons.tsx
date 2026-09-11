import Box from '@mui/material/Box';

/**
 * Hand-drawn tick and radio marks, used in place of MUI's defaults.
 *
 * MUI ships a filled square and a filled circle that look like every other
 * Material app. These are built from the console's own tokens — the same
 * rounding as its cards, its border colour when off and its primary when on —
 * so a checkbox reads as part of this product rather than of the toolkit.
 *
 * Wired in as `defaultProps` on MuiCheckbox and MuiRadio, so every checkbox
 * and radio in the console gets them without touching a call site.
 */

const BOX_SIZE = 20;

const base = {
  width: BOX_SIZE,
  height: BOX_SIZE,
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
  border: '2px solid',
  transition: 'background-color 120ms ease, border-color 120ms ease',
} as const;

export const CheckboxIcon = (): JSX.Element => (
  <Box
    sx={{
      ...base,
      borderRadius: 1.5,
      borderColor: 'text.disabled',
      bgcolor: 'background.paper',
      'input:hover ~ &, .MuiCheckbox-root:hover &': { borderColor: 'primary.main' },
    }}
  />
);

export const CheckboxCheckedIcon = (): JSX.Element => (
  <Box
    sx={{
      ...base,
      borderRadius: 1.5,
      borderColor: 'primary.main',
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
    }}
  >
    <Box
      component="svg"
      viewBox="0 0 16 16"
      aria-hidden
      sx={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 2.6 }}
    >
      <path d="M3 8.4 6.3 11.6 13 4.8" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  </Box>
);

export const CheckboxIndeterminateIcon = (): JSX.Element => (
  <Box
    sx={{
      ...base,
      borderRadius: 1.5,
      borderColor: 'primary.main',
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
    }}
  >
    <Box sx={{ width: 10, height: 2.5, borderRadius: 1, bgcolor: 'currentColor' }} />
  </Box>
);

export const RadioIcon = (): JSX.Element => (
  <Box
    sx={{
      ...base,
      borderRadius: '50%',
      borderColor: 'text.disabled',
      bgcolor: 'background.paper',
      '.MuiRadio-root:hover &': { borderColor: 'primary.main' },
    }}
  />
);

export const RadioCheckedIcon = (): JSX.Element => (
  <Box sx={{ ...base, borderRadius: '50%', borderColor: 'primary.main', bgcolor: 'transparent' }}>
    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
  </Box>
);

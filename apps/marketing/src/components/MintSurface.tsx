import Box from '@mui/material/Box';
import type { BoxProps } from '@mui/material/Box';

/**
 * A mint (`primary.dark`) surface that automatically renders its children in the
 * deep-forest dark colour for accessible contrast. Use this for solid mint
 * cards/bands instead of manually overriding every child text colour.
 */
export const MintSurface = ({ children, sx, ...props }: BoxProps): JSX.Element => (
  <Box
    {...props}
    sx={{
      bgcolor: 'primary.dark',
      color: 'common.black',
      // Descendant overrides beat the single-class selectors most children use.
      '& .MuiTypography-root': { color: 'common.black' },
      '& .MuiLink-root, & a': { color: 'common.black' },
      '& .MuiSvgIcon-root': { color: 'common.black' },
      '& .MuiChip-root': {
        color: 'common.black',
        borderColor: 'rgba(14,42,34,0.16)',
        bgcolor: 'rgba(14,42,34,0.08)',
      },
      '& .MuiDivider-root': { borderColor: 'rgba(14,42,34,0.14)' },
      // Helper class for subtle glass-like boxes (icon containers, etc.)
      '& .mint-glass': {
        borderColor: 'rgba(14,42,34,0.16)',
        bgcolor: 'rgba(14,42,34,0.08)',
      },
      // Keep contained secondary buttons legible (gold bg / black text)
      '& .MuiButton-containedSecondary': { color: 'common.black' },
      ...sx,
    }}
  >
    {children}
  </Box>
);

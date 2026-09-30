import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { skinned, surfaceSx } from '../../theme/surfaces';

interface AccountSectionHeaderProps {
  icon: JSX.Element;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Compact heading used inside the shared account workspace.
 *
 * Classic's tinted band and hairline icon square are its own; in a skin the
 * band is the skin's page-header panel and the square its icon tile, so the
 * account pages open like every other page. The watermark stays as it is.
 */
export const AccountSectionHeader = ({
  icon,
  eyebrow = 'Account workspace',
  title,
  description,
  action,
}: AccountSectionHeaderProps): JSX.Element => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    alignItems={{ xs: 'flex-start', sm: 'center' }}
    justifyContent="space-between"
    spacing={2}
    sx={skinned(
      {
        mb: 3,
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.065),
      },
      surfaceSx.hero,
    )}
  >
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        right: -20,
        bottom: -35,
        pointerEvents: 'none',
        color: (theme) => alpha(theme.palette.text.primary, 0.055),
        '& svg': { fontSize: 170 },
      }}
    >
      {icon}
    </Box>
    <Stack direction="row" spacing={1.75} alignItems="center">
      <Box
        aria-hidden
        sx={skinned(
          {
            display: 'grid',
            width: 48,
            height: 48,
            flexShrink: 0,
            placeItems: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2.5,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'text.primary',
            '& svg': { fontSize: 25 },
          },
          surfaceSx.tile,
        )}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="overline"
          sx={{ color: 'text.primary', fontWeight: 750, letterSpacing: 1.2, lineHeight: 1 }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h2" sx={{ mt: 0.35, fontSize: { xs: '1.55rem', md: '1.9rem' } }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
          {description}
        </Typography>
      </Box>
    </Stack>
    {action && <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>{action}</Box>}
  </Stack>
);

interface AccountPanelProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Classic's panel is the common card with a long soft shadow of its own; a
 * skin's is the skin's card, with the skin's depth instead.
 */
const accountPanelSx = skinned(
  {
    overflow: 'hidden',
    border: 1,
    borderColor: 'divider',
    borderRadius: 3,
    bgcolor: 'background.paper',
    boxShadow: '0 24px 54px -48px rgba(18,63,41,0.75)',
  },
  surfaceSx.card,
);

/** Shared bordered surface for account forms, details, and preferences. */
export const AccountPanel = ({ children, sx }: AccountPanelProps): JSX.Element => (
  <Box sx={[accountPanelSx, ...(Array.isArray(sx) ? sx : [sx])]}>{children}</Box>
);

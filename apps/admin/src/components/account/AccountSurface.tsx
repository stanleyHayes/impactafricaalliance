import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface AccountSectionHeaderProps {
  icon: JSX.Element;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/** Compact heading used inside the shared account workspace. */
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
    sx={{ mb: 3 }}
  >
    <Stack direction="row" spacing={1.75} alignItems="center">
      <Box
        aria-hidden
        sx={{
          display: 'grid',
          width: 48,
          height: 48,
          flexShrink: 0,
          placeItems: 'center',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2.5,
          bgcolor: 'alpha(brandColors.forest, 0.07)',
          color: 'text.primary',
          '& svg': { fontSize: 25 },
        }}
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
        <Typography variant="h4" sx={{ mt: 0.35, fontSize: { xs: '1.55rem', md: '1.9rem' } }}>
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

/** Shared bordered surface for account forms, details, and preferences. */
export const AccountPanel = ({ children, sx }: AccountPanelProps): JSX.Element => (
  <Box
    sx={{
      overflow: 'hidden',
      border: 1,
      borderColor: 'divider',
      borderRadius: 3,
      bgcolor: 'background.paper',
      boxShadow: '0 24px 54px -48px rgba(18,63,41,0.75)',
      ...sx,
    }}
  >
    {children}
  </Box>
);

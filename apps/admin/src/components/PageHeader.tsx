import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import type { PageGuide } from './PageHelp';
import { PageHelp } from './PageHelp';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional leading icon shown in a tinted square. */
  icon?: JSX.Element;
  /** Optional count chip rendered beside the title. */
  count?: number;
  /** Optional right-aligned action (typically a Button). */
  action?: ReactNode;
  /** Optional contextual help popover for this page. */
  help?: PageGuide;
}

/** Consistent page header: branded context, title, count, description, and optional action. */
export const PageHeader = ({
  title,
  description,
  icon,
  count,
  action,
  help,
}: PageHeaderProps): JSX.Element => {
  const theme = useTheme();
  const green = theme.palette.primary.main;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={{
        position: 'relative',
        mb: 3,
        pb: 2.5,
        borderBottom: `1px solid ${alpha(green, 0.11)}`,
        '&::after': {
          position: 'absolute',
          bottom: -1,
          left: 0,
          width: 72,
          height: 2,
          borderRadius: 99,
          bgcolor: 'secondary.main',
          content: '""',
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, maxWidth: '100%' }}>
        {icon && (
          <Box
            aria-hidden
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.primary',
              bgcolor: alpha(green, 0.1),
              border: `1px solid ${alpha(green, 0.16)}`,
              '& > svg': { fontSize: 26 },
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Typography
              variant="h4"
              sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' }, lineHeight: 1.15 }}
            >
              {title}
            </Typography>
            {typeof count === 'number' && (
              <Chip
                size="small"
                label={count}
                sx={{ fontWeight: 700, color: 'text.primary', bgcolor: alpha(green, 0.1) }}
              />
            )}
          </Stack>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        {help && <PageHelp guide={help} />}
      </Stack>

      {action && <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>{action}</Box>}
    </Stack>
  );
};

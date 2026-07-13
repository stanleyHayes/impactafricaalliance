import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Consistent paper chrome for every admin dialog. */
export const dialogPaperSx: SxProps<Theme> = {
  borderRadius: 3.5,
  border: '1px solid',
  borderColor: 'divider',
  backgroundImage: 'none',
};

interface DialogHeaderProps {
  /** Optional leading icon shown in a tinted square (matches PageHeader). */
  icon?: ReactNode;
  /** Small uppercase eyebrow above the title. */
  eyebrow?: string;
  title: string;
  description?: string;
  onClose?: () => void;
  /** 'error' tints the icon square for destructive dialogs. */
  tone?: 'default' | 'error';
}

/**
 * Branded dialog header shared by every admin dialog: tinted icon square,
 * eyebrow + title + description, close button, and the signature gold tick.
 */
export const DialogHeader = ({
  icon,
  eyebrow,
  title,
  description,
  onClose,
  tone = 'default',
}: DialogHeaderProps): JSX.Element => {
  const theme = useTheme();
  const accent = tone === 'error' ? theme.palette.error.main : theme.palette.primary.main;

  return (
    <Box
      sx={{
        position: 'relative',
        px: 3,
        pt: 2.75,
        pb: 2.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&::after': {
          position: 'absolute',
          bottom: -1,
          left: 24,
          width: 56,
          height: 2,
          borderRadius: 99,
          bgcolor: 'secondary.main',
          content: '""',
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {icon && (
          <Box
            aria-hidden
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.primary',
              bgcolor: alpha(accent, 0.1),
              border: `1px solid ${alpha(accent, 0.18)}`,
              '& > svg': { fontSize: 24 },
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {eyebrow && (
            <Typography
              variant="overline"
              sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, letterSpacing: '0.1em' }}
            >
              {eyebrow}
            </Typography>
          )}
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {onClose && (
          <IconButton aria-label="Close dialog" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}>
            <CloseRoundedIcon />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};

interface DialogFooterProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/** Consistent dialog action bar: hairline divider, muted backdrop, padded buttons. */
export const DialogFooter = ({ children, sx }: DialogFooterProps): JSX.Element => (
  <DialogActions
    sx={{
      borderTop: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.default',
      px: 3,
      py: 2,
      gap: 1.5,
      '& .MuiButton-root': { borderRadius: 2.5, px: 2.5 },
      ...sx,
    }}
  >
    {children}
  </DialogActions>
);

/** Card wrapper for form sections inside dialog content areas. */
export const dialogSectionSx: SxProps<Theme> = {
  p: { xs: 2, sm: 2.5 },
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2.5,
  bgcolor: 'background.paper',
};

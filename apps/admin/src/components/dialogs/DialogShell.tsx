import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

/**
 * Consistent paper chrome for every admin dialog.
 *
 * A plain object, because callers spread it into their own paper `sx`. The
 * dialog itself follows the skin from the theme; this keeps its hairline and
 * sheen on the skin's tokens (Classic: a divider hairline, no image) and its
 * corner on the skin's dialog radius, except in Classic, whose dialogs have
 * always been a little squarer than the theme's.
 */
export const dialogPaperSx: SxProps<Theme> = {
  borderRadius: (theme: Theme) =>
    !theme.skin || theme.skin === 'classic' ? 3.5 : tokenVar('dialogRadius'),
  border: tokenVar('overlayBorder'),
  backgroundImage: tokenVar('surfaceSheen'),
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
            // Classic's tinted square. In a skin, the skin's icon tile; a
            // destructive dialog's square keeps its error tint and takes the
            // tile's depth.
            sx={skinned(
              {
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
              },
              tone === 'error' ? { boxShadow: tokenVar('tileShadow') } : surfaceSx.tile,
            )}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {eyebrow && (
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: '0.1em',
              }}
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

/**
 * The footer's muted strip and button corners. Classic's page colour and
 * 10px buttons; in a skin, the skin's well (translucent in Glass, where a
 * solid page colour would be an opaque band across the frosted dialog) and
 * the skin's own button radius.
 */
const footerSkinSx = skinned(
  { bgcolor: 'background.default', '& .MuiButton-root': { borderRadius: 2.5 } },
  {
    bgcolor: tokenVar('surfaceInsetBg'),
    '& .MuiButton-root': { borderRadius: tokenVar('buttonRadius') },
  },
);

/** Consistent dialog action bar: hairline divider, muted backdrop, padded buttons. */
export const DialogFooter = ({ children, sx }: DialogFooterProps): JSX.Element => (
  <DialogActions
    sx={[
      {
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 3,
        py: 2,
        gap: 1.5,
        '& .MuiButton-root': { px: 2.5 },
      },
      footerSkinSx,
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </DialogActions>
);

/**
 * The body of a dialog whose content sits in cards, for `DialogContent`.
 * Classic paints it in the page colour; a skin sinks it into the dialog as a
 * well (in Glass a solid page colour would be an opaque band across the
 * frosted panel). An `sx` callback: put it in an `sx` array.
 */
export const dialogBodySx = skinned(
  { bgcolor: 'background.default' },
  { bgcolor: tokenVar('surfaceInsetBg') },
);

/** Card wrapper for form sections inside dialog content areas (the skin's card). */
export const dialogSectionSx: SxProps<Theme> = {
  p: { xs: 2, sm: 2.5 },
  borderRadius: 2.5,
  ...surfaceSx.card,
};

import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { skinned, tokenVar } from '../../theme/surfaces';
import type { ThemePresetKey } from '../../theme/theme';
import { useThemeSettings } from '../../theme/ThemeContext';
import { PalettePicker, SkinPicker } from '../theme/AppearancePickers';

/**
 * The top bar's theme popover: the palettes, then the skins, each chosen by
 * seeing a miniature of it. The pickers are shared with the Appearance panel
 * in Settings (components/theme/AppearancePickers.tsx), so the two show the
 * same choices; a choice here applies and closes the popover.
 *
 * The skins are a compact list under the palettes, and the panel is capped
 * below the top bar with its own scroll. A taller panel would otherwise be
 * pushed up over the top bar by the popover's positioning, away from the
 * button that opened it; this way the palettes sit exactly where they always
 * have and the skins follow them.
 */
export const ThemeSelector = (): JSX.Element => {
  const { preset, setPreset, mode, skin, setSkin } = useThemeSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title="Choose theme">
        <IconButton
          id="admin-theme-selector"
          size="small"
          aria-label="Choose theme"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(event) => setAnchor(event.currentTarget)}
          // A top-bar action: Classic keeps its tinted square; a skin makes it
          // one of its raised controls.
          sx={skinned(
            {
              color: 'text.secondary',
              bgcolor: (t) => `${t.palette.primary.main}12`,
              border: (t) => `1px solid ${t.palette.divider}`,
              '&:hover': { color: 'text.primary', bgcolor: (t) => `${t.palette.primary.main}18` },
            },
            {
              bgcolor: tokenVar('controlBg'),
              border: tokenVar('surfaceRaisedBorder'),
              '&:hover': { color: 'text.primary', bgcolor: tokenVar('controlBg') },
            },
          )}
        >
          <PaletteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: skinned(
              {
                mt: 1.25,
                p: 2,
                width: { xs: 300, sm: 460 },
                // Below the top bar, whatever the screen height: the panel
                // scrolls rather than being moved up over its button.
                maxHeight: 'calc(100dvh - 88px)',
                borderRadius: 4,
                border: 1,
                borderColor: 'divider',
              },
              { border: tokenVar('overlayBorder') },
            ),
          },
        }}
      >
        <Box sx={{ mb: 1.75 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Console theme</Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.25 }}>
            Applies straight away, and only for you. The website is not affected.
          </Typography>
        </Box>
        <PalettePicker
          preset={preset}
          mode={mode}
          onSelect={(next) => {
            setPreset(next);
            setAnchor(null);
          }}
        />

        <Divider sx={{ my: 2 }} />
        <Box sx={{ mb: 1.5 }}>
          <Typography component="h2" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
            Skin
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.25 }}>
            How surfaces and controls are shaped. Works with every palette, light or dark.
          </Typography>
        </Box>
        <SkinPicker
          preset={preset}
          mode={mode}
          skin={skin}
          onSelect={(next) => {
            setSkin(next);
            setAnchor(null);
          }}
        />
      </Popover>
    </>
  );
};

export type { ThemePresetKey };

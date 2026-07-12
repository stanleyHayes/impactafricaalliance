import CheckIcon from '@mui/icons-material/Check';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { THEME_PRESETS } from '../../theme/theme';
import { useThemeSettings } from '../../theme/ThemeContext';

/** Theme-preset picker: switches between brand palettes (IAA, Aura, Ocean, Sunset). */
export const ThemeSelector = (): JSX.Element => {
  const { preset, setPreset } = useThemeSettings();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title="Choose theme">
        <IconButton
          id="admin-theme-selector"
          size="small"
          aria-label="Choose theme"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{
            color: 'text.secondary',
            bgcolor: (t) => t.palette.primary.main + '12',
            border: (t) => `1px solid ${t.palette.divider}`,
            '&:hover': {
              color: 'text.primary',
              bgcolor: (t) => t.palette.primary.main + '18',
            },
          }}
        >
          <PaletteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.25,
              minWidth: 200,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
            },
          },
        }}
      >
        <Typography variant="caption" sx={{ px: 2, py: 0.75, display: 'block', color: 'text.secondary' }}>
          Theme
        </Typography>
        {THEME_PRESETS.map((p) => (
          <MenuItem
            key={p.key}
            selected={preset === p.key}
            onClick={() => {
              setPreset(p.key);
              setAnchor(null);
            }}
            sx={{ gap: 1.5 }}
          >
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: p.iconColor,
                border: 1,
                borderColor: 'divider',
              }}
            />
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
              {p.label}
            </Typography>
            {preset === p.key && <CheckIcon fontSize="small" sx={{ color: 'primary.main' }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

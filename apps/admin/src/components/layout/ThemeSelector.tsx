import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { THEME_PRESETS, type ThemePreset, type ThemePresetKey } from '../../theme/theme';
import { useThemeSettings } from '../../theme/ThemeContext';

/**
 * A palette chosen by seeing it, not by reading its name.
 *
 * This was a list of four words with a coloured dot beside each, which asks
 * the reader to imagine what "Ocean" does to a console they are looking at.
 * Each card now paints a miniature of the real thing in that palette — canvas,
 * sidebar, card, primary button — so the choice is made by looking.
 */
export const ThemeSelector = (): JSX.Element => {
  const { preset, setPreset, mode } = useThemeSettings();
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
          sx={{
            color: 'text.secondary',
            bgcolor: (t) => `${t.palette.primary.main}12`,
            border: (t) => `1px solid ${t.palette.divider}`,
            '&:hover': { color: 'text.primary', bgcolor: (t) => `${t.palette.primary.main}18` },
          }}
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
            sx: {
              mt: 1.25,
              p: 2,
              width: { xs: 300, sm: 460 },
              borderRadius: 4,
              border: 1,
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ mb: 1.75 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Console theme</Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.25 }}>
            Applies straight away, and only for you. The website is not affected.
          </Typography>
        </Box>
        <Box
          role="radiogroup"
          aria-label="Console theme"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          {THEME_PRESETS.map((option) => (
            <PresetCard
              key={option.key}
              option={option}
              mode={mode}
              selected={preset === option.key}
              onSelect={() => {
                setPreset(option.key);
                setAnchor(null);
              }}
            />
          ))}
        </Box>
      </Popover>
    </>
  );
};

/**
 * The console in miniature: canvas, sidebar with its active row, a card and a
 * primary button. Drawn from the preset's own palette rather than the active
 * one, so each card shows what picking it would do.
 */
const PresetPreview = ({
  option,
  mode,
}: {
  option: ThemePreset;
  mode: 'light' | 'dark';
}): JSX.Element => {
  const palette = option[mode];
  const primary = (palette.primary as { main: string }).main;
  return (
    <Box
      aria-hidden
      sx={{
        height: 78,
        display: 'flex',
        bgcolor: palette.canvas,
        borderBottom: 1,
        borderColor: palette.divider,
      }}
    >
      <Box
        sx={{
          width: 34,
          flexShrink: 0,
          bgcolor: palette.background.paper,
          borderRight: `1px solid ${palette.divider}`,
          p: 0.75,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.6,
        }}
      >
        <Box sx={{ height: 6, borderRadius: 0.5, bgcolor: primary }} />
        <Box sx={{ height: 5, borderRadius: 0.5, bgcolor: palette.text.secondary, opacity: 0.3 }} />
        <Box sx={{ height: 5, borderRadius: 0.5, bgcolor: palette.text.secondary, opacity: 0.3 }} />
      </Box>
      <Box sx={{ flex: 1, p: 1, display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
        <Box sx={{ height: 6, width: '55%', borderRadius: 0.5, bgcolor: palette.text.primary }} />
        <Box
          sx={{
            flex: 1,
            borderRadius: 1,
            bgcolor: palette.background.paper,
            border: `1px solid ${palette.cardBorder}`,
            p: 0.75,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <Box sx={{ height: 11, width: 34, borderRadius: 0.75, bgcolor: primary }} />
        </Box>
      </Box>
    </Box>
  );
};

const PresetCard = ({
  option,
  mode,
  selected,
  onSelect,
}: {
  option: ThemePreset;
  mode: 'light' | 'dark';
  selected: boolean;
  onSelect: () => void;
}): JSX.Element => (
  <ButtonBase
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      textAlign: 'left',
      overflow: 'hidden',
      borderRadius: 3,
      border: 2,
      borderColor: selected ? 'primary.main' : 'divider',
      bgcolor: 'background.paper',
      color: 'text.primary',
      transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
      boxShadow: selected ? 4 : 0,
      '&:hover': { borderColor: selected ? 'primary.main' : 'text.secondary' },
      '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
    }}
  >
    <PresetPreview option={option} mode={mode} />
    <Box sx={{ p: 1.5, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          aria-hidden
          sx={{
            width: 14,
            height: 14,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: option.iconColor,
            border: 1,
            borderColor: 'divider',
          }}
        />
        <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.82rem', flex: 1 }}>
          {option.label}
        </Typography>
        {selected && <CheckRoundedIcon sx={{ fontSize: 17, color: 'primary.main' }} />}
      </Box>
      <Typography
        component="span"
        sx={{
          display: 'block',
          mt: 0.5,
          color: 'text.secondary',
          fontSize: '0.72rem',
          lineHeight: 1.45,
        }}
      >
        {option.description}
      </Typography>
    </Box>
  </ButtonBase>
);

export type { ThemePresetKey };

import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

import {
  THEME_SKINS,
  toCssVars,
  type SkinDefinition,
  type SkinKey,
  type SkinTokens,
} from '../../theme/skins';
import { choiceSx, skinned, surfaceSx, tokenVar } from '../../theme/surfaces';
import {
  createAppTheme,
  THEME_PRESETS,
  type ThemePreset,
  type ThemePresetKey,
} from '../../theme/theme';
import { useThemeSettings } from '../../theme/ThemeContext';

/**
 * A palette, and a skin, chosen by seeing them rather than by reading their names.
 *
 * This was a list of four words with a coloured dot beside each, which asks
 * the reader to imagine what "Ocean" does to a console they are looking at.
 * Each card now paints a miniature of the real thing in that palette — canvas,
 * sidebar, card, primary button — so the choice is made by looking.
 *
 * The skin section below works the same way: each miniature is painted with
 * that skin's own tokens in the palette and mode already in use (canvas, a
 * card, a field and a button), so it shows what picking it would do to this
 * console, not to a stock example.
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
        <RadioGrid label="Console theme">
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
        </RadioGrid>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ mb: 1.5 }}>
          <Typography component="h2" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
            Skin
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.25 }}>
            How surfaces and controls are shaped. Works with every palette, light or dark.
          </Typography>
        </Box>
        <SkinOptions
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

const ARROW_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Arrow keys move between the options of a group, as in any radio group.
 * They only move focus: choosing applies the theme and closes the picker, so
 * it waits for Enter or Space.
 */
const moveBetweenRadios = (event: KeyboardEvent<HTMLElement>): void => {
  const step = ARROW_STEPS[event.key];
  if (!step) return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
  const index = radios.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  event.preventDefault();
  radios[(index + step + radios.length) % radios.length]?.focus();
};

/** A radio group: two across (one on a phone), or a single-column `list`. */
const RadioGrid = ({
  label,
  list = false,
  children,
}: {
  label: string;
  list?: boolean;
  children: ReactNode;
}): JSX.Element => (
  <Box
    role="radiogroup"
    aria-label={label}
    onKeyDown={moveBetweenRadios}
    sx={{
      display: 'grid',
      gridTemplateColumns: list ? '1fr' : { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
      gap: list ? 1 : 1.5,
    }}
  >
    {children}
  </Box>
);

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

/**
 * The shared frame of a picker option: a radio card with a picture on top and
 * a name below, or (`row`) a compact row with a small picture beside the name.
 */
const OptionCard = ({
  selected,
  onSelect,
  preview,
  row = false,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  preview: ReactNode;
  row?: boolean;
  children: ReactNode;
}): JSX.Element => (
  <ButtonBase
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    sx={{
      display: 'flex',
      flexDirection: row ? 'row' : 'column',
      alignItems: row ? 'center' : 'stretch',
      textAlign: 'left',
      overflow: 'hidden',
      borderRadius: 3,
      border: 2,
      color: 'text.primary',
      transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
      ...choiceSx(selected),
      ...(row && { gap: 1.5, p: 0.5 }),
    }}
  >
    {preview}
    <Box sx={row ? { width: '100%', minWidth: 0, pr: 0.75 } : { p: 1.5, width: '100%' }}>
      {children}
    </Box>
  </ButtonBase>
);

const OptionName = ({
  label,
  selected,
  swatch,
}: {
  label: string;
  selected: boolean;
  swatch?: string;
}): JSX.Element => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {swatch && (
      <Box
        aria-hidden
        sx={{
          width: 14,
          height: 14,
          flexShrink: 0,
          borderRadius: '50%',
          bgcolor: swatch,
          border: 1,
          borderColor: 'divider',
        }}
      />
    )}
    <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.82rem', flex: 1 }}>
      {label}
    </Typography>
    {selected && <CheckRoundedIcon sx={{ fontSize: 17, color: 'primary.main' }} />}
  </Box>
);

const OptionDescription = ({ children }: { children: ReactNode }): JSX.Element => (
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
    {children}
  </Typography>
);

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
  <OptionCard
    selected={selected}
    onSelect={onSelect}
    preview={<PresetPreview option={option} mode={mode} />}
  >
    <OptionName label={option.label} selected={selected} swatch={option.iconColor} />
    <OptionDescription>{option.description}</OptionDescription>
  </OptionCard>
);

/**
 * Every skin's tokens for the palette and mode in use. Built only while the
 * picker is open (four themes, a few milliseconds).
 */
const useSkinPreviews = (
  preset: ThemePresetKey,
  mode: 'light' | 'dark',
): Record<SkinKey, SkinTokens> =>
  useMemo(
    () =>
      Object.fromEntries(
        THEME_SKINS.map((option) => [
          option.key,
          createAppTheme(preset, mode, option.key).skinTokens as SkinTokens,
        ]),
      ) as Record<SkinKey, SkinTokens>,
    [preset, mode],
  );

const SkinOptions = ({
  preset,
  mode,
  skin,
  onSelect,
}: {
  preset: ThemePresetKey;
  mode: 'light' | 'dark';
  skin: SkinKey;
  onSelect: (skin: SkinKey) => void;
}): JSX.Element => {
  const previews = useSkinPreviews(preset, mode);
  return (
    <RadioGrid label="Console skin" list>
      {THEME_SKINS.map((option) => (
        <SkinCard
          key={option.key}
          option={option}
          tokens={previews[option.key]}
          selected={skin === option.key}
          onSelect={() => onSelect(option.key)}
        />
      ))}
    </RadioGrid>
  );
};

const v = tokenVar;

/**
 * One skin in miniature: its canvas, a card, a field and a primary button,
 * painted with that skin's tokens. The skin's variables are scoped to this
 * box, and it is drawn at twice the size and scaled down, so shadows and
 * corners keep the proportions they have at full size.
 */
const SkinPreview = ({ tokens }: { tokens: SkinTokens }): JSX.Element => (
  <Box
    aria-hidden
    sx={{
      position: 'relative',
      width: { xs: 72, sm: 84 },
      height: 48,
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: 2,
    }}
  >
    <Box
      style={toCssVars(tokens) as CSSProperties}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '200%',
        height: '200%',
        transform: 'scale(0.5)',
        transformOrigin: '0 0',
        p: 1.5,
        display: 'flex',
        bgcolor: v('canvasBg'),
        backgroundImage: v('canvasImage'),
      }}
    >
      <Box
        sx={{
          ...surfaceSx.card,
          flex: 1,
          minWidth: 0,
          p: 1.25,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: v('cardRadius'),
        }}
      >
        <Box sx={{ height: 9, width: '52%', borderRadius: '4px', bgcolor: v('textPrimary') }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              height: 26,
              borderRadius: v('inputRadius'),
              bgcolor: v('inputBg'),
              border: `1px solid ${v('inputBorderColor')}`,
              boxShadow: v('inputShadow'),
              backdropFilter: v('inputBackdrop'),
            }}
          />
          <Box
            sx={{
              flexShrink: 0,
              width: 40,
              height: 26,
              borderRadius: v('buttonRadius'),
              bgcolor: 'primary.main',
              boxShadow: v('buttonShadow'),
            }}
          />
        </Box>
      </Box>
    </Box>
  </Box>
);

const SkinCard = ({
  option,
  tokens,
  selected,
  onSelect,
}: {
  option: SkinDefinition;
  tokens: SkinTokens;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element => (
  <OptionCard row selected={selected} onSelect={onSelect} preview={<SkinPreview tokens={tokens} />}>
    <OptionName label={option.label} selected={selected} />
    <OptionDescription>{option.description}</OptionDescription>
  </OptionCard>
);

export type { ThemePresetKey };

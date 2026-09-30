import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import type { Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { SystemStyleObject } from '@mui/system';
import {
  useMemo,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import {
  THEME_SKINS,
  toCssVars,
  type SkinDefinition,
  type SkinKey,
  type SkinTokens,
} from '../../theme/skins';
import { choiceSx, surfaceSx, tokenVar } from '../../theme/surfaces';
import {
  createAppTheme,
  getPresetPalette,
  THEME_PRESETS,
  type PresetPalette,
  type ThemePreset,
  type ThemePresetKey,
} from '../../theme/theme';
import type { ColorMode } from '../../theme/ThemeContext';

/**
 * The console's look, chosen by seeing it rather than by reading names: a
 * palette, a skin, and light or dark mode. The top bar's theme popover and
 * the Appearance panel in Settings both use these, so the two offer the same
 * choices drawn the same way.
 *
 * The palettes were a list of four words with a coloured dot beside each,
 * which asks the reader to imagine what "Ocean" does to a console they are
 * looking at. Each card now paints a miniature of the real thing in that
 * palette (canvas, sidebar, card, primary button), so the choice is made by
 * looking. The mode cards draw the palette in use in each mode.
 *
 * Each skin's miniature is painted with that skin's own tokens in the palette
 * and mode already in use (canvas, a card, a field and a button), so it shows
 * what picking it would do to this console, not to a stock example.
 *
 * The pickers only show and report a choice; whoever places them applies it.
 */

/**
 * Where a picker sits. In the popover the layout is fixed: palettes two
 * across (one on a phone), skins a single column. On a page each group lays
 * itself out for the width it is given, since the account column's width
 * depends on the sidebar and the account navigation as well as the window.
 */
export type PickerLayout = 'popover' | 'page';

/** An `sx` style object (never `null`, so it can be spread). */
type Sx = NonNullable<SystemStyleObject<Theme>>;

const TWO_ACROSS = 'repeat(2, minmax(0, 1fr))';
const FOUR_ACROSS = 'repeat(4, minmax(0, 1fr))';

/** A rule for when the group itself, not the window, is at least this wide. */
const whenWider = (px: number): string => `@container (min-width: ${px}px)`;

/**
 * Row cards on a page (the modes and the skins): one column, then two across
 * once a group has room, so the two groups share their columns.
 */
const PAGE_ROWS: Sx = {
  gridTemplateColumns: '1fr',
  gap: 1.5,
  [whenWider(560)]: { gridTemplateColumns: TWO_ACROSS },
};

/** The grids of the groups that appear in both places. */
const GRIDS = {
  palette: {
    popover: { gridTemplateColumns: { xs: '1fr', sm: TWO_ACROSS }, gap: 1.5 },
    page: {
      gridTemplateColumns: '1fr',
      gap: 1.5,
      [whenWider(440)]: { gridTemplateColumns: TWO_ACROSS },
      [whenWider(720)]: { gridTemplateColumns: FOUR_ACROSS },
    },
  },
  skin: {
    popover: { gridTemplateColumns: '1fr', gap: 1 },
    page: PAGE_ROWS,
  },
} as const satisfies Record<string, Record<PickerLayout, Sx>>;

const ARROW_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Arrow keys move between the options of a group, as in any radio group.
 * They only move focus: choosing re-themes the whole console (and closes the
 * popover), so it waits for Enter or Space.
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

/**
 * A radio group laid out as a grid. On a page the group is measured as a
 * container, so its columns follow its own width.
 */
const RadioGrid = ({
  label,
  layout,
  grid,
  children,
}: {
  label: string;
  layout: PickerLayout;
  grid: Sx;
  children: ReactNode;
}): JSX.Element => {
  const group = (
    <Box
      role="radiogroup"
      aria-label={label}
      onKeyDown={moveBetweenRadios}
      sx={{ display: 'grid', ...grid }}
    >
      {children}
    </Box>
  );
  return layout === 'page' ? <Box sx={{ containerType: 'inline-size' }}>{group}</Box> : group;
};

/** How tall PresetPreview draws the console. */
const PREVIEW_HEIGHT = 78;

/**
 * The console in miniature: canvas, sidebar with its active row, a card and a
 * primary button, drawn from the palette it is given rather than the active
 * one, so each card shows what picking it would do. Its bottom edge rules it
 * off from the name below; `sx` can change that.
 */
const PresetPreview = ({ palette, sx }: { palette: PresetPalette; sx?: Sx }): JSX.Element => {
  const primary = (palette.primary as { main: string }).main;
  return (
    <Box
      aria-hidden
      sx={{
        height: PREVIEW_HEIGHT,
        display: 'flex',
        bgcolor: palette.canvas,
        borderBottom: 1,
        borderColor: palette.divider,
        ...sx,
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

const THUMBNAIL_HEIGHT = 48;

/** PresetPreview's scale in a thumbnail: to fit inside the frame's top and bottom hairlines. */
const THUMBNAIL_SCALE = (THUMBNAIL_HEIGHT - 2) / PREVIEW_HEIGHT;

/** The frame of a row card's miniature (a skin's, a mode's), beside its name. */
const thumbnailSx: Sx = {
  position: 'relative',
  width: { xs: 72, sm: 84 },
  height: THUMBNAIL_HEIGHT,
  flexShrink: 0,
  overflow: 'hidden',
  borderRadius: 2,
};

/**
 * The console miniature at a row card's size (the mode cards): drawn full
 * size and scaled down, so it keeps its proportions. A hairline frames it,
 * or a light palette's white sidebar would run into a white card.
 */
const PresetThumbnail = ({ palette }: { palette: PresetPalette }): JSX.Element => (
  <Box
    aria-hidden
    sx={{ ...thumbnailSx, boxSizing: 'border-box', border: `1px solid ${palette.divider}` }}
  >
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${100 / THUMBNAIL_SCALE}%`,
        transform: `scale(${THUMBNAIL_SCALE})`,
        transformOrigin: '0 0',
      }}
    >
      <PresetPreview palette={palette} sx={{ borderBottom: 0 }} />
    </Box>
  </Box>
);

/**
 * What a card does differently on a page; the popover keeps its look exactly.
 * Focus scrolls the card clear of the console's fixed top bar: Shift+Tab and
 * the arrow keys would otherwise scroll it to the top edge, under the bar
 * (the popover scrolls itself, so its cards have no margins). A row card
 * keeps its picture and name to the top, because the grid stretches it to a
 * taller neighbour's height and centring would set its name lower.
 */
const pageCardSx = (row: boolean): Sx => ({
  scrollMarginTop: '88px',
  scrollMarginBottom: '16px',
  ...(row && { alignItems: 'flex-start' }),
});

/**
 * The shared frame of a picker option: a radio card with a picture on top and
 * a name below, or (`row`) a compact row with a small picture beside the name.
 * Every option is a button of its own, so Tab reaches each one and Enter or
 * Space chooses it; `choiceSx` gives it the skin's focus ring.
 */
const OptionCard = ({
  selected,
  onSelect,
  preview,
  row = false,
  layout,
  children,
}: {
  selected: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  preview: ReactNode;
  row?: boolean;
  layout: PickerLayout;
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
      // A card stretched to a taller neighbour's height keeps its picture at
      // the top (ButtonBase would centre it).
      ...(row ? { gap: 1.5, p: 0.5 } : { justifyContent: 'flex-start' }),
      ...(layout === 'page' && pageCardSx(row)),
    }}
  >
    {preview}
    <Box sx={row ? { width: '100%', minWidth: 0, pr: 0.75 } : { p: 1.5, width: '100%' }}>
      {children}
    </Box>
  </ButtonBase>
);

/** An option's name, after a colour dot (`swatch`) or an `icon`, with a tick when chosen. */
const OptionName = ({
  label,
  selected,
  swatch,
  icon,
}: {
  label: string;
  selected: boolean;
  swatch?: string;
  icon?: ReactNode;
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
    {icon}
    <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.82rem', flex: 1 }}>
      {label}
    </Typography>
    {selected && <CheckRoundedIcon sx={{ fontSize: 17, color: 'primary.main' }} />}
  </Box>
);

/**
 * An option's blurb. On a page the cards change width with the window, and
 * plain wrapping can leave one word on the last line or split "hand-made" at
 * its hyphen; balanced lines read evenly, like the popover's. The popover's
 * fixed widths keep their own wrapping.
 */
const OptionDescription = ({
  layout,
  children,
}: {
  layout: PickerLayout;
  children: ReactNode;
}): JSX.Element => (
  <Typography
    component="span"
    sx={{
      display: 'block',
      mt: 0.5,
      color: 'text.secondary',
      fontSize: '0.72rem',
      lineHeight: 1.45,
      ...(layout === 'page' && { textWrap: 'balance' as const }),
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
  layout,
}: {
  option: ThemePreset;
  mode: ColorMode;
  selected: boolean;
  onSelect: () => void;
  layout: PickerLayout;
}): JSX.Element => (
  <OptionCard
    selected={selected}
    onSelect={onSelect}
    layout={layout}
    preview={<PresetPreview palette={option[mode]} />}
  >
    <OptionName label={option.label} selected={selected} swatch={option.iconColor} />
    <OptionDescription layout={layout}>{option.description}</OptionDescription>
  </OptionCard>
);

interface PalettePickerProps {
  preset: ThemePresetKey;
  /** The mode the miniatures are drawn in: the one in use. */
  mode: ColorMode;
  onSelect: (preset: ThemePresetKey) => void;
  layout?: PickerLayout;
}

/** The four palettes, as the radio group "Console theme". */
export const PalettePicker = ({
  preset,
  mode,
  onSelect,
  layout = 'popover',
}: PalettePickerProps): JSX.Element => (
  <RadioGrid label="Console theme" layout={layout} grid={GRIDS.palette[layout]}>
    {THEME_PRESETS.map((option) => (
      <PresetCard
        key={option.key}
        option={option}
        mode={mode}
        selected={preset === option.key}
        onSelect={() => onSelect(option.key)}
        layout={layout}
      />
    ))}
  </RadioGrid>
);

const MODES = [
  {
    key: 'light',
    label: 'Light',
    description: 'Bright surfaces, best by day.',
    Icon: LightModeOutlinedIcon,
  },
  {
    key: 'dark',
    label: 'Dark',
    description: 'Dark surfaces, easier at night.',
    Icon: DarkModeOutlinedIcon,
  },
] as const;

interface ModePickerProps {
  /** The palette in use, which both miniatures are drawn in. */
  preset: ThemePresetKey;
  mode: ColorMode;
  /** The mode chosen, and the card it was chosen on (where a reveal can grow from). */
  onSelect: (mode: ColorMode, origin: HTMLElement) => void;
}

/**
 * Light and dark, each drawn in the palette in use, as the radio group
 * "Colour mode". Always laid out for a page: the popover has no mode group.
 * The two are rows, like the skins and in their columns, so they fill the
 * width four palettes do; cards the palettes' size left half the row empty.
 */
export const ModePicker = ({ preset, mode, onSelect }: ModePickerProps): JSX.Element => (
  <RadioGrid label="Colour mode" layout="page" grid={PAGE_ROWS}>
    {MODES.map(({ key, label, description, Icon }) => (
      <OptionCard
        key={key}
        row
        selected={mode === key}
        onSelect={(event) => onSelect(key, event.currentTarget)}
        layout="page"
        preview={<PresetThumbnail palette={getPresetPalette(preset, key)} />}
      >
        <OptionName
          label={label}
          selected={mode === key}
          icon={<Icon sx={{ fontSize: 16, color: 'text.secondary' }} />}
        />
        <OptionDescription layout="page">{description}</OptionDescription>
      </OptionCard>
    ))}
  </RadioGrid>
);

/**
 * Every skin's tokens for the palette and mode in use. Built only while a
 * picker is on screen (four themes, a few milliseconds).
 */
const useSkinPreviews = (preset: ThemePresetKey, mode: ColorMode): Record<SkinKey, SkinTokens> =>
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

const v = tokenVar;

/**
 * One skin in miniature: its canvas, a card, a field and a primary button,
 * painted with that skin's tokens. The skin's variables are scoped to this
 * box, and it is drawn at twice the size and scaled down, so shadows and
 * corners keep the proportions they have at full size.
 */
const SkinPreview = ({ tokens }: { tokens: SkinTokens }): JSX.Element => (
  <Box aria-hidden sx={thumbnailSx}>
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
  layout,
}: {
  option: SkinDefinition;
  tokens: SkinTokens;
  selected: boolean;
  onSelect: () => void;
  layout: PickerLayout;
}): JSX.Element => (
  <OptionCard
    row
    selected={selected}
    onSelect={onSelect}
    layout={layout}
    preview={<SkinPreview tokens={tokens} />}
  >
    <OptionName label={option.label} selected={selected} />
    <OptionDescription layout={layout}>{option.description}</OptionDescription>
  </OptionCard>
);

interface SkinPickerProps {
  /** The palette and mode in use, which every miniature is painted in. */
  preset: ThemePresetKey;
  mode: ColorMode;
  skin: SkinKey;
  onSelect: (skin: SkinKey) => void;
  layout?: PickerLayout;
}

/** The four skins, as the radio group "Console skin". */
export const SkinPicker = ({
  preset,
  mode,
  skin,
  onSelect,
  layout = 'popover',
}: SkinPickerProps): JSX.Element => {
  const previews = useSkinPreviews(preset, mode);
  return (
    <RadioGrid label="Console skin" layout={layout} grid={GRIDS.skin[layout]}>
      {THEME_SKINS.map((option) => (
        <SkinCard
          key={option.key}
          option={option}
          tokens={previews[option.key]}
          selected={skin === option.key}
          onSelect={() => onSelect(option.key)}
          layout={layout}
        />
      ))}
    </RadioGrid>
  );
};

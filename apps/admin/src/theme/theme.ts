import { brandFonts } from '@iaa/shared';
import {
  alpha,
  createTheme,
  type PaletteColorOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles';
import { createElement } from 'react';

import {
  CheckboxCheckedIcon,
  CheckboxIcon,
  CheckboxIndeterminateIcon,
  RadioCheckedIcon,
  RadioIcon,
} from './control-icons';
import {
  DEFAULT_SKIN,
  getSkin,
  readableStatus,
  readingGroundsOf,
  skinFallbacks,
  toCssVars,
  type SkinKey,
  type SkinTokens,
} from './skins';

declare module '@mui/material/styles' {
  interface Theme {
    /**
     * Which skin built this theme. Absent on themes made with `createTheme`
     * directly (tests), which read as Classic.
     */
    skin?: SkinKey;
    /** The skin's token values, as published on `:root` (see theme/surfaces.ts). */
    skinTokens?: SkinTokens;
  }
}

export type ThemePresetKey = 'iaa' | 'aura' | 'ocean' | 'sunset';

export interface ThemePreset {
  key: ThemePresetKey;
  label: string;
  /** One line on the character of the palette, shown under its name in the picker. */
  description: string;
  iconColor: string;
  light: PresetPalette;
  dark: PresetPalette;
}

export interface PresetPalette {
  mode: 'light' | 'dark';
  primary: PaletteColorOptions;
  secondary: PaletteColorOptions;
  background: { default: string; paper: string };
  text: { primary: string; secondary: string };
  divider: string;
  canvas: string;
  overlay: string;
  selectionAlpha: number;
  cardBorder: string;
}

const PRESETS: Record<ThemePresetKey, ThemePreset> = {
  iaa: {
    key: 'iaa',
    label: 'IAA',
    description: 'The house palette. Forest green and gold, as on the website.',
    iconColor: '#00D68B',
    light: {
      mode: 'light',
      primary: { main: '#00D68B', dark: '#00B878', light: '#4DE7AD', contrastText: '#0E2A22' },
      secondary: { main: '#F5B800', dark: '#D49E00', light: '#FFD44D', contrastText: '#0E2A22' },
      background: { default: '#F7F5F0', paper: '#FFFFFF' },
      text: { primary: '#0A0F0D', secondary: '#5E6B66' },
      divider: '#E2E0DA',
      canvas: '#F7F5F0',
      overlay: '#00D68B',
      selectionAlpha: 0.28,
      cardBorder: '#E2E0DA',
    },
    dark: {
      mode: 'dark',
      primary: { main: '#2EE89F', dark: '#00D68B', light: '#6DF0BC', contrastText: '#0E2A22' },
      secondary: { main: '#FFD133', dark: '#F5B800', light: '#FFE066', contrastText: '#0E2A22' },
      background: { default: '#171A17', paper: '#0E2A22' },
      text: { primary: '#F2F0EA', secondary: '#9EAAA4' },
      divider: 'rgba(255,255,255,0.10)',
      canvas: '#171A17',
      overlay: '#00D68B',
      selectionAlpha: 0.32,
      cardBorder: 'rgba(255,255,255,0.10)',
    },
  },
  aura: {
    key: 'aura',
    label: 'Aura',
    description: 'Violet and cyan. Cooler and higher contrast for long sessions.',
    iconColor: '#A78BFA',
    light: {
      mode: 'light',
      primary: { main: '#7C3AED', dark: '#6D28D9', light: '#A78BFA', contrastText: '#FFFFFF' },
      secondary: { main: '#22D3EE', dark: '#06B6D4', light: '#67E8F9', contrastText: '#0F172A' },
      background: { default: '#FAF9FE', paper: '#FFFFFF' },
      text: { primary: '#1E1B2E', secondary: '#6B6680' },
      divider: '#E7E5F1',
      canvas: '#F5F3FF',
      overlay: '#7C3AED',
      selectionAlpha: 0.28,
      cardBorder: '#E7E5F1',
    },
    dark: {
      mode: 'dark',
      primary: { main: '#A78BFA', dark: '#8B5CF6', light: '#C4B5FD', contrastText: '#1E1B2E' },
      secondary: { main: '#22D3EE', dark: '#06B6D4', light: '#67E8F9', contrastText: '#0F172A' },
      background: { default: '#13111C', paper: '#1E1B2E' },
      text: { primary: '#F0EEFB', secondary: '#9E9CB3' },
      divider: 'rgba(255,255,255,0.10)',
      canvas: '#13111C',
      overlay: '#A78BFA',
      selectionAlpha: 0.32,
      cardBorder: 'rgba(255,255,255,0.10)',
    },
  },
  ocean: {
    key: 'ocean',
    label: 'Ocean',
    description: 'Sky blue on slate. Calm, and the easiest on a bright screen.',
    iconColor: '#38BDF8',
    light: {
      mode: 'light',
      primary: { main: '#0EA5E9', dark: '#0284C7', light: '#38BDF8', contrastText: '#FFFFFF' },
      secondary: { main: '#F97316', dark: '#EA580C', light: '#FB923C', contrastText: '#FFFFFF' },
      background: { default: '#F0F9FF', paper: '#FFFFFF' },
      text: { primary: '#0B1220', secondary: '#546A7B' },
      divider: '#D6E8F2',
      canvas: '#F0F9FF',
      overlay: '#0EA5E9',
      selectionAlpha: 0.28,
      cardBorder: '#D6E8F2',
    },
    dark: {
      mode: 'dark',
      primary: { main: '#38BDF8', dark: '#0EA5E9', light: '#7DD3FC', contrastText: '#0B1220' },
      secondary: { main: '#FDBA74', dark: '#F97316', light: '#FED7AA', contrastText: '#0B1220' },
      background: { default: '#0B1220', paper: '#111B2E' },
      text: { primary: '#E8F4FC', secondary: '#8AA2B8' },
      divider: 'rgba(255,255,255,0.10)',
      canvas: '#0B1220',
      overlay: '#38BDF8',
      selectionAlpha: 0.32,
      cardBorder: 'rgba(255,255,255,0.10)',
    },
  },
  sunset: {
    key: 'sunset',
    label: 'Sunset',
    description: 'Warm orange. The friendliest of the four, and the loudest.',
    iconColor: '#FB923C',
    light: {
      mode: 'light',
      primary: { main: '#F97316', dark: '#EA580C', light: '#FB923C', contrastText: '#FFFFFF' },
      secondary: { main: '#EC4899', dark: '#DB2777', light: '#F472B6', contrastText: '#FFFFFF' },
      background: { default: '#FFF7ED', paper: '#FFFFFF' },
      text: { primary: '#1F1410', secondary: '#7C6A60' },
      divider: '#F5E0D0',
      canvas: '#FFF7ED',
      overlay: '#F97316',
      selectionAlpha: 0.28,
      cardBorder: '#F5E0D0',
    },
    dark: {
      mode: 'dark',
      primary: { main: '#FB923C', dark: '#F97316', light: '#FDBA74', contrastText: '#1F1410' },
      secondary: { main: '#F472B6', dark: '#EC4899', light: '#F9A8D4', contrastText: '#1F1410' },
      background: { default: '#1F1410', paper: '#2E1B14' },
      text: { primary: '#FFF0E8', secondary: '#B8A198' },
      divider: 'rgba(255,255,255,0.10)',
      canvas: '#1F1410',
      overlay: '#FB923C',
      selectionAlpha: 0.32,
      cardBorder: 'rgba(255,255,255,0.10)',
    },
  },
};

export const THEME_PRESETS = Object.values(PRESETS);

export const isThemePresetKey = (value: unknown): value is ThemePresetKey =>
  typeof value === 'string' && value in PRESETS;

/**
 * Warning and info for light mode, deeper than MUI's defaults. White on MUI's
 * orange (#ED6C02) is 3.1:1 and on its blue (#0288D1) 3.9:1, short of the
 * 4.5:1 a 13px chip label needs, and every status chip in the console ("Under
 * review", "Submitted", a draft event) is drawn in one of them. These are
 * 5.0:1 and 5.9:1. Dark mode keeps MUI's lighter shades, whose text is already
 * dark.
 */
const LIGHT_STATUS_COLOURS = {
  warning: { main: '#B45309', light: '#D97706', dark: '#92400E', contrastText: '#FFFFFF' },
  info: { main: '#0369A1', light: '#0284C7', dark: '#075985', contrastText: '#FFFFFF' },
} as const;

const baseOptions = (palette: PresetPalette): ThemeOptions => ({
  palette: {
    mode: palette.mode,
    primary: palette.primary,
    secondary: palette.secondary,
    background: palette.background,
    text: palette.text,
    divider: palette.divider,
    ...(palette.mode === 'light' ? LIGHT_STATUS_COLOURS : {}),
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: brandFonts.body,
    h1: { fontFamily: brandFonts.heading, fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: brandFonts.heading, fontWeight: 600, letterSpacing: '-0.018em' },
    h3: { fontFamily: brandFonts.body, fontWeight: 700, letterSpacing: '-0.012em' },
    h4: { fontFamily: brandFonts.body, fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontFamily: brandFonts.body, fontWeight: 700 },
    h6: { fontFamily: brandFonts.body, fontWeight: 700, letterSpacing: '-0.02em' },
    button: { textTransform: 'none', fontWeight: 600 },
    body1: { lineHeight: 1.6 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.canvas,
          backgroundImage: `radial-gradient(circle at 90% 0%, ${alpha(
            palette.overlay,
            palette.mode === 'light' ? 0.045 : 0.06,
          )}, transparent 30rem)`,
        },
        'button, a, input, textarea': { touchAction: 'manipulation' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
        '::selection': {
          backgroundColor: alpha(palette.overlay, palette.selectionAlpha),
          color: palette.mode === 'light' ? palette.text.primary : palette.background.default,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 10,
          paddingInline: 18,
          transition: 'transform 160ms ease, box-shadow 160ms ease',
          '&:active': { transform: 'translateY(1px)' },
          '&:focus-visible': {
            outline: `3px solid ${alpha(palette.overlay, 0.32)}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${palette.cardBorder}`,
          borderRadius: 14,
          backgroundColor: palette.background.paper,
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `1px solid ${palette.cardBorder}`,
          borderRadius: 16,
          boxShadow: '0 32px 80px -40px rgba(0,0,0,0.35)',
          backgroundColor: palette.background.paper,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { padding: '24px 28px 18px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingInline: 28 } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { gap: 8, padding: '16px 28px 20px' } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor:
            palette.mode === 'light' ? palette.background.paper : alpha('#ffffff', 0.04),
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(palette.overlay, 0.5),
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(palette.overlay, 0.12)}`,
          },
        },
        input: {
          '&::placeholder': {
            color: 'text.secondary',
            opacity: 0.8,
          },
        },
        notchedOutline: {
          borderColor: palette.cardBorder,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'text.secondary',
          fontWeight: 600,
          '&.Mui-focused': { color: 'text.primary' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-focusVisible': { outline: `2px solid ${palette.text.primary}`, outlineOffset: 2 },
        },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', minHeight: 48, fontWeight: 650 } } },
    // Own marks rather than Material's filled square and circle, so a tick in
    // this console looks like it belongs to it. See theme/control-icons.tsx.
    MuiCheckbox: {
      defaultProps: {
        disableRipple: true,
        icon: createElement(CheckboxIcon),
        checkedIcon: createElement(CheckboxCheckedIcon),
        indeterminateIcon: createElement(CheckboxIndeterminateIcon),
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-focusVisible': {
            outline: `2px solid ${(palette.primary as { main: string }).main}`,
            outlineOffset: -2,
          },
        },
      },
    },
    MuiRadio: {
      defaultProps: {
        disableRipple: true,
        icon: createElement(RadioIcon),
        checkedIcon: createElement(RadioCheckedIcon),
      },
      styleOverrides: {
        root: {
          borderRadius: '50%',
          '&.Mui-focusVisible': {
            outline: `2px solid ${(palette.primary as { main: string }).main}`,
            outlineOffset: -2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 7, fontSize: '0.75rem' } },
    },
  },
});

/**
 * Publishes a skin's tokens as CSS custom properties on `:root`, after the
 * house baseline styles, followed by any fallback blocks the skin needs (Glass
 * turns opaque where blur is unavailable). Written onto the finished theme
 * because the tokens are computed from MUI's finished palette.
 */
const publishTokens = (theme: Theme, skin: SkinKey, tokens: SkinTokens): void => {
  const baseline = theme.components?.MuiCssBaseline?.styleOverrides as Record<string, unknown>;
  const fallbacks = Object.fromEntries(
    Object.entries(skinFallbacks(skin, tokens)).map(([condition, values]) => [
      condition,
      { ':root': toCssVars(values) },
    ]),
  );
  Object.assign(baseline, { ':root': toCssVars(tokens) }, fallbacks);
  theme.skin = skin;
  theme.skinTokens = tokens;
};

/**
 * Admin console theme — shares brand tokens with the marketing site.
 *
 * Three independent choices: the colour `preset`, light or dark `mode`, and
 * the `skin` that decides how surfaces and controls are built. Classic (the
 * default) is the house theme untouched plus its token variables, whose
 * values are what the console already painted; the other skins adjust the
 * palette for their surfaces and lay their overrides over the house theme.
 */
export const createAppTheme = (
  preset: ThemePresetKey,
  mode: 'light' | 'dark',
  skin: SkinKey = DEFAULT_SKIN,
): Theme => {
  const definition = getSkin(skin);
  const source = definition.palette(PRESETS[preset][mode]);
  const extra = definition.options?.(source);
  const build = (...more: object[]): Theme =>
    createTheme(baseOptions(source), ...(extra ? [extra] : []), ...more);
  const tokensOf = (built: Theme): SkinTokens =>
    definition.tokens({ palette: built.palette, source, shadows: built.shadows });
  let theme = build();
  let tokens = tokensOf(theme);
  // A skin's surfaces can be darker than Classic's white: status colours used
  // as text are deepened where they would no longer read (see status.ts).
  if (skin !== 'classic') {
    const grounds = readingGroundsOf(tokens, definition.backdrops(source), mode);
    const status = readableStatus(theme.palette, grounds);
    if (Object.keys(status).length > 0) {
      theme = build({ palette: status });
      tokens = tokensOf(theme);
    }
  }
  publishTokens(theme, skin, tokens);
  return theme;
};

/** A preset's palette for one mode, before any skin adjusts it. */
export const getPresetPalette = (preset: ThemePresetKey, mode: 'light' | 'dark'): PresetPalette =>
  PRESETS[preset][mode];

/** Default light IAA theme for tests and storybook. */
export const theme = createAppTheme('iaa', 'light');

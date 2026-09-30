import type { SimplePaletteColorOptions } from '@mui/material/styles';

import { ensureContrastOnAll, mix, over } from '../colour';
import type { PresetPalette } from '../theme';

/**
 * Small pieces every non-Classic skin uses, so the three skins differ only in
 * their materials and not in how they keep text readable.
 */

/** WCAG AA for body text. */
export const AA_TEXT = 4.5;
/** WCAG 1.4.11 for control boundaries and focus indicators. */
export const AA_UI = 3;

/** The preset's four brand hues. Presets always give all four shades. */
export const huesOf = (preset: PresetPalette) => {
  const primary = preset.primary as SimplePaletteColorOptions & { dark: string; light: string };
  const secondary = preset.secondary as SimplePaletteColorOptions & { dark: string; light: string };
  return {
    primary: primary.main,
    primaryDark: primary.dark,
    primaryLight: primary.light,
    secondary: secondary.main,
    secondaryLight: secondary.light,
  };
};

/** `light` in light mode, `dark` in dark mode: keeps mode switches out of long token lists. */
export const byMode = <T>(mode: 'light' | 'dark', light: T, dark: T): T =>
  mode === 'light' ? light : dark;

/**
 * The content a floating panel (top bar, menu, dialog) can end up over: the
 * blackest photo in light mode, the whitest in dark. Translucent panels are
 * checked against it, not only against the canvas.
 */
export const contentExtreme = (mode: 'light' | 'dark'): string =>
  byMode(mode, '#000000', '#FFFFFF');

/**
 * Text colours for a skin's palette that read on every surface given: the
 * preset's own colours when they already do, nudged deeper (or lighter in
 * dark mode) only as far as needed.
 */
export const readableText = (
  preset: PresetPalette,
  surfaces: readonly string[],
): PresetPalette['text'] => ({
  primary: ensureContrastOnAll(preset.text.primary, surfaces, AA_TEXT),
  secondary: ensureContrastOnAll(preset.text.secondary, surfaces, AA_TEXT),
});

/** Colours `translucent` becomes over each of `backdrops`. */
export const composited = (translucent: string, backdrops: readonly string[]): string[] =>
  backdrops.map((backdrop) => over(translucent, backdrop));

/** A soft tint of `hue` into `base`: the pastel family Clay and the tinted headers use. */
export const tint = (base: string, hue: string, weight: number): string => mix(base, hue, weight);

/** Rounds a pixel value for a shadow list so generated CSS stays short and stable. */
export const px = (value: number): string => `${Math.round(value * 10) / 10}px`;

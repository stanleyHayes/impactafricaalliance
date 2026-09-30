import { getContrastRatio, type Palette } from '@mui/material/styles';

import { contrast, ensureContrastOnAll, mix, over } from '../colour';

import { AA_TEXT, contentExtreme } from './shared';
import type { SkinTokens } from './types';

/** The palette colours that carry a status (a failed payment, an overdue task). */
const STATUS_COLOURS = ['error', 'warning', 'info', 'success'] as const;

type StatusKey = (typeof STATUS_COLOURS)[number];

/** A status colour as a skin repaints it: only the keys that change. */
type StatusShade = Pick<Palette[StatusKey], 'main' | 'dark' | 'contrastText'>;

/**
 * Every opaque colour status text lands on in a skin: cards and their tinted
 * header strips, and floating panels, each over every colour the skin's
 * canvas reaches (panels over the darkest content as well, since they can
 * pass over a photograph). Status text lives in cards, tables and menus, not
 * on the bare canvas, so Glass's wash is only seen through a card's glass.
 */
export const readingGroundsOf = (
  tokens: SkinTokens,
  backdrops: readonly string[],
  mode: 'light' | 'dark',
): string[] => {
  const on = (colour: string, grounds: readonly string[]): string[] =>
    grounds.map((ground) => over(colour, ground));
  const cards = on(tokens.surfaceBg, backdrops);
  return [
    ...cards,
    ...cards.map((card) => over(tokens.surfaceTintBg, card)),
    ...on(tokens.overlayBg, [...backdrops, contentExtreme(mode)]),
  ];
};

const readsOnAll = (colour: string, grounds: readonly string[]): boolean =>
  grounds.every((ground) => contrast(colour, ground) >= AA_TEXT);

/** White or near-black, whichever reads better on `fill`. */
const labelOn = (fill: string): string =>
  getContrastRatio('#FFFFFF', fill) >= getContrastRatio('#000000', fill)
    ? '#FFFFFF'
    : 'rgba(0, 0, 0, 0.87)';

/**
 * Status colours double as text: an outlined "2 failed" chip, "2 tasks
 * overdue", a Delete button. On Classic's surfaces they read; on a skin's
 * (Neumorphism's grey canvas, Clay's tinted dark clay) some fall short of
 * 4.5:1. Each one that does is moved just far enough to read on every ground
 * (deeper in light mode, lighter in dark), keeping its hue and so its
 * meaning, with a hover shade and a label colour that still read on it as a
 * fill. A colour that already reads is left exactly as it was.
 */
export const readableStatus = (
  palette: Palette,
  grounds: readonly string[],
): Partial<Record<StatusKey, StatusShade>> => {
  const shades: Partial<Record<StatusKey, StatusShade>> = {};
  for (const key of STATUS_COLOURS) {
    const { main } = palette[key];
    if (readsOnAll(main, grounds)) continue;
    const readable = ensureContrastOnAll(main, grounds, AA_TEXT);
    shades[key] = {
      main: readable,
      // Light mode deepens on hover; dark mode's original shade is the deeper one.
      dark: palette.mode === 'light' ? mix(readable, '#000000', 0.15) : main,
      contrastText: labelOn(readable),
    };
  }
  return shades;
};

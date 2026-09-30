import { alpha, decomposeColor, getContrastRatio } from '@mui/material/styles';

/**
 * Colour arithmetic for the skins.
 *
 * The skins derive every colour from the active preset rather than bringing
 * their own, so they need a few operations MUI does not ship: mixing two
 * colours, laying a translucent colour over an opaque one to learn what the
 * eye actually sees, and nudging a colour darker or lighter until it clears a
 * contrast ratio. The contrast tests use the same functions, so what is tested
 * is exactly what is painted.
 */

type Channels = [red: number, green: number, blue: number, opacity: number];

const toChannels = (colour: string): Channels => {
  if (colour === 'transparent') return [0, 0, 0, 0];
  const { type, values } = decomposeColor(colour);
  if (type !== 'rgb' && type !== 'rgba') {
    throw new Error(`Skin colours must be hex or rgb(a), got ${colour}`);
  }
  return [values[0], values[1], values[2], type === 'rgba' ? (values[3] ?? 1) : 1];
};

const channelHex = (value: number): string =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');

const toHex = ([red, green, blue]: Channels): string =>
  `#${channelHex(red)}${channelHex(green)}${channelHex(blue)}`.toUpperCase();

/** `colour` at `opacity`, as `rgba()`. MUI's own `alpha`, re-exported so skins import one module. */
export const withOpacity = (colour: string, opacity: number): string => alpha(colour, opacity);

/**
 * Two opaque colours blended in sRGB: `weight` 0 is all `base`, 1 all `other`.
 * Opacity is ignored, which is what the skins want when deriving a canvas.
 */
export const mix = (base: string, other: string, weight: number): string => {
  const a = toChannels(base);
  const b = toChannels(other);
  return toHex([
    a[0] + (b[0] - a[0]) * weight,
    a[1] + (b[1] - a[1]) * weight,
    a[2] + (b[2] - a[2]) * weight,
    1,
  ]);
};

/**
 * What the eye sees when `top` (possibly translucent) is painted over
 * `bottom` (treated as opaque): ordinary source-over compositing.
 */
export const over = (top: string, bottom: string): string => {
  const [r, g, b, a] = toChannels(top);
  const under = toChannels(bottom);
  return toHex([
    r * a + under[0] * (1 - a),
    g * a + under[1] * (1 - a),
    b * a + under[2] * (1 - a),
    1,
  ]);
};

/** WCAG contrast ratio of two colours; translucent `fg` is composited over `bg` first. */
export const contrast = (fg: string, bg: string): number => getContrastRatio(over(fg, bg), bg);

/**
 * `colour`, moved towards black or white (whichever `against` contrasts with
 * more) in small steps until it reaches `ratio` against `against`. Keeps the
 * hue for as long as possible, so a skin's link is still recognisably the
 * preset's primary, only deep enough to read.
 */
export const ensureContrast = (colour: string, against: string, ratio: number): string => {
  const target =
    getContrastRatio('#000000', against) >= getContrastRatio('#FFFFFF', against)
      ? '#000000'
      : '#FFFFFF';
  const solid = over(colour, against);
  for (let step = 0; step <= 50; step += 1) {
    const candidate = mix(solid, target, step / 50);
    if (getContrastRatio(candidate, against) >= ratio) return candidate;
  }
  return target;
};

/**
 * The same as `ensureContrast`, but against several backgrounds at once: the
 * result reads on the worst of them. Used where one colour sits on a surface
 * whose look varies (a frosted panel over a gradient).
 */
export const ensureContrastOnAll = (
  colour: string,
  against: readonly string[],
  ratio: number,
): string =>
  against.reduce((current, background) => ensureContrast(current, background, ratio), colour);

/**
 * A boundary colour for a control on `surface`: `ink` blended into the
 * surface just far enough to reach `ratio` (3:1 for WCAG 1.4.11). The line is
 * as quiet as the rule allows, which is what a soft skin needs.
 */
export const boundary = (surface: string, ink: string, ratio = 3): string => {
  for (let step = 1; step <= 50; step += 1) {
    const candidate = mix(surface, ink, step / 50);
    if (getContrastRatio(candidate, surface) >= ratio) return candidate;
  }
  return ink;
};

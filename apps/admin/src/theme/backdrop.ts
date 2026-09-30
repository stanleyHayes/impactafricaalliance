import { decomposeColor } from '@mui/material/styles';

/**
 * Soft pools of colour on the canvas, and the colours they really produce.
 *
 * Glass and Clay wash the canvas with a few large radial gradients. Text that
 * sits straight on the canvas (a heading between cards, a record count) has
 * to read wherever a pool happens to be, so the skins need the darkest and
 * lightest colour the wash can produce. Assuming every pool at full strength
 * on top of the others is far too pessimistic (the pools sit in different
 * corners), so this evaluates the gradients exactly as the browser draws them
 * over a grid of real screen sizes, from a small phone to a large monitor,
 * and reports the extremes.
 */

/** A radial gradient from `colour` at the centre to transparent at `POOL_FADE` of its radii. */
export interface ColourPool {
  /** The colour at the centre, with its opacity (`rgba()`). */
  colour: string;
  /** Horizontal and vertical radii of the ellipse, in px. */
  width: number;
  height: number;
  /** Centre, as a percentage of the viewport (the wash is fixed to it). */
  x: number;
  y: number;
}

/** Where along its radii a pool has faded to transparent. */
export const POOL_FADE = 0.7;

/** The `background-image` for a set of pools, first on top. */
export const poolsToCss = (pools: readonly ColourPool[]): string =>
  pools
    .map(
      (pool) =>
        `radial-gradient(${pool.width}px ${pool.height}px at ${pool.x}% ${pool.y}%, ${pool.colour}, transparent ${POOL_FADE * 100}%)`,
    )
    .join(', ');

/** Screen sizes the wash is evaluated on: phones, tablets, laptops, large monitors. */
const VIEWPORTS: readonly (readonly [number, number])[] = [
  [320, 568],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
];

const GRID = 16;

type Rgb = [number, number, number];

const rgbaOf = (colour: string): [number, number, number, number] => {
  const { values } = decomposeColor(colour);
  return [values[0], values[1], values[2], values[3] ?? 1];
};

const linear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]: Rgb): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

const hex = (rgb: Rgb): string =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/**
 * The colour of the washed canvas at one point. CSS draws the first gradient
 * on top, so the pools are laid from last to first.
 */
const colourAt = (
  base: Rgb,
  pools: readonly (ColourPool & { rgba: number[] })[],
  point: number[],
): Rgb => {
  const [x = 0, y = 0, width = 1, height = 1] = point;
  const out: Rgb = [...base];
  for (let index = pools.length - 1; index >= 0; index -= 1) {
    const pool = pools[index] as ColourPool & { rgba: number[] };
    const reach = Math.hypot(
      (x - (pool.x / 100) * width) / pool.width,
      (y - (pool.y / 100) * height) / pool.height,
    );
    const [red = 0, green = 0, blue = 0, peak = 0] = pool.rgba;
    const opacity = peak * Math.max(0, 1 - reach / POOL_FADE);
    out[0] = red * opacity + out[0] * (1 - opacity);
    out[1] = green * opacity + out[1] * (1 - opacity);
    out[2] = blue * opacity + out[2] * (1 - opacity);
  }
  return out;
};

const cache = new Map<string, string[]>();

/**
 * The base colour, and the darkest and lightest colours the pools make of it
 * anywhere on any of the screen sizes: every colour text on the bare canvas
 * has to read against. Cached, as themes are rebuilt on every switch.
 */
export const washExtremes = (base: string, pools: readonly ColourPool[]): string[] => {
  const key = `${base}|${JSON.stringify(pools)}`;
  const known = cache.get(key);
  if (known) return known;
  const [r, g, b] = rgbaOf(base);
  const prepared = pools.map((pool) => ({ ...pool, rgba: rgbaOf(pool.colour) }));
  const extremes = { darkest: [r, g, b] as Rgb, lightest: [r, g, b] as Rgb, low: 2, high: -1 };
  for (const [width, height] of VIEWPORTS) {
    for (let y = 0; y <= height; y += GRID) {
      for (let x = 0; x <= width; x += GRID) {
        const colour = colourAt([r, g, b], prepared, [x, y, width, height]);
        const lum = luminance(colour);
        if (lum < extremes.low) Object.assign(extremes, { darkest: colour, low: lum });
        if (lum > extremes.high) Object.assign(extremes, { lightest: colour, high: lum });
      }
    }
  }
  const { darkest, lightest } = extremes;
  const result = [hex([r, g, b]), hex(darkest), hex(lightest)];
  cache.set(key, result);
  return result;
};

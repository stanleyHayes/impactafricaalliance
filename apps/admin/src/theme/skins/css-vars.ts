import type { SkinTokens } from './types';

/**
 * How skin tokens become CSS custom properties: `surfaceBg` is published as
 * `--iaa-surface-bg`. One mapping, used by the theme when it writes `:root`,
 * by the helpers in `theme/surfaces.ts` when they read the values, and by the
 * theme picker when it scopes a miniature to one skin.
 */

export type SkinTokenName = keyof SkinTokens;

const PREFIX = '--iaa-';

/** `surfaceRaisedShadow` → `--iaa-surface-raised-shadow`. */
export const cssVarName = (token: SkinTokenName): string =>
  `${PREFIX}${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

/** `var(--iaa-…)` for a token, ready to use as any CSS value in `sx` or a style override. */
export const skinVar = (token: SkinTokenName): string => `var(${cssVarName(token)})`;

/** Every token as a custom property declaration, for `:root` or a scoped element's `style`. */
export const toCssVars = (tokens: Partial<SkinTokens>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tokens).map(([token, value]) => [cssVarName(token as SkinTokenName), value]),
  );

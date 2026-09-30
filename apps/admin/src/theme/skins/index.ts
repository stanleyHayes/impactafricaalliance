import { classicSkin } from './classic';
import { claymorphismSkin } from './claymorphism';
import { glassFallbackTokens, glassmorphismSkin } from './glassmorphism';
import { neumorphismSkin } from './neumorphism';
import type { SkinDefinition, SkinKey, SkinTokens } from './types';

export { cssVarName, skinVar, toCssVars, type SkinTokenName } from './css-vars';
export { readableStatus, readingGroundsOf } from './status';
export type { SkinContext, SkinDefinition, SkinKey, SkinTokens } from './types';

const SKINS: Record<SkinKey, SkinDefinition> = {
  classic: classicSkin,
  neumorphism: neumorphismSkin,
  glassmorphism: glassmorphismSkin,
  claymorphism: claymorphismSkin,
};

/** The console's skins in picker order, Classic first. */
export const THEME_SKINS: readonly SkinDefinition[] = [
  classicSkin,
  neumorphismSkin,
  glassmorphismSkin,
  claymorphismSkin,
];

export const DEFAULT_SKIN: SkinKey = 'classic';

export const isSkinKey = (value: unknown): value is SkinKey =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(SKINS, value);

export const getSkin = (key: SkinKey): SkinDefinition => SKINS[key];

/**
 * Extra `:root` blocks a skin publishes after its tokens. Glass swaps every
 * translucent surface for its opaque equivalent where the browser cannot blur
 * or the person has asked for less transparency; the other skins are opaque
 * already and publish nothing.
 */
export const skinFallbacks = (
  key: SkinKey,
  tokens: SkinTokens,
): Record<string, Partial<SkinTokens>> => {
  if (key !== 'glassmorphism') return {};
  const opaque = glassFallbackTokens(tokens);
  return {
    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': opaque,
    '@media (prefers-reduced-transparency: reduce)': opaque,
  };
};

import { describe, expect, it } from 'vitest';

import { cssVarName } from './skins';
import { choiceSx, skinned, surfaceSx, tokenVar } from './surfaces';
import { createAppTheme } from './theme';

const classic = createAppTheme('iaa', 'light', 'classic');
const clay = createAppTheme('iaa', 'light', 'claymorphism');

describe('token names', () => {
  it('turns a token into its custom property', () => {
    expect(cssVarName('surfaceRaisedShadow')).toBe('--iaa-surface-raised-shadow');
    expect(cssVarName('appbarBg')).toBe('--iaa-appbar-bg');
    expect(tokenVar('navActiveBg')).toBe('var(--iaa-nav-active-bg)');
  });

  it('only reads tokens the theme publishes', () => {
    const published = Object.keys(classic.skinTokens ?? {}).map(
      (token) => `var(${cssVarName(token as never)})`,
    );
    const used =
      JSON.stringify({ surfaceSx, choice: choiceSx(true) }).match(/var\(--iaa-[a-z-]+\)/g) ?? [];
    expect(used.length).toBeGreaterThan(20);
    used.forEach((reference) => expect(published).toContain(reference));
  });
});

describe('skinned', () => {
  const card = { p: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' };

  it('returns the Classic styles untouched in Classic', () => {
    expect(skinned(card, surfaceSx.card)(classic)).toBe(card);
  });

  it('treats a theme without a skin (a bare createTheme) as Classic', () => {
    const bare = { ...classic, skin: undefined };
    expect(skinned(card, surfaceSx.card)(bare)).toBe(card);
  });

  it('lays the skin over the Classic styles elsewhere, keeping layout', () => {
    const result = skinned(card, surfaceSx.card)(clay) as Record<string, unknown>;
    expect(result.p).toBe(3);
    expect(result.bgcolor).toBe('var(--iaa-surface-bg)');
    expect(result.border).toBe('var(--iaa-surface-border)');
    expect(result.borderColor).toBe('var(--iaa-surface-border-color)');
  });

  it('drops a Classic border colour that would recolour the skin’s border', () => {
    const result = skinned(card, { border: tokenVar('overlayBorder') })(clay) as Record<
      string,
      unknown
    >;
    expect(result.border).toBe('var(--iaa-overlay-border)');
    expect(result).not.toHaveProperty('borderColor');
  });

  it('merges nested states rather than replacing them', () => {
    const result = skinned(
      { '&:hover': { color: 'text.primary', bgcolor: 'action.hover' } },
      { '&:hover': { bgcolor: tokenVar('controlBg') } },
    )(clay) as Record<string, Record<string, unknown>>;
    expect(result['&:hover']).toEqual({ color: 'text.primary', bgcolor: 'var(--iaa-control-bg)' });
  });
});

describe('Classic values of the helpers', () => {
  const tokens = classic.skinTokens;

  it('card matches the common hand-built card', () => {
    expect(tokens?.surfaceBg).toBe(classic.palette.background.paper);
    expect(tokens?.surfaceBorder).toBe(`1px solid ${classic.palette.divider}`);
    expect(tokens?.surfaceBorderColor).toBe(classic.palette.divider);
    expect(tokens?.surfaceShadow).toBe('none');
    expect(tokens?.surfaceBackdrop).toBe('none');
  });

  it('a selected choice keeps the elevation-4 shadow it had', () => {
    expect(tokens?.choiceSelectedShadow).toBe(classic.shadows[4]);
    expect(tokens?.choiceShadow).toBe('none');
    expect(tokens?.focusRing).toBe(`2px solid ${classic.palette.primary.main}`);
  });
});

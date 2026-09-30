import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import classicFixture from './__fixtures__/classic-theme.json';
import { over } from './colour';
import { cssVarName, getSkin, THEME_SKINS, type SkinKey, type SkinTokens } from './skins';
import { contentExtreme } from './skins/shared';
import { createAppTheme, getPresetPalette, THEME_PRESETS, type ThemePresetKey } from './theme';

// WCAG AA for text under 18.66px bold, which every chip label and tab is.
const AA_TEXT = 4.5;
// WCAG 1.4.11 for control boundaries and focus indicators.
const AA_UI = 3;

const MODES = ['light', 'dark'] as const;

const EVERY_THEME = THEME_PRESETS.flatMap((preset) =>
  MODES.map((mode) => [preset.key, mode] as const),
);

describe('theme contrast', () => {
  it.each(EVERY_THEME)('%s %s: warning and info chips have readable labels', (preset, mode) => {
    const { palette } = createAppTheme(preset, mode);
    expect(
      getContrastRatio(palette.warning.main, palette.warning.contrastText),
    ).toBeGreaterThanOrEqual(AA_TEXT);
    expect(getContrastRatio(palette.info.main, palette.info.contrastText)).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
  });

  it.each(EVERY_THEME)(
    '%s %s: the current tab and sidebar row read on the primary fill, and on its hover',
    (preset, mode) => {
      const { palette } = createAppTheme(preset, mode);
      // DetailTabs and SidebarNav write the active item in this colour.
      const text = palette.getContrastText(palette.primary.main);
      expect(getContrastRatio(palette.primary.main, text)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(getContrastRatio(palette.primary.dark, text)).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );
});

/**
 * The same serialisation the fixture was captured with, from the theme code
 * as it stood before skins: functions by name, React elements by type.
 */
const serialise = (value: unknown): unknown => {
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(serialise);
  const record = value as Record<string, unknown>;
  if ('$$typeof' in record && 'type' in record) {
    const type = record.type as { name?: string } | string;
    return {
      $element: typeof type === 'string' ? type : type.name,
      props: serialise(record.props),
    };
  }
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, serialise(item)]));
};

/** The theme's pre-skin fields, with the `:root` token block Classic adds taken out. */
const classicShape = (preset: ThemePresetKey, mode: 'light' | 'dark') => {
  const theme = createAppTheme(preset, mode, 'classic');
  const snapshot = serialise({
    shape: theme.shape,
    shadows: theme.shadows,
    typography: theme.typography,
    palette: theme.palette,
    components: theme.components,
  }) as Record<string, unknown> & {
    components: { MuiCssBaseline: { styleOverrides: Record<string, unknown> } };
  };
  const { ':root': tokens, ...baseline } = snapshot.components.MuiCssBaseline.styleOverrides;
  snapshot.components.MuiCssBaseline.styleOverrides = baseline;
  return { snapshot, tokens: tokens as Record<string, string> };
};

/**
 * Captured from the theme code before skins existed. Shape, shadows and
 * typography were the same for every preset, so they are stored once.
 */
const fixture = classicFixture as {
  shared: Record<'shape' | 'shadows' | 'typography', unknown>;
  themes: Record<string, { palette: unknown; components: unknown }>;
};

describe('Classic skin', () => {
  it.each(EVERY_THEME)(
    '%s %s: palette, shape, shadows, typography and overrides are unchanged',
    (preset, mode) => {
      const { snapshot } = classicShape(preset, mode);
      const expected = fixture.themes[`${preset}-${mode}`];
      expect(snapshot.palette).toEqual(expected?.palette);
      expect(snapshot.components).toEqual(expected?.components);
      expect(snapshot.shape).toEqual(fixture.shared.shape);
      expect(snapshot.shadows).toEqual(fixture.shared.shadows);
      expect(snapshot.typography).toEqual(fixture.shared.typography);
    },
  );

  it('is the default skin', () => {
    expect(createAppTheme('iaa', 'light').skin).toBe('classic');
    expect(createAppTheme('iaa', 'light').components).toEqual(
      createAppTheme('iaa', 'light', 'classic').components,
    );
  });

  it.each(EVERY_THEME)('%s %s: publishes every token on :root', (preset, mode) => {
    const { tokens } = classicShape(preset, mode);
    const theme = createAppTheme(preset, mode, 'classic');
    const names = Object.keys(theme.skinTokens ?? {}) as (keyof SkinTokens)[];
    expect(names.length).toBeGreaterThan(100);
    names.forEach((name) => expect(tokens[cssVarName(name)]).toBe(theme.skinTokens?.[name]));
  });

  it('maps the tokens to what the hand-built surfaces paint today', () => {
    const tokens = createAppTheme('iaa', 'light', 'classic').skinTokens as SkinTokens;
    // PageHeader: alpha(primary, 0.075) with a 0.14 border, a 0.11 bottom rule.
    expect(tokens.heroBg).toBe('rgba(0, 214, 139, 0.075)');
    expect(tokens.heroBorder).toBe('1px solid rgba(0, 214, 139, 0.14)');
    expect(tokens.heroBorderBottom).toBe('1px solid rgba(0, 214, 139, 0.11)');
    // The common card, the section header tint, the shell.
    expect(tokens.surfaceBg).toBe('#FFFFFF');
    expect(tokens.surfaceBorder).toBe('1px solid #E2E0DA');
    expect(tokens.surfaceTintBg).toBe('rgba(0, 214, 139, 0.045)');
    expect(tokens.appbarBg).toBe('rgba(255, 255, 255, 0.88)');
    expect(tokens.appbarBackdrop).toBe('blur(14px)');
    expect(tokens.sidebarBg).toBe('rgba(255, 255, 255, 0.96)');
    expect(tokens.navActiveBg).toBe('#00D68B');
    for (const shadow of ['surfaceShadow', 'surfaceRaisedShadow', 'heroShadow'] as const) {
      expect(tokens[shadow]).toBe('none');
    }
  });
});

const SKINNED = THEME_SKINS.filter((skin) => skin.key !== 'classic').map((skin) => skin.key);

const EVERY_SKINNED_THEME = SKINNED.flatMap((skin) =>
  EVERY_THEME.map(([preset, mode]) => [skin, preset, mode] as const),
);

/**
 * Every opaque colour a kind of surface can end up, for one skin, preset and
 * mode: its token composited over each colour the canvas reaches, and for
 * floating panels over the darkest (lightest in dark mode) content as well.
 */
const groundsFor = (skin: SkinKey, preset: ThemePresetKey, mode: 'light' | 'dark') => {
  const definition = getSkin(skin);
  const source = definition.palette(getPresetPalette(preset, mode));
  const tokens = createAppTheme(preset, mode, skin).skinTokens as SkinTokens;
  const backdrops = definition.backdrops(source);
  const floating = [...backdrops, contentExtreme(mode)];
  const on = (colour: string, grounds: readonly string[]) => grounds.map((g) => over(colour, g));
  const cards = on(tokens.surfaceBg, backdrops);
  return {
    tokens,
    page: on(tokens.pageBg, backdrops),
    cards,
    tinted: cards.flatMap((card) => on(tokens.surfaceTintBg, [card])),
    overlays: on(tokens.overlayBg, floating),
    appbar: on(tokens.appbarBg, floating),
    sidebar: on(tokens.sidebarBg, backdrops),
    hero: on(tokens.heroBg, backdrops),
    inputs: on(tokens.inputBg, cards),
  };
};

const worst = (fg: string, grounds: readonly string[]): number =>
  Math.min(...grounds.map((ground) => getContrastRatio(over(fg, ground), ground)));

describe('skin contrast', () => {
  it.each(EVERY_SKINNED_THEME)('%s %s %s: text reads on every surface', (skin, preset, mode) => {
    const g = groundsFor(skin, preset, mode);
    const everywhere = [
      ...g.page,
      ...g.cards,
      ...g.tinted,
      ...g.overlays,
      ...g.appbar,
      ...g.sidebar,
      ...g.hero,
      ...g.inputs,
    ];
    expect(worst(g.tokens.textPrimary, everywhere)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(worst(g.tokens.textSecondary, everywhere)).toBeGreaterThanOrEqual(AA_TEXT);
    const readingSurfaces = [...g.page, ...g.cards, ...g.tinted, ...g.overlays];
    expect(worst(g.tokens.accentText, readingSurfaces)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(worst(g.tokens.linkColor, readingSurfaces)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(EVERY_SKINNED_THEME)(
    '%s %s %s: navigation reads in every state',
    (skin, preset, mode) => {
      const g = groundsFor(skin, preset, mode);
      const { tokens } = g;
      const hovered = g.sidebar.map((ground) => over(tokens.navHoverBg, ground));
      const active = g.sidebar.map((ground) => over(tokens.navActiveBg, ground));
      const activeHover = g.sidebar.map((ground) => over(tokens.navActiveHoverBg, ground));
      expect(worst(tokens.navColor, g.sidebar)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(worst(tokens.navHoverColor, hovered)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(worst(tokens.navActiveColor, active)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(worst(tokens.navActiveColor, activeHover)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(worst(tokens.navHeadingColor, g.sidebar)).toBeGreaterThanOrEqual(AA_TEXT);
      // The count pills, at rest and on the current row.
      expect(getContrastRatio(tokens.navBadgeColor, tokens.navBadgeBg)).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
      expect(
        getContrastRatio(tokens.navBadgeColor, tokens.navBadgeActiveBg),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it.each(EVERY_SKINNED_THEME)(
    '%s %s %s: selected rows and segments read',
    (skin, preset, mode) => {
      const g = groundsFor(skin, preset, mode);
      const { tokens } = g;
      const selectedItems = g.overlays.map((ground) => over(tokens.itemSelectedBg, ground));
      const itemText =
        tokens.itemSelectedColor === 'inherit' ? tokens.textPrimary : tokens.itemSelectedColor;
      expect(worst(itemText, selectedItems)).toBeGreaterThanOrEqual(AA_TEXT);
      // Segmented controls sit in cards; page tabs sit straight on the page.
      const segments = [...g.cards, ...g.page].map((ground) =>
        over(tokens.segmentSelectedBg, over(tokens.segmentBg, ground)),
      );
      expect(worst(tokens.segmentSelectedColor, segments)).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it.each(EVERY_SKINNED_THEME)(
    '%s %s %s: fields, focus and selection keep a 3:1 edge',
    (skin, preset, mode) => {
      const g = groundsFor(skin, preset, mode);
      const { tokens } = g;
      expect(worst(tokens.inputBorderColor, g.inputs)).toBeGreaterThanOrEqual(AA_UI);
      expect(
        worst(tokens.focusRingColor, [...g.page, ...g.cards, ...g.overlays]),
      ).toBeGreaterThanOrEqual(AA_UI);
      expect(worst(tokens.choiceSelectedBorderColor, g.cards)).toBeGreaterThanOrEqual(AA_UI);
      const zones = g.cards.map((card) => over(tokens.dropzoneBg, card));
      expect(worst(tokens.dropzoneBorderColor, zones)).toBeGreaterThanOrEqual(AA_UI);
      expect(worst(tokens.navChevronColor, g.sidebar)).toBeGreaterThanOrEqual(AA_UI);
    },
  );

  it.each(EVERY_SKINNED_THEME)(
    '%s %s %s: status colours read as text, and keep readable labels when filled',
    (skin, preset, mode) => {
      const g = groundsFor(skin, preset, mode);
      const { palette } = createAppTheme(preset, mode, skin);
      const reading = [...g.cards, ...g.tinted, ...g.overlays];
      for (const key of ['error', 'warning', 'info', 'success'] as const) {
        const { main, contrastText } = palette[key];
        expect(worst(main, reading), key).toBeGreaterThanOrEqual(AA_TEXT);
        expect(getContrastRatio(main, contrastText), key).toBeGreaterThanOrEqual(AA_TEXT);
      }
    },
  );

  it('leaves a status colour that already reads exactly as it was', () => {
    const classic = createAppTheme('iaa', 'light', 'classic').palette;
    const neumorphism = createAppTheme('iaa', 'light', 'neumorphism').palette;
    expect(neumorphism.info.main).toBe(classic.info.main);
    expect(neumorphism.error.main).not.toBe(classic.error.main);
    // Classic keeps its own status colours whatever they read at.
    expect(createAppTheme('iaa', 'dark', 'classic').palette.error.main).toBe('#f44336');
  });

  it.each(EVERY_SKINNED_THEME)('%s %s %s: tooltips read over anything', (skin, preset, mode) => {
    const { tokens, page, cards } = groundsFor(skin, preset, mode);
    // A tooltip floats over the page, a card or a photograph of either extreme.
    const behind = [...page, ...cards, '#FFFFFF', '#000000'];
    const plates = behind.map((ground) => over(tokens.tooltipBg, ground));
    expect(worst(tokens.tooltipColor, plates)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(EVERY_SKINNED_THEME)(
    '%s %s %s: primary fills keep readable labels',
    (skin, preset, mode) => {
      const { palette } = createAppTheme(preset, mode, skin);
      const text = palette.getContrastText(palette.primary.main);
      expect(getContrastRatio(palette.primary.main, text)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(getContrastRatio(palette.primary.dark, text)).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );
});

describe('skins', () => {
  it.each(EVERY_SKINNED_THEME)(
    '%s %s %s: every token has a value and is published',
    (skin, preset, mode) => {
      const theme = createAppTheme(preset, mode, skin);
      const root =
        (
          theme.components?.MuiCssBaseline?.styleOverrides as Record<string, Record<string, string>>
        )[':root'] ?? {};
      const tokens = theme.skinTokens as SkinTokens;
      Object.entries(tokens).forEach(([name, value]) => {
        expect(value, name).toMatch(/\S/);
        expect(value, name).not.toMatch(/undefined|NaN/);
        expect(root[cssVarName(name as keyof SkinTokens)]).toBe(value);
      });
      expect(Object.keys(tokens)).toEqual(
        Object.keys(createAppTheme(preset, mode, 'classic').skinTokens ?? {}),
      );
    },
  );

  it('keeps the preset colours: the primary is the preset primary in every skin', () => {
    for (const skin of SKINNED) {
      const { palette } = createAppTheme('aura', 'light', skin);
      expect(palette.primary.main).toBe('#7C3AED');
      expect(palette.secondary.main).toBe('#22D3EE');
    }
  });

  it('scales the corner radius, so numeric sx radii follow the skin', () => {
    expect(createAppTheme('iaa', 'light', 'classic').shape.borderRadius).toBe(4);
    expect(createAppTheme('iaa', 'light', 'neumorphism').shape.borderRadius).toBe(6);
    expect(createAppTheme('iaa', 'light', 'glassmorphism').shape.borderRadius).toBe(6);
    expect(createAppTheme('iaa', 'light', 'claymorphism').shape.borderRadius).toBe(8);
  });

  it('gives Glass opaque fallbacks without blur and for reduced transparency', () => {
    const theme = createAppTheme('iaa', 'light', 'glassmorphism');
    const baseline = theme.components?.MuiCssBaseline?.styleOverrides as Record<
      string,
      Record<string, Record<string, string>>
    >;
    const reduced = baseline['@media (prefers-reduced-transparency: reduce)']?.[':root'] ?? {};
    const noBlur = Object.entries(baseline).find(([key]) => key.startsWith('@supports not'))?.[1][
      ':root'
    ];
    expect(reduced).toEqual(noBlur);
    expect(reduced['--iaa-surface-backdrop']).toBe('none');
    expect(reduced['--iaa-surface-bg']).toMatch(/^#[0-9A-F]{6}$/);
    expect(reduced['--iaa-appbar-bg']).toMatch(/^#[0-9A-F]{6}$/);
    // The other skins are opaque already and publish no fallback.
    const neu = createAppTheme('iaa', 'light', 'neumorphism').components?.MuiCssBaseline
      ?.styleOverrides as Record<string, unknown>;
    expect(Object.keys(neu).some((key) => key.includes('reduced-transparency'))).toBe(false);
  });

  it('gives Classic the values it already paints for the newer tokens', () => {
    const tokens = createAppTheme('iaa', 'light', 'classic').skinTokens as SkinTokens;
    // MUI's own tooltip, a nested card that is just a card, the drawer's page colour.
    expect(tokens.tooltipBg).toBe('rgba(97, 97, 97, 0.92)');
    expect(tokens.tooltipColor).toBe('#fff');
    expect(tokens.surfaceNestedBg).toBe(tokens.surfaceBg);
    expect(tokens.surfaceNestedShadow).toBe('none');
    expect(tokens.sheetBg).toBe('#F7F5F0');
    expect(tokens.sheetImage).toBe('none');
    expect(tokens.linkUnderlineThickness).toBe('auto');
    expect(tokens.linkUnderlineOffset).toBe('auto');
  });

  it('makes the current page the strongest row in the Neumorphism sidebar', () => {
    for (const mode of MODES) {
      const tokens = createAppTheme('iaa', mode, 'neumorphism').skinTokens as SkinTokens;
      // Pressed in and tinted, while hover only lifts a little.
      expect(tokens.navActiveBg).not.toBe(tokens.canvasBg);
      expect(tokens.navActiveShadow).toMatch(/^inset/);
      expect(tokens.navHoverShadow).toMatch(/^2px 2px 5px/);
      expect(tokens.itemSelectedBg).toBe(tokens.navActiveBg);
    }
  });

  it('keeps Neumorphism dark in the preset hue rather than a neutral grey', () => {
    const canvas = createAppTheme('iaa', 'dark', 'neumorphism').skinTokens?.canvasBg ?? '';
    const [red, green, blue] = [1, 3, 5].map((at) => parseInt(canvas.slice(at, at + 2), 16));
    // IAA's forest: green leads, and clearly so.
    expect(green).toBeGreaterThan((red ?? 0) + 8);
    expect(green).toBeGreaterThan(blue ?? 0);
  });

  it.each(EVERY_THEME)('%s %s: a plain chip stands off a Glass card', (preset, mode) => {
    const { tokens, cards } = groundsFor('glassmorphism', preset, mode);
    const chips = cards.map((card) => over(tokens.chipDefaultBg, card));
    chips.forEach((chip, index) => {
      expect(getContrastRatio(chip, cards[index] ?? chip)).toBeGreaterThan(1.05);
    });
  });

  it('gives Clay the same focus ring weight as the other skins', () => {
    for (const skin of SKINNED) {
      const tokens = createAppTheme('iaa', 'light', skin).skinTokens as SkinTokens;
      expect(tokens.focusRing).toMatch(/^2px solid /);
    }
  });

  it('turns Clay presses off under reduced motion', () => {
    const root = createAppTheme('iaa', 'light', 'claymorphism').components?.MuiButton
      ?.styleOverrides?.root as Record<string, unknown>;
    expect(root['&:active']).toEqual({ transform: 'translateY(2px)' });
    expect(root['@media (prefers-reduced-motion: reduce)']).toEqual({
      '&:hover, &:active': { transform: 'none' },
    });
  });
});

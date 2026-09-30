import { alpha } from '@mui/material/styles';

import { poolsToCss, washExtremes, type ColourPool } from '../backdrop';
import { boundary, ensureContrast, ensureContrastOnAll, mix, over } from '../colour';
import type { PresetPalette } from '../theme';

import { skinComponents } from './components';
import { AA_TEXT, AA_UI, byMode, composited, contentExtreme, huesOf, readableText } from './shared';
import type { SkinContext, SkinDefinition, SkinTokens } from './types';
import { shadowList } from './types';

/**
 * Glassmorphism: frosted panels over a calm wash of the preset's own colours.
 *
 * The canvas carries four large, soft radial gradients built from the
 * primary and secondary, fixed to the viewport so panels slide over them.
 * Every surface is translucent with a backdrop blur, a light hairline edge and
 * a soft shadow; floating panels (top bar, menus, dialogs) are more opaque
 * than cards because they can pass over photographs as well as the canvas.
 *
 * Readability is computed, not hoped for: secondary text, links and focus are
 * checked against every mix of the backdrop layers behind each surface, and
 * floating panels against the darkest (or, in dark mode, lightest) content.
 * Where the browser cannot blur, or the person has asked for less
 * transparency, every surface falls back to its opaque equivalent (see
 * `glassFallbackTokens`).
 */

const OPACITY = {
  light: { surface: 0.58, overlay: 0.9, appbar: 0.84, sidebar: 0.56, hero: 0.52, input: 0.62 },
  dark: { surface: 0.6, overlay: 0.9, appbar: 0.86, sidebar: 0.6, hero: 0.55, input: 0.55 },
} as const;

/**
 * The glass itself: white in light mode; in dark, the preset's paper only a
 * little deepened, so panels stay a tinted glass rather than near-black.
 */
const glassBase = (preset: PresetPalette): string =>
  byMode(preset.mode, '#FFFFFF', mix(preset.background.paper, '#000000', 0.2));

/** Where each pool sits, as a fraction of the viewport, and how far it reaches. */
const POOL_SHAPES = [
  { width: 900, height: 640, x: 0, y: 0 },
  { width: 760, height: 580, x: 100, y: 16 },
  { width: 1000, height: 700, x: 58, y: 110 },
  { width: 1100, height: 760, x: 45, y: 56 },
] as const;

/** How far dark mode deepens its primary pools towards black, so the glow is colour rather than light. */
const DARK_DEEPEN = 0.4;

/**
 * The wash: the primary from the top left, the secondary from the right, a
 * lighter primary rising from the bottom and a broad, soft pool across the
 * middle, so there is colour behind every card rather than only near the
 * edges. Dark mode deepens the primary pools (a bright glow would force
 * secondary text towards white) and keeps the secondary faint: a warm hue
 * over near-black turns khaki.
 */
const pools = (preset: PresetPalette): ColourPool[] => {
  const { primary, primaryLight, primaryDark, secondary } = huesOf(preset);
  const deep = (hue: string): string => mix(hue, '#000000', DARK_DEEPEN);
  const layers: readonly (readonly [string, number])[] = byMode(
    preset.mode,
    [
      [primary, 0.46],
      [secondary, 0.4],
      [primaryLight, 0.38],
      [primaryLight, 0.3],
    ],
    [
      [deep(primary), 0.45],
      [secondary, 0.06],
      [deep(primaryDark), 0.4],
      [deep(primary), 0.22],
    ],
  );
  return POOL_SHAPES.map((shape, index) => {
    const [hue, strength] = layers[index] ?? [primary, 0];
    return { ...shape, colour: alpha(hue, strength) };
  });
};

/** The skin's plain canvas: in light mode a breath of the primary, so no part of the page is bare. */
const glassCanvas = (preset: PresetPalette): string =>
  byMode(
    preset.mode,
    mix(preset.canvas, huesOf(preset).primaryLight, 0.05),
    preset.background.default,
  );

/** The canvas of a palette this skin has already built (`glassPalette` sets both fields). */
const canvasOf = (preset: PresetPalette): string =>
  byMode(preset.mode, preset.canvas, preset.background.default);

/** The plain canvas and the darkest and lightest the wash makes it, on any screen. */
const backdropSamples = (preset: PresetPalette): string[] =>
  washExtremes(canvasOf(preset), pools(preset));

const materialsOf = (preset: PresetPalette) => {
  const base = glassBase(preset);
  const opacity = OPACITY[preset.mode];
  return {
    surface: alpha(base, opacity.surface),
    overlay: alpha(base, opacity.overlay),
    appbar: alpha(base, opacity.appbar),
    sidebar: alpha(base, opacity.sidebar),
    hero: alpha(mix(base, huesOf(preset).primary, 0.1), opacity.hero),
    input: byMode(preset.mode, alpha('#FFFFFF', opacity.input), alpha('#000000', 0.25)),
  };
};

/** Every opaque colour text can land on in this skin, for this preset. */
const readingGrounds = (preset: PresetPalette): string[] => {
  const samples = backdropSamples(preset);
  const glass = materialsOf(preset);
  const cards = composited(glass.surface, samples);
  const extreme = contentExtreme(preset.mode);
  const tinted = cards.map((card) => over(alpha(huesOf(preset).primary, 0.1), card));
  return [
    ...samples,
    ...cards,
    ...tinted,
    ...composited(glass.input, cards),
    ...composited(glass.sidebar, samples),
    ...composited(glass.hero, samples),
    ...composited(glass.overlay, [...samples, extreme]),
    ...composited(glass.appbar, [...samples, extreme]),
  ];
};

const glassPalette = (preset: PresetPalette): PresetPalette => {
  const canvas = glassCanvas(preset);
  const onCanvas = { ...preset, canvas, background: { ...preset.background, default: canvas } };
  const glass = materialsOf(onCanvas);
  const divider = byMode(preset.mode, alpha(preset.text.primary, 0.12), alpha('#FFFFFF', 0.12));
  return {
    ...preset,
    // Paper is the opaque equivalent of a card, for the places MUI needs a
    // solid colour (the data grid's sticky header, the avatar ring).
    background: { default: canvas, paper: over(glass.surface, canvas) },
    canvas,
    text: readableText(preset, readingGrounds(onCanvas)),
    divider,
    cardBorder: divider,
  };
};

const glassTokenMaterials = ({ palette, source }: SkinContext) => {
  const mode = palette.mode;
  const primary = palette.primary.main;
  const grounds = readingGrounds(source);
  // Dark glass needs a brighter rim than light glass to catch the light at all.
  const edgeColour = byMode(mode, alpha('#FFFFFF', 0.75), alpha('#FFFFFF', 0.18));
  const shade = byMode(
    mode,
    alpha(mix(palette.primary.dark, '#000000', 0.6), 0.28),
    alpha('#000000', 0.6),
  );
  const highlight = `inset 0 1px 0 ${byMode(mode, alpha('#FFFFFF', 0.7), alpha('#FFFFFF', 0.1))}`;
  const glass = materialsOf(source);
  const well = byMode(mode, alpha('#FFFFFF', 0.32), alpha('#000000', 0.22));
  const samples = backdropSamples(source);
  const cards = composited(glass.surface, samples);
  // Field outlines and drop-zone dashes sit on a field or a well inside a
  // card; the sidebar's chevrons on the sidebar glass.
  const lineGrounds = [
    ...composited(glass.input, cards),
    ...composited(well, cards),
    ...composited(glass.sidebar, samples),
  ];
  const accent = ensureContrastOnAll(primary, grounds, AA_TEXT);
  // The current segment or page tab: a brighter pane in a well, in a card or
  // straight on the washed canvas (the page tabs).
  const segmentSelected = byMode(mode, alpha('#FFFFFF', 0.9), alpha('#FFFFFF', 0.16));
  const segmentGrounds = composited(segmentSelected, composited(well, [...cards, ...samples]));
  return {
    mode,
    primary,
    glass,
    // A white edge vanishes where glass sits on glass (a control on the top
    // bar, a well in a card), so small controls and wells also carry a faint
    // dark line inside their white rim.
    controlLine: byMode(
      mode,
      alpha(mix(palette.primary.dark, '#000000', 0.55), 0.2),
      alpha('#FFFFFF', 0.16),
    ),
    // Hover on glass-on-glass (menu rows, sidebar links) needs a tint, not
    // more white: white at 0.6 over a panel already 0.9 white does not show.
    hoverTint: byMode(mode, alpha(primary, 0.1), alpha('#FFFFFF', 0.08)),
    accent,
    segmentSelected,
    segmentText: ensureContrastOnAll(accent, segmentGrounds, AA_TEXT),
    focus: ensureContrastOnAll(palette.primary.dark, grounds, AA_UI),
    line: ensureContrastOnAll(
      boundary(lineGrounds[0] ?? '#FFFFFF', palette.text.primary, AA_UI),
      lineGrounds,
      AA_UI,
    ),
    edge: `1px solid ${edgeColour}`,
    edgeColour,
    shade,
    highlight,
    frost: 'blur(20px) saturate(160%)',
    frostHeavy: 'blur(24px) saturate(180%)',
    soft: byMode(mode, alpha('#FFFFFF', 0.55), alpha('#FFFFFF', 0.07)),
    // A card inside a card: thinner glass, so the frost behind still shows.
    nested: alpha(glassBase(source), 0.4),
    // Tooltips are small dark glass: legible over anything, in either mode.
    tooltip: alpha(mix(palette.primary.dark, '#000000', 0.7), 0.74),
    well,
  };
};

const glassTokens = (context: SkinContext): SkinTokens => {
  const { palette, source } = context;
  const m = glassTokenMaterials(context);
  const { primary, glass, shade, highlight } = m;
  const lift = (y: number, blur: number, spread: number): string =>
    `0 ${y}px ${blur}px ${spread}px ${shade}`;
  return {
    canvasBg: source.canvas,
    canvasImage: poolsToCss(pools(source)),
    canvasAttachment: 'fixed',
    pageBg: 'transparent',

    textPrimary: palette.text.primary,
    textSecondary: palette.text.secondary,
    accentText: m.accent,

    surfaceBg: glass.surface,
    surfaceBorder: m.edge,
    surfaceBorderColor: m.edgeColour,
    surfaceShadow: `${lift(10, 30, -14)}, ${highlight}`,
    surfaceHoverShadow: `${lift(16, 40, -16)}, ${highlight}`,
    surfaceBackdrop: m.frost,
    surfaceSheen: `linear-gradient(135deg, ${byMode(m.mode, alpha('#FFFFFF', 0.5), alpha('#FFFFFF', 0.1))} 0%, ${alpha('#FFFFFF', 0)} 42%)`,
    surfaceTintBg: alpha(primary, 0.1),
    surfaceRaisedBg: m.soft,
    surfaceRaisedBorder: m.edge,
    surfaceRaisedShadow: `${lift(4, 12, -6)}, ${highlight}`,
    surfacePressedShadow: `inset 0 2px 6px ${alpha('#000000', 0.14)}`,
    surfaceInsetBg: m.well,
    surfaceInsetBorder: `1px solid ${m.controlLine}`,
    surfaceInsetShadow: `inset 0 1px 3px ${alpha('#000000', 0.08)}`,
    surfaceNestedBg: m.nested,
    surfaceNestedShadow: `${lift(6, 18, -10)}, ${highlight}`,
    cardRadius: '18px',

    overlayBg: glass.overlay,
    overlayBorder: m.edge,
    overlayShadow: `${lift(24, 60, -24)}, ${highlight}`,
    overlayBackdrop: m.frostHeavy,
    overlayRadius: '16px',
    dialogRadius: '22px',
    // The task drawer is overlay glass over the blurred page; painting the
    // wash inside it as well would put a second, misaligned glow behind its title.
    sheetBg: glass.overlay,
    sheetImage: 'none',
    sheetBackdrop: m.frostHeavy,

    heroBg: glass.hero,
    heroBorder: m.edge,
    heroBorderBottom: m.edge,
    heroShadow: `${lift(14, 36, -16)}, ${highlight}`,
    heroBackdrop: m.frost,

    tileBg: m.soft,
    tileBorder: m.edge,
    tileShadow: `${lift(6, 16, -8)}, ${highlight}`,
    tileInsetShadow: `inset 0 2px 5px ${alpha('#000000', 0.12)}`,

    appbarBg: glass.appbar,
    appbarBorder: m.edge,
    appbarShadow: lift(10, 30, -20),
    appbarBackdrop: 'blur(20px) saturate(180%)',
    sidebarBg: glass.sidebar,
    sidebarImage: 'none',
    sidebarBorder: m.edge,
    sidebarShadow: 'none',
    sidebarBackdrop: m.frostHeavy,

    navColor: palette.text.secondary,
    navHoverBg: m.hoverTint,
    navHoverColor: palette.text.primary,
    navHoverShadow: `inset 0 0 0 1px ${m.edgeColour}`,
    navActiveBg: primary,
    navActiveColor: palette.getContrastText(primary),
    navActiveShadow: `0 8px 20px -8px ${alpha(primary, 0.65)}, inset 0 1px 0 ${alpha('#FFFFFF', 0.35)}`,
    navActiveHoverBg: palette.primary.dark,
    navSpine: palette.divider,
    navSpineActive: m.accent,
    navHeadingColor: palette.text.secondary,
    navChevronColor: m.line,
    // White count on the error red. In dark mode the readable status red is
    // a light salmon, so the badge starts from the deeper, more saturated
    // shade and takes it only as dark as white needs.
    navBadgeBg: ensureContrast(
      byMode(palette.mode, palette.error.main, palette.error.dark),
      palette.common.white,
      AA_TEXT,
    ),
    navBadgeColor: palette.common.white,
    navBadgeShadow: `0 2px 8px -2px ${alpha(palette.error.main, 0.6)}`,
    navBadgeActiveBg: palette.common.black,

    itemRadius: '10px',
    itemHoverBg: m.hoverTint,
    itemHoverShadow: `inset 0 0 0 1px ${m.edgeColour}`,
    itemSelectedBg: alpha(primary, 0.14),
    itemSelectedShadow: 'none',
    itemSelectedColor: m.accent,

    choiceBg: glass.surface,
    choiceBorderColor: m.edgeColour,
    choiceHoverBorderColor: alpha(m.accent, 0.6),
    choiceSelectedBorderColor: m.focus,
    choiceShadow: `${lift(8, 24, -12)}, ${highlight}`,
    choiceSelectedShadow: `0 0 0 3px ${alpha(primary, 0.22)}, ${lift(8, 24, -12)}`,

    handleBg: m.soft,
    handleShadow: `inset 0 0 0 1px ${m.controlLine}`,
    handlePressedShadow: `inset 0 2px 4px ${alpha('#000000', 0.15)}`,

    dropzoneBg: m.well,
    dropzoneBorderColor: m.line,
    dropzoneHoverBg: alpha(primary, 0.07),
    dropzoneActiveBg: alpha(primary, 0.13),
    dropzoneShadow: `inset 0 1px 3px ${alpha('#000000', 0.08)}`,

    columnBg: m.well,
    columnOverBg: alpha(primary, 0.12),
    columnBorderColor: m.edgeColour,
    columnShadow: `inset 0 1px 2px ${alpha('#000000', 0.06)}`,

    timelineRail: palette.divider,
    timelineDot: m.line,
    timelineDotActive: primary,
    timelineDotShadow: `0 0 0 2px ${m.edgeColour}`,

    gridHeaderBg: alpha(primary, 0.09),
    gridHeaderBorder: `1px solid ${palette.divider}`,
    gridRule: palette.divider,
    gridRowStripe: 'transparent',
    gridRowHover: alpha(primary, 0.07),
    gridRowSelected: alpha(primary, 0.13),
    gridFooterBg: m.well,

    focusRingColor: m.focus,
    focusRing: `2px solid ${m.focus}`,
    focusRingOffset: '2px',

    linkColor: m.accent,
    linkHoverColor: mix(m.accent, palette.text.primary, 0.25),
    linkVisitedColor: m.accent,
    linkUnderline: alpha(m.accent, 0.45),
    linkUnderlineThickness: '2px',
    linkUnderlineOffset: '3px',

    buttonRadius: '12px',
    buttonShadow: `0 8px 18px -10px ${alpha('#000000', 0.45)}, inset 0 1px 0 ${alpha('#FFFFFF', 0.35)}`,
    buttonHoverShadow: `0 12px 24px -10px ${alpha('#000000', 0.5)}, inset 0 1px 0 ${alpha('#FFFFFF', 0.4)}`,
    buttonPressedShadow: `inset 0 2px 6px ${alpha('#000000', 0.2)}`,

    controlRadius: '12px',
    controlBg: m.soft,
    controlShadow: `inset 0 0 0 1px ${m.controlLine}, ${lift(3, 10, -5)}`,
    controlHoverShadow: `inset 0 0 0 1px ${m.controlLine}, ${lift(6, 16, -6)}`,
    controlPressedShadow: `inset 0 2px 5px ${alpha('#000000', 0.14)}`,

    inputRadius: '12px',
    inputBg: glass.input,
    inputBorderColor: m.line,
    inputShadow: `inset 0 1px 2px ${alpha('#000000', 0.06)}`,
    inputBackdrop: 'blur(12px)',
    inputFocusShadow: `0 0 0 3px ${alpha(m.focus, 0.3)}`,

    segmentBg: m.well,
    segmentShadow: `inset 0 1px 2px ${alpha('#000000', 0.06)}`,
    segmentSelectedBg: m.segmentSelected,
    segmentSelectedShadow: `${lift(2, 8, -3)}, ${highlight}`,
    segmentSelectedColor: m.segmentText,

    chipRadius: '999px',
    // White on white glass disappears: a plain chip is a faint primary tint
    // with the small controls' dark inner line, so it still reads as a chip.
    chipShadow: `inset 0 0 0 1px ${m.controlLine}`,
    chipDefaultBg: byMode(m.mode, alpha(primary, 0.1), alpha('#FFFFFF', 0.1)),
    badgeShadow: `0 2px 6px -1px ${alpha('#000000', 0.3)}`,
    avatarShadow: `0 0 0 2px ${byMode(m.mode, alpha('#FFFFFF', 0.75), alpha('#FFFFFF', 0.16))}`,
    trackBg: alpha(primary, 0.2),
    skeletonBg: alpha(palette.text.primary, 0.1),
    tooltipBg: m.tooltip,
    tooltipColor: palette.common.white,
    tooltipRadius: '10px',
    tooltipShadow: `0 8px 24px -8px ${alpha('#000000', 0.35)}, inset 0 0 0 1px ${alpha('#FFFFFF', 0.18)}, inset 0 1px 0 ${alpha('#FFFFFF', 0.22)}`,
    tooltipBackdrop: 'blur(12px) saturate(160%)',
    dividerHighlight: 'transparent',
    stepFilter: `drop-shadow(0 2px 4px ${alpha(primary, 0.35)})`,
  };
};

/**
 * The opaque stand-ins for every translucent Glass token: each colour laid
 * over the plain canvas, and no blur. Published under
 * `@supports not (backdrop-filter)` and `prefers-reduced-transparency`.
 */
export const glassFallbackTokens = (tokens: SkinTokens): Partial<SkinTokens> => {
  const canvas = tokens.canvasBg;
  const solid = (colour: string): string => over(colour, canvas);
  const surface = solid(tokens.surfaceBg);
  return {
    surfaceBg: surface,
    surfaceRaisedBg: over(tokens.surfaceRaisedBg, surface),
    surfaceInsetBg: over(tokens.surfaceInsetBg, surface),
    surfaceNestedBg: over(tokens.surfaceNestedBg, surface),
    surfaceBackdrop: 'none',
    overlayBg: solid(tokens.overlayBg),
    overlayBackdrop: 'none',
    sheetBg: solid(tokens.sheetBg),
    sheetBackdrop: 'none',
    heroBg: solid(tokens.heroBg),
    heroBackdrop: 'none',
    tileBg: over(tokens.tileBg, surface),
    appbarBg: solid(tokens.appbarBg),
    appbarBackdrop: 'none',
    sidebarBg: solid(tokens.sidebarBg),
    sidebarBackdrop: 'none',
    inputBg: over(tokens.inputBg, surface),
    inputBackdrop: 'none',
    choiceBg: surface,
    controlBg: over(tokens.controlBg, surface),
    tooltipBg: solid(tokens.tooltipBg),
    tooltipBackdrop: 'none',
  };
};

export const glassmorphismSkin: SkinDefinition = {
  key: 'glassmorphism',
  label: 'Glassmorphism',
  description: "Frosted panels over a gentle wash of the palette's colours.",
  palette: glassPalette,
  tokens: glassTokens,
  options: (source) => {
    const shade = byMode(
      source.mode,
      alpha(mix(huesOf(source).primaryDark, '#000000', 0.6), 0.24),
      alpha('#000000', 0.55),
    );
    return {
      shape: { borderRadius: 6 },
      shadows: shadowList(
        (elevation) =>
          `0 ${Math.round(elevation * 1.2)}px ${Math.round(elevation * 3 + 6)}px -${Math.round(elevation / 2)}px ${shade}`,
      ),
      // The grid paints its rows on the card's glass; the sticky header and
      // pinned columns keep the opaque paper so rows never show through them.
      palette: {
        DataGrid: {
          bg: 'transparent',
          headerBg: source.background.paper,
          pinnedBg: source.background.paper,
        },
      },
      components: skinComponents('glassmorphism'),
    };
  },
  backdrops: backdropSamples,
};

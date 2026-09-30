import { alpha } from '@mui/material/styles';

import { poolsToCss, washExtremes, type ColourPool } from '../backdrop';
import { boundary, ensureContrast, ensureContrastOnAll, mix, over } from '../colour';
import type { PresetPalette } from '../theme';

import { skinComponents } from './components';
import {
  AA_TEXT,
  AA_UI,
  byMode,
  composited,
  contentExtreme,
  huesOf,
  px,
  readableText,
} from './shared';
import type { SkinContext, SkinDefinition, SkinTokens } from './types';
import { shadowList } from './types';

/**
 * Claymorphism: soft, inflated, friendly shapes, as if modelled in clay.
 *
 * Surfaces are pastels tinted from the preset's primary and secondary, with
 * generous corners and pill buttons. Depth comes from three shadows at once:
 * a large soft drop shadow below, a highlight pressed into the top-left edge
 * and a shade into the bottom-right, which is what makes a flat box read as
 * puffy. Buttons press down a couple of pixels when used (not under reduced
 * motion). Dark mode keeps the same build in deep tinted clay with a faint
 * inner light.
 */

const APPBAR_OPACITY = 0.93;

const clayCanvas = (preset: PresetPalette): string => {
  const { primary, primaryLight, secondaryLight } = huesOf(preset);
  return byMode(
    preset.mode,
    mix(mix(preset.canvas, primaryLight, 0.13), secondaryLight, 0.05),
    mix(preset.background.default, primary, 0.07),
  );
};

const clayPaper = (preset: PresetPalette): string => {
  const { primary, primaryLight } = huesOf(preset);
  return byMode(
    preset.mode,
    mix('#FFFFFF', primaryLight, 0.07),
    mix(mix(preset.background.paper, preset.background.default, 0.45), primary, 0.1),
  );
};

/**
 * Pastel of the primary on the clay paper: hover rows, tiles, the page header.
 * Dark clay takes a third of the tint, so light text keeps a dark ground.
 */
const pastel = (preset: PresetPalette, paper: string, weight: number): string => {
  const { primary, primaryLight } = huesOf(preset);
  return mix(
    paper,
    byMode(preset.mode, primaryLight, primary),
    weight * byMode(preset.mode, 1, 0.33),
  );
};

/** Two pastel pools washed over the canvas: the secondary top left, the primary bottom right. */
const clayPools = (preset: PresetPalette): ColourPool[] => {
  const { primaryLight, secondaryLight } = huesOf(preset);
  const strength = byMode(preset.mode, 1, 0.4);
  return [
    { colour: alpha(secondaryLight, 0.22 * strength), width: 960, height: 640, x: 0, y: 0 },
    { colour: alpha(primaryLight, 0.2 * strength), width: 900, height: 640, x: 100, y: 100 },
  ];
};

/** The plain canvas and the darkest and lightest the wash makes it, on any screen. */
const clayBackdrops = (preset: PresetPalette): string[] =>
  washExtremes(preset.canvas, clayPools(preset));

const clayPalette = (preset: PresetPalette): PresetPalette => {
  const canvas = clayCanvas(preset);
  const paper = clayPaper(preset);
  const { primary } = huesOf(preset);
  const backdrops = washExtremes(canvas, clayPools(preset));
  const grounds = [
    ...backdrops,
    paper,
    over(alpha(primary, 0.1), paper),
    pastel(preset, paper, 0.34),
    mix(paper, canvas, 0.75),
    ...composited(alpha(paper, APPBAR_OPACITY), [...backdrops, contentExtreme(preset.mode)]),
  ];
  const divider = byMode(
    preset.mode,
    mix(paper, huesOf(preset).primaryDark, 0.2),
    mix(paper, '#FFFFFF', 0.12),
  );
  return {
    ...preset,
    background: { default: canvas, paper },
    canvas,
    text: readableText(preset, grounds),
    divider,
    cardBorder: divider,
  };
};

/** The three light sources of clay at a size: drop shadow, inner shade, inner highlight. */
const clayLights = (preset: PresetPalette) => {
  const { primaryDark } = huesOf(preset);
  const ink = mix(primaryDark, '#0A0F0D', 0.45);
  return {
    outer: byMode(preset.mode, alpha(ink, 0.5), alpha('#000000', 0.66)),
    shade: byMode(preset.mode, alpha(ink, 0.22), alpha('#000000', 0.42)),
    light: byMode(preset.mode, alpha('#FFFFFF', 0.9), alpha('#FFFFFF', 0.1)),
  };
};

type ClayLights = ReturnType<typeof clayLights>;

/** Puffy: standing up, rounded by an inner highlight and shade. `scale` 1 is a card. */
const puffyWith =
  ({ outer, shade, light }: ClayLights) =>
  (scale: number): string =>
    [
      `0 ${px(20 * scale)} ${px(38 * scale)} ${px(-16 * scale)} ${outer}`,
      `inset ${px(-8 * scale)} ${px(-8 * scale)} ${px(16 * scale)} ${shade}`,
      `inset ${px(8 * scale)} ${px(8 * scale)} ${px(14 * scale)} ${light}`,
    ].join(', ');

/** Pressed: squashed down, the shade moves to the top-left. */
const pressedWith =
  ({ outer, shade, light }: ClayLights) =>
  (scale: number): string =>
    [
      `0 ${px(5 * scale)} ${px(10 * scale)} ${px(-6 * scale)} ${outer}`,
      `inset ${px(5 * scale)} ${px(5 * scale)} ${px(12 * scale)} ${shade}`,
      `inset ${px(-4 * scale)} ${px(-4 * scale)} ${px(9 * scale)} ${light}`,
    ].join(', ');

/**
 * The inner light of a small clay part on its own fill (count pills). Dark
 * clay takes a much fainter highlight and a deeper shade: at light mode's
 * strength the highlight shows as a bright crescent on a dark pill.
 */
const smallClay = (mode: 'light' | 'dark'): string =>
  [
    `inset -1px -2px 3px ${alpha('#000000', byMode(mode, 0.25, 0.3))}`,
    `inset 1px 1px 2px ${alpha('#FFFFFF', byMode(mode, 0.4, 0.12))}`,
  ].join(', ');

/** Clay on a coloured fill (primary buttons, the current nav row): works on any hue. */
const filledClay = (drop: string, lift: number): string =>
  [
    `0 ${lift}px ${lift * 2}px -${lift}px ${drop}`,
    `inset -3px -4px 8px ${alpha('#000000', 0.2)}`,
    `inset 3px 3px 6px ${alpha('#FFFFFF', 0.42)}`,
  ].join(', ');

const clayMaterials = ({ palette, source }: SkinContext) => {
  const paper = palette.background.paper;
  const primary = palette.primary.main;
  const lights = clayLights(source);
  const tinted = over(alpha(primary, 0.1), paper);
  const well = mix(paper, source.canvas, 0.75);
  const grounds = [...clayBackdrops(source), paper, tinted, well];
  return {
    paper,
    primary,
    well,
    lights,
    puffy: puffyWith(lights),
    pressed: pressedWith(lights),
    accent: ensureContrastOnAll(primary, grounds, AA_TEXT),
    focus: ensureContrastOnAll(palette.primary.dark, grounds, AA_UI),
    line: ensureContrastOnAll(boundary(well, palette.text.primary, AA_UI), grounds, AA_UI),
    none: '1px solid transparent',
    soft: (weight: number) => pastel(source, paper, weight),
    sunk: `inset 4px 4px 10px ${lights.shade}, inset -4px -4px 10px ${lights.light}`,
  };
};

const clayTokens = (context: SkinContext): SkinTokens => {
  const { palette, source } = context;
  const m = clayMaterials(context);
  const { paper, primary, puffy, pressed, lights } = m;
  const onPrimary = palette.getContrastText(primary);
  const mode = palette.mode;
  return {
    canvasBg: source.canvas,
    canvasImage: poolsToCss(clayPools(source)),
    canvasAttachment: 'fixed',
    pageBg: 'transparent',

    textPrimary: palette.text.primary,
    textSecondary: palette.text.secondary,
    accentText: m.accent,

    surfaceBg: paper,
    surfaceBorder: m.none,
    surfaceBorderColor: 'transparent',
    surfaceShadow: puffy(1),
    surfaceHoverShadow: puffy(1.25),
    surfaceBackdrop: 'none',
    surfaceSheen: 'none',
    surfaceTintBg: alpha(primary, 0.1),
    surfaceRaisedBg: m.soft(0.1),
    surfaceRaisedBorder: m.none,
    surfaceRaisedShadow: puffy(0.45),
    surfacePressedShadow: pressed(0.5),
    surfaceInsetBg: m.well,
    surfaceInsetBorder: m.none,
    surfaceInsetShadow: m.sunk,
    // Half a card's puff: a tile inside a puffy panel would otherwise double the shadows up.
    surfaceNestedBg: paper,
    surfaceNestedShadow: puffy(0.5),
    cardRadius: '26px',

    overlayBg: paper,
    overlayBorder: m.none,
    overlayShadow: puffy(1.15),
    overlayBackdrop: 'none',
    overlayRadius: '20px',
    dialogRadius: '30px',
    sheetBg: source.canvas,
    sheetImage: poolsToCss(clayPools(source)),
    sheetBackdrop: 'none',

    // A soft pastel: the page header sets the page, it should not be its loudest part.
    heroBg: m.soft(0.14),
    heroBorder: m.none,
    heroBorderBottom: m.none,
    heroShadow: puffy(1.1),
    heroBackdrop: 'none',

    tileBg: m.soft(0.3),
    tileBorder: m.none,
    tileShadow: puffy(0.4),
    tileInsetShadow: pressed(0.4),

    appbarBg: alpha(paper, APPBAR_OPACITY),
    appbarBorder: m.none,
    appbarShadow: `0 12px 28px -18px ${lights.outer}`,
    appbarBackdrop: 'blur(14px)',
    sidebarBg: paper,
    sidebarImage: 'none',
    sidebarBorder: m.none,
    sidebarShadow: `14px 0 30px -22px ${lights.outer}, inset -5px 0 12px -8px ${lights.shade}`,
    sidebarBackdrop: 'none',

    navColor: palette.text.secondary,
    navHoverBg: m.soft(0.18),
    navHoverColor: palette.text.primary,
    navHoverShadow: puffy(0.3),
    navActiveBg: primary,
    navActiveColor: onPrimary,
    navActiveShadow: filledClay(alpha(palette.primary.dark, 0.7), 8),
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
    navBadgeShadow: smallClay(mode),
    navBadgeActiveBg: palette.common.black,

    itemRadius: '14px',
    itemHoverBg: m.soft(0.18),
    itemHoverShadow: puffy(0.25),
    itemSelectedBg: m.soft(0.34),
    itemSelectedShadow: pressed(0.3),
    itemSelectedColor: palette.text.primary,

    choiceBg: paper,
    choiceBorderColor: 'transparent',
    choiceHoverBorderColor: alpha(m.accent, 0.5),
    choiceSelectedBorderColor: m.focus,
    choiceShadow: puffy(0.7),
    choiceSelectedShadow: pressed(0.6),

    handleBg: m.soft(0.12),
    handleShadow: puffy(0.25),
    handlePressedShadow: pressed(0.25),

    dropzoneBg: m.well,
    dropzoneBorderColor: m.line,
    dropzoneHoverBg: m.soft(0.16),
    dropzoneActiveBg: alpha(primary, 0.14),
    dropzoneShadow: m.sunk,

    columnBg: m.well,
    columnOverBg: alpha(primary, 0.12),
    columnBorderColor: 'transparent',
    columnShadow: m.sunk,

    timelineRail: palette.divider,
    timelineDot: m.line,
    timelineDotActive: primary,
    timelineDotShadow: puffy(0.15),

    gridHeaderBg: alpha(primary, 0.1),
    gridHeaderBorder: `1px solid ${palette.divider}`,
    gridRule: palette.divider,
    gridRowStripe: alpha(primary, 0.025),
    gridRowHover: alpha(primary, 0.07),
    gridRowSelected: alpha(primary, 0.13),
    gridFooterBg: m.well,

    focusRingColor: m.focus,
    // The same weight as the other skins: 3px out from a pill read as a double halo.
    focusRing: `2px solid ${m.focus}`,
    focusRingOffset: '2px',

    linkColor: m.accent,
    linkHoverColor: mix(m.accent, palette.text.primary, 0.25),
    linkVisitedColor: m.accent,
    linkUnderline: alpha(m.accent, 0.45),
    linkUnderlineThickness: '2px',
    linkUnderlineOffset: '3px',

    buttonRadius: '999px',
    buttonShadow: filledClay(lights.outer, 10),
    buttonHoverShadow: filledClay(lights.outer, 13),
    buttonPressedShadow: [
      `0 3px 6px -4px ${lights.outer}`,
      `inset 3px 4px 8px ${alpha('#000000', 0.22)}`,
      `inset -2px -2px 5px ${alpha('#FFFFFF', 0.3)}`,
    ].join(', '),

    controlRadius: '14px',
    controlBg: m.soft(0.1),
    controlShadow: puffy(0.3),
    controlHoverShadow: puffy(0.4),
    controlPressedShadow: pressed(0.3),

    inputRadius: '18px',
    inputBg: m.well,
    inputBorderColor: m.line,
    inputShadow: m.sunk,
    inputBackdrop: 'none',
    inputFocusShadow: `${m.sunk}, 0 0 0 3px ${alpha(m.focus, 0.3)}`,

    segmentBg: m.well,
    segmentShadow: m.sunk,
    segmentSelectedBg: paper,
    segmentSelectedShadow: puffy(0.3),
    segmentSelectedColor: m.accent,

    chipRadius: '999px',
    chipShadow: [
      `inset -2px -2px 4px ${alpha('#000000', byMode(mode, 0.1, 0.3))}`,
      `inset 2px 2px 4px ${alpha('#FFFFFF', byMode(mode, 0.5, 0.12))}`,
    ].join(', '),
    chipDefaultBg: m.soft(0.2),
    badgeShadow: smallClay(mode),
    avatarShadow: puffy(0.25),
    trackBg: m.well,
    skeletonBg: mix(paper, palette.primary.dark, byMode(palette.mode, 0.1, 0.18)),
    // A small piece of deep clay in the primary, with white text.
    tooltipBg: ensureContrast(
      mix(palette.primary.dark, '#000000', 0.3),
      palette.common.white,
      AA_TEXT,
    ),
    tooltipColor: palette.common.white,
    tooltipRadius: '12px',
    tooltipShadow: [
      `0 6px 12px -6px ${lights.outer}`,
      `inset -2px -2px 4px ${alpha('#000000', 0.2)}`,
      `inset 2px 2px 3px ${alpha('#FFFFFF', 0.3)}`,
    ].join(', '),
    tooltipBackdrop: 'none',
    dividerHighlight: 'transparent',
    stepFilter: `drop-shadow(0 3px 4px ${lights.outer})`,
  };
};

export const claymorphismSkin: SkinDefinition = {
  key: 'claymorphism',
  label: 'Claymorphism',
  description: 'Rounded, puffy shapes with a friendly, hand-made feel.',
  palette: clayPalette,
  tokens: clayTokens,
  options: (source) => {
    const puffy = puffyWith(clayLights(source));
    return {
      // `borderRadius: 3` in sx becomes 24px: clay is generously rounded.
      shape: { borderRadius: 8 },
      shadows: shadowList((elevation) => puffy(Math.min(0.2 + elevation * 0.08, 1.4))),
      components: skinComponents('claymorphism'),
    };
  },
  backdrops: clayBackdrops,
};

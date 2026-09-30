import { alpha, darken } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';

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
 * Neumorphism (soft UI): surfaces are the same colour as the canvas and stand
 * out only through a pair of shadows, light from the top left and dark to the
 * bottom right. Raised things carry the outer pair; pressed, selected and
 * sunken things carry the inner pair.
 *
 * The style is known for losing its edges, so this skin is stricter than the
 * others: every field, toggle and outline keeps a line of at least 3:1, focus
 * is a solid ring rather than a glow, and primary actions keep the preset's
 * filled colour so nothing depends on a shadow alone.
 */

/** Opacity of the top bar over scrolled content. Checked against the darkest content in the tests. */
const APPBAR_OPACITY = 0.94;
/** The tint of a section header, over the canvas. */
const TINT = 0.06;
/**
 * The tint of the current sidebar row and a selected menu row. Pressed in and
 * tinted, so the current page outweighs a hovered link, which is only raised.
 */
const SELECTED_TINT = 0.1;

/**
 * The soft canvas: light mode pulls the preset's page colour a little towards
 * its secondary text (neumorphism needs a mid-light ground for white
 * highlights to show) with a breath of the primary. Dark mode starts halfway
 * between the preset's page and paper colours, so it keeps the brand's hue
 * (a forest charcoal for IAA rather than a neutral grey), and lifts it a
 * little so the dark half of each shadow has room to fall.
 */
const neuCanvas = (preset: PresetPalette): string => {
  const { primary } = huesOf(preset);
  return byMode(
    preset.mode,
    mix(mix(preset.canvas, preset.text.secondary, 0.11), primary, 0.02),
    mix(mix(preset.background.default, preset.background.paper, 0.5), '#FFFFFF', 0.06),
  );
};

/** The light and dark halves of every shadow pair. */
const lights = (canvas: string, mode: 'light' | 'dark') => ({
  dark: byMode(mode, alpha(darken(canvas, 0.3), 0.62), alpha('#000000', 0.55)),
  // Dark mode's highlight has to be strong enough to see on a dark ground,
  // or the surfaces lose their edge and read as flat.
  light: byMode(mode, alpha('#FFFFFF', 0.8), alpha('#FFFFFF', 0.1)),
});

/** Outer pair: the element stands proud of the canvas. */
const raisedWith =
  ({ dark, light }: { dark: string; light: string }) =>
  (distance: number, blur: number): string =>
    `${px(distance)} ${px(distance)} ${px(blur)} ${dark}, ${px(-distance)} ${px(-distance)} ${px(blur)} ${light}`;

/** Inner pair: the element is pressed into the canvas. */
const insetWith =
  ({ dark, light }: { dark: string; light: string }) =>
  (distance: number, blur: number): string =>
    `inset ${px(distance)} ${px(distance)} ${px(blur)} ${dark}, inset ${px(-distance)} ${px(-distance)} ${px(blur)} ${light}`;

const neuPalette = (preset: PresetPalette): PresetPalette => {
  const canvas = neuCanvas(preset);
  const { primary } = huesOf(preset);
  const tinted = over(alpha(primary, TINT), canvas);
  const floating = composited(alpha(canvas, APPBAR_OPACITY), [contentExtreme(preset.mode)]);
  const divider = mix(canvas, preset.text.primary, byMode(preset.mode, 0.13, 0.16));
  return {
    ...preset,
    background: { default: canvas, paper: canvas },
    canvas,
    text: readableText(preset, [canvas, tinted, ...floating]),
    divider,
    cardBorder: divider,
  };
};

/** Colours that belong to the style rather than to any one token. */
const neuMaterials = ({ palette, source }: SkinContext) => {
  const canvas = source.canvas;
  const primary = palette.primary.main;
  const tinted = over(alpha(primary, TINT), canvas);
  const selected = over(alpha(primary, SELECTED_TINT), canvas);
  const grounds = [canvas, tinted, selected];
  const pair = lights(canvas, palette.mode);
  const accent = ensureContrastOnAll(primary, grounds, AA_TEXT);
  const focus = ensureContrastOnAll(palette.primary.dark, grounds, AA_UI);
  return {
    canvas,
    primary,
    selected,
    accent,
    focus,
    line: ensureContrastOnAll(boundary(canvas, palette.text.primary, AA_UI), grounds, AA_UI),
    edgeColour: byMode(palette.mode, alpha('#FFFFFF', 0.45), alpha('#FFFFFF', 0.06)),
    none: '1px solid transparent',
    raised: raisedWith(pair),
    inset: insetWith(pair),
    pair,
  };
};

const neuTokens = (context: SkinContext): SkinTokens => {
  const { palette } = context;
  const m = neuMaterials(context);
  const { canvas, primary, raised, inset } = m;
  const edge = `1px solid ${m.edgeColour}`;
  return {
    canvasBg: canvas,
    canvasImage: 'none',
    canvasAttachment: 'scroll',
    pageBg: canvas,

    textPrimary: palette.text.primary,
    textSecondary: palette.text.secondary,
    accentText: m.accent,

    surfaceBg: canvas,
    surfaceBorder: edge,
    surfaceBorderColor: m.edgeColour,
    surfaceShadow: raised(6, 14),
    surfaceHoverShadow: raised(9, 20),
    surfaceBackdrop: 'none',
    surfaceSheen: 'none',
    surfaceTintBg: alpha(primary, TINT),
    surfaceRaisedBg: canvas,
    surfaceRaisedBorder: edge,
    surfaceRaisedShadow: raised(3, 7),
    surfacePressedShadow: inset(3, 7),
    surfaceInsetBg: canvas,
    surfaceInsetBorder: m.none,
    surfaceInsetShadow: inset(4, 10),
    // Half the card's lift: a tile in a panel stands up without a second full halo.
    surfaceNestedBg: canvas,
    surfaceNestedShadow: raised(4, 10),
    cardRadius: '20px',

    overlayBg: canvas,
    overlayBorder: edge,
    overlayShadow: `${raised(8, 20)}, 0 24px 48px -24px ${m.pair.dark}`,
    overlayBackdrop: 'none',
    overlayRadius: '16px',
    dialogRadius: '24px',
    sheetBg: canvas,
    sheetImage: 'none',
    sheetBackdrop: 'none',

    heroBg: canvas,
    heroBorder: edge,
    heroBorderBottom: edge,
    heroShadow: raised(8, 18),
    heroBackdrop: 'none',

    tileBg: canvas,
    tileBorder: m.none,
    tileShadow: raised(4, 9),
    tileInsetShadow: inset(3, 7),

    appbarBg: alpha(canvas, APPBAR_OPACITY),
    appbarBorder: m.none,
    appbarShadow: `0 10px 20px -14px ${m.pair.dark}`,
    appbarBackdrop: 'blur(14px)',
    sidebarBg: canvas,
    sidebarImage: 'none',
    sidebarBorder: m.none,
    sidebarShadow: `10px 0 22px -16px ${m.pair.dark}`,
    sidebarBackdrop: 'none',

    navColor: palette.text.secondary,
    navHoverBg: canvas,
    navHoverColor: palette.text.primary,
    // Hover barely lifts; the current page is pressed in and tinted, so it
    // stays the strongest row in the sidebar.
    navHoverShadow: raised(2, 5),
    navActiveBg: m.selected,
    navActiveColor: m.accent,
    navActiveShadow: inset(3, 7),
    navActiveHoverBg: m.selected,
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
    navBadgeShadow: raised(2, 4),
    navBadgeActiveBg: ensureContrast(
      byMode(palette.mode, palette.error.main, palette.error.dark),
      palette.common.white,
      AA_TEXT,
    ),

    itemRadius: '10px',
    itemHoverBg: canvas,
    itemHoverShadow: raised(2, 5),
    itemSelectedBg: m.selected,
    itemSelectedShadow: inset(2, 5),
    itemSelectedColor: m.accent,

    choiceBg: canvas,
    choiceBorderColor: 'transparent',
    choiceHoverBorderColor: m.line,
    choiceSelectedBorderColor: m.focus,
    choiceShadow: raised(5, 12),
    choiceSelectedShadow: inset(4, 10),

    handleBg: canvas,
    handleShadow: raised(2, 5),
    handlePressedShadow: inset(2, 5),

    dropzoneBg: canvas,
    dropzoneBorderColor: m.line,
    dropzoneHoverBg: alpha(primary, 0.04),
    dropzoneActiveBg: alpha(primary, 0.09),
    dropzoneShadow: inset(4, 10),

    columnBg: canvas,
    columnOverBg: alpha(primary, 0.07),
    columnBorderColor: 'transparent',
    columnShadow: inset(5, 12),

    timelineRail: palette.divider,
    timelineDot: m.line,
    timelineDotActive: m.accent,
    timelineDotShadow: raised(1, 3),

    gridHeaderBg: alpha(primary, TINT),
    gridHeaderBorder: `1px solid ${palette.divider}`,
    gridRule: palette.divider,
    gridRowStripe: 'transparent',
    gridRowHover: alpha(primary, 0.05),
    gridRowSelected: alpha(primary, 0.1),
    gridFooterBg: canvas,

    focusRingColor: m.focus,
    focusRing: `2px solid ${m.focus}`,
    focusRingOffset: '3px',

    linkColor: m.accent,
    linkHoverColor: mix(m.accent, palette.text.primary, 0.3),
    linkVisitedColor: m.accent,
    linkUnderline: alpha(m.accent, 0.45),
    linkUnderlineThickness: '2px',
    linkUnderlineOffset: '3px',

    buttonRadius: '14px',
    buttonShadow: raised(4, 10),
    buttonHoverShadow: raised(6, 14),
    buttonPressedShadow: inset(3, 8),

    controlRadius: '12px',
    controlBg: canvas,
    controlShadow: raised(3, 7),
    controlHoverShadow: raised(4, 10),
    controlPressedShadow: inset(3, 7),

    inputRadius: '14px',
    inputBg: canvas,
    inputBorderColor: m.line,
    inputShadow: inset(3, 7),
    inputBackdrop: 'none',
    inputFocusShadow: `${inset(3, 7)}, 0 0 0 3px ${alpha(m.focus, 0.28)}`,

    segmentBg: canvas,
    segmentShadow: inset(3, 8),
    segmentSelectedBg: canvas,
    segmentSelectedShadow: raised(3, 7),
    segmentSelectedColor: m.accent,

    chipRadius: '10px',
    chipShadow: raised(2, 5),
    chipDefaultBg: canvas,
    badgeShadow: raised(2, 4),
    avatarShadow: raised(3, 7),
    trackBg: mix(canvas, palette.text.primary, 0.07),
    skeletonBg: mix(canvas, palette.text.primary, 0.09),
    // A tooltip is a small raised plate of the canvas, like everything else.
    tooltipBg: canvas,
    tooltipColor: palette.text.primary,
    tooltipRadius: '10px',
    tooltipShadow: `${raised(3, 7)}, inset 0 0 0 1px ${m.edgeColour}`,
    tooltipBackdrop: 'none',
    dividerHighlight: m.pair.light,
    stepFilter: `drop-shadow(2px 2px 3px ${m.pair.dark}) drop-shadow(-2px -2px 3px ${m.pair.light})`,
  };
};

export const neumorphismSkin: SkinDefinition = {
  key: 'neumorphism',
  label: 'Neumorphism',
  description: 'Soft, raised surfaces that press in when you use them.',
  palette: neuPalette,
  tokens: neuTokens,
  options: (source) => {
    const pair = lights(source.canvas, source.mode);
    const raised = raisedWith(pair);
    return {
      // `borderRadius: 3` in sx becomes 18px: soft UI needs larger corners.
      shape: { borderRadius: 6 },
      shadows: shadowList((elevation) =>
        raised(Math.min(2 + elevation * 0.5, 12), Math.min(5 + elevation, 28)),
      ),
      components: deepmerge(skinComponents('neumorphism'), {
        // A dialog floats over a dimmed page, not out of the canvas: the white
        // half of the pair would read as a glow on the scrim, so it casts the
        // dark half only.
        MuiDialog: {
          styleOverrides: {
            paper: {
              boxShadow: `${px(8)} ${px(8)} ${px(20)} ${pair.dark}, 0 32px 64px -28px ${pair.dark}`,
            },
          },
        },
      }),
    };
  },
  backdrops: (source) => [source.canvas],
};

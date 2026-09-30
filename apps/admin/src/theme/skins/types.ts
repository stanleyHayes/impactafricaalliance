import type { Palette, Shadows, ThemeOptions } from '@mui/material/styles';

import type { PresetPalette } from '../theme';

/**
 * A skin is the third dimension of the console's look, beside the colour
 * preset and light or dark mode: it decides how surfaces and controls are
 * built (flat and bordered, soft and extruded, frosted, or puffy clay) while
 * the preset still decides their colours. Every skin works with every preset
 * in both modes.
 */
export type SkinKey = 'classic' | 'neumorphism' | 'glassmorphism' | 'claymorphism';

/**
 * Every value a skin paints with. Each one is published as a CSS custom
 * property on `:root` (`surfaceBg` becomes `--iaa-surface-bg`) so any surface
 * can use it, including hand-built boxes that are not MUI components. In
 * Classic each value is exactly what the console painted before skins existed,
 * so moving a surface onto the tokens changes nothing there.
 *
 * Values are complete CSS values: colours, `box-shadow` lists, `border`
 * shorthands (`1px solid …`), `backdrop-filter` functions or lengths.
 */
export interface SkinTokens {
  // Page ----------------------------------------------------------------------
  /** Body colour behind everything. */
  canvasBg: string;
  /** Body `background-image`: Classic's faint corner glow, Glass's coloured backdrop. */
  canvasImage: string;
  /** `scroll`, or `fixed` where the backdrop should stay put under scrolling panels. */
  canvasAttachment: string;
  /** The routed page area (`<main>`). Transparent where the canvas should show through. */
  pageBg: string;

  // Text ----------------------------------------------------------------------
  /** Body text; the same as `palette.text.primary`. For painting outside the MUI palette (previews). */
  textPrimary: string;
  /** Secondary text; the same as `palette.text.secondary`. */
  textSecondary: string;
  /** The primary colour used as text (text buttons, selected tabs), deep enough to read on the skin's surfaces. */
  accentText: string;

  // Surfaces ------------------------------------------------------------------
  /** Cards, panels, sections, list containers. */
  surfaceBg: string;
  /** Full `border` shorthand for a card. Skins without edges keep a transparent 1px so layout never shifts. */
  surfaceBorder: string;
  /** Colour alone, for surfaces that set border widths per side. */
  surfaceBorderColor: string;
  surfaceShadow: string;
  /** Shadow for a clickable card under the pointer. */
  surfaceHoverShadow: string;
  /** `backdrop-filter` for a card; `none` except in Glass. */
  surfaceBackdrop: string;
  /** `background-image` over a card's colour: Glass's diagonal sheen; `none` elsewhere. */
  surfaceSheen: string;
  /** Tinted header strip of a section card (DetailSection, event sections, dashboard panels). */
  surfaceTintBg: string;
  /** A control-sized element lifted off its surface: logo tile, top-bar actions, skip link. */
  surfaceRaisedBg: string;
  surfaceRaisedBorder: string;
  surfaceRaisedShadow: string;
  /** The same element pressed in (active, toggled on). */
  surfacePressedShadow: string;
  /** A well sunk into its surface: board column body, search field, progress track. */
  surfaceInsetBg: string;
  surfaceInsetBorder: string;
  surfaceInsetShadow: string;
  /**
   * A card inside another card ('Your work' tiles, form-builder questions,
   * story blocks). Quieter than a top-level card, so depth does not double up
   * and Glass's frost still shows through. Classic: the ordinary card.
   */
  surfaceNestedBg: string;
  surfaceNestedShadow: string;
  /** Corner radius of a card (MUI Card; Classic 14px). */
  cardRadius: string;

  // Overlays ------------------------------------------------------------------
  /** Menus, popovers, listboxes, date-picker poppers, hand-built popover panels. */
  overlayBg: string;
  overlayBorder: string;
  overlayShadow: string;
  overlayBackdrop: string;
  /** Corner radius of a menu or popover panel. */
  overlayRadius: string;
  /** Corner radius of a dialog. */
  dialogRadius: string;
  /**
   * A sheet that slides over the page and holds cards of its own (the task
   * drawer). Classic and the opaque skins paint the page canvas; Glass paints
   * frosted overlay glass, so the page wash is not repeated inside it.
   */
  sheetBg: string;
  sheetImage: string;
  sheetBackdrop: string;

  // Page header (PageHeader) ---------------------------------------------------
  heroBg: string;
  heroBorder: string;
  heroBorderBottom: string;
  heroShadow: string;
  heroBackdrop: string;

  // Icon tiles and medallions ------------------------------------------------------
  tileBg: string;
  tileBorder: string;
  /** Tile standing proud of its surface. */
  tileShadow: string;
  /** Tile sunk into its surface (the inset variant). */
  tileInsetShadow: string;

  // Shell ---------------------------------------------------------------------
  appbarBg: string;
  /** `border-bottom` shorthand under the top bar. */
  appbarBorder: string;
  appbarShadow: string;
  appbarBackdrop: string;
  sidebarBg: string;
  /** Sidebar `background-image` (Classic's primary wash at the top). */
  sidebarImage: string;
  /** `border-right` shorthand beside the sidebar. */
  sidebarBorder: string;
  sidebarShadow: string;
  sidebarBackdrop: string;

  // Sidebar navigation --------------------------------------------------------------
  navColor: string;
  navHoverBg: string;
  navHoverColor: string;
  navHoverShadow: string;
  navActiveBg: string;
  navActiveColor: string;
  navActiveShadow: string;
  navActiveHoverBg: string;
  /** The file-tree spine and feet. */
  navSpine: string;
  /** The foot beside the current page. */
  navSpineActive: string;
  navHeadingColor: string;
  navChevronColor: string;
  navBadgeBg: string;
  navBadgeColor: string;
  navBadgeShadow: string;
  /** Count pill on the current (filled) row. */
  navBadgeActiveBg: string;

  // List and menu items -------------------------------------------------------------
  itemRadius: string;
  itemHoverBg: string;
  itemHoverShadow: string;
  itemSelectedBg: string;
  itemSelectedShadow: string;
  itemSelectedColor: string;

  // Selectable cards (ChoiceCards, the theme picker) ---------------------------------
  choiceBg: string;
  choiceBorderColor: string;
  choiceHoverBorderColor: string;
  choiceSelectedBorderColor: string;
  choiceShadow: string;
  choiceSelectedShadow: string;

  // Drag handles ----------------------------------------------------------------------
  handleBg: string;
  handleShadow: string;
  handlePressedShadow: string;

  // Upload drop zones -----------------------------------------------------------------
  dropzoneBg: string;
  dropzoneBorderColor: string;
  dropzoneHoverBg: string;
  dropzoneActiveBg: string;
  dropzoneShadow: string;

  // Board columns ---------------------------------------------------------------------
  columnBg: string;
  columnOverBg: string;
  columnBorderColor: string;
  columnShadow: string;

  // Timelines (activity, status history) -----------------------------------------------
  timelineRail: string;
  timelineDot: string;
  timelineDotActive: string;
  timelineDotShadow: string;

  // Tables and the data grid -------------------------------------------------------------
  gridHeaderBg: string;
  /** `border-bottom` shorthand under the header row. */
  gridHeaderBorder: string;
  /** Row and cell rules. */
  gridRule: string;
  gridRowStripe: string;
  gridRowHover: string;
  gridRowSelected: string;
  gridFooterBg: string;

  // Focus -------------------------------------------------------------------------------
  /** A colour with at least 3:1 against the canvas and surfaces. */
  focusRingColor: string;
  /** `outline` shorthand. */
  focusRing: string;
  focusRingOffset: string;

  // Links -------------------------------------------------------------------------------
  linkColor: string;
  linkHoverColor: string;
  linkVisitedColor: string;
  /** `text-decoration-color` of the underline. */
  linkUnderline: string;
  /** `text-decoration-thickness`: `auto` in Classic, a firmer 2px in the skins. */
  linkUnderlineThickness: string;
  /** `text-underline-offset`: `auto` in Classic, 3px in the skins so the line clears descenders. */
  linkUnderlineOffset: string;

  // Buttons -----------------------------------------------------------------------------
  buttonRadius: string;
  buttonShadow: string;
  buttonHoverShadow: string;
  buttonPressedShadow: string;

  // Icon buttons and other small controls --------------------------------------------------
  controlRadius: string;
  controlBg: string;
  controlShadow: string;
  controlHoverShadow: string;
  controlPressedShadow: string;

  // Text fields -------------------------------------------------------------------------
  inputRadius: string;
  inputBg: string;
  /** Idle outline; 3:1 against its surface in every skin but Classic, which keeps its hairline. */
  inputBorderColor: string;
  inputShadow: string;
  inputBackdrop: string;
  inputFocusShadow: string;

  // Segmented controls (ToggleButtonGroup, ViewToggle) --------------------------------------
  segmentBg: string;
  segmentShadow: string;
  segmentSelectedBg: string;
  segmentSelectedShadow: string;
  segmentSelectedColor: string;

  // Small parts -------------------------------------------------------------------------
  chipRadius: string;
  chipShadow: string;
  chipDefaultBg: string;
  badgeShadow: string;
  avatarShadow: string;
  /** Track under progress bars, sliders and switches. */
  trackBg: string;
  skeletonBg: string;
  /** Tooltip fill and text. Classic: MUI's grey at 0.92 with white text. */
  tooltipBg: string;
  tooltipColor: string;
  tooltipRadius: string;
  tooltipShadow: string;
  tooltipBackdrop: string;
  /** Colour of a second line under a divider (Neumorphism's etched groove); transparent elsewhere. */
  dividerHighlight: string;
  /** CSS `filter` on step icons (the circles are SVG, so depth comes from drop-shadow). */
  stepFilter: string;
}

/** What a skin's token and palette functions are given. */
export interface SkinContext {
  /** MUI's finished palette for this preset, mode and skin (action colours, contrast text). */
  palette: Palette;
  /** The preset palette as this skin adjusted it (canvas, overlay colour, card border). */
  source: PresetPalette;
  /** The finished theme's shadow ramp (`boxShadow: 4` in `sx` reads `shadows[4]`). */
  shadows: Shadows;
}

/** One skin: its catalogue entry plus everything needed to paint it. */
export interface SkinDefinition {
  key: SkinKey;
  label: string;
  /** One line on the character of the skin, shown under its name in the picker. */
  description: string;
  /**
   * The preset palette as this skin paints it: canvas, paper, divider and
   * secondary text tuned so text keeps its contrast on the skin's surfaces.
   * Classic returns the preset untouched.
   */
  palette: (preset: PresetPalette) => PresetPalette;
  /** Every token for a finished palette. The picker paints its miniature from these too. */
  tokens: (context: SkinContext) => SkinTokens;
  /**
   * Theme options merged over the house theme: radius scale, shadow ramp,
   * component overrides. Absent for Classic, which must not change.
   */
  options?: (source: PresetPalette) => ThemeOptions;
  /**
   * Colours a surface can sit on, for contrast checks: the canvas, and for
   * Glass every mix of its backdrop layers. Opaque.
   */
  backdrops: (source: PresetPalette) => string[];
}

export type ShadowRamp = (elevation: number) => string;

/** MUI's 25-step shadow list from a function of elevation. */
export const shadowList = (ramp: ShadowRamp): Shadows =>
  Array.from({ length: 25 }, (_, elevation) =>
    elevation === 0 ? 'none' : ramp(elevation),
  ) as Shadows;

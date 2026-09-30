import { brandColors } from '@iaa/shared';
import { alpha, darken, lighten } from '@mui/material/styles';

import type { SkinContext, SkinDefinition, SkinTokens } from './types';

/**
 * Classic: the console exactly as it looked before skins.
 *
 * Every token here is copied from the surface that used to paint it by hand,
 * with the source named beside it, so a surface moved onto the tokens renders
 * the same pixels in Classic. Change a value here and the Classic screens
 * change with it: that is what the visual baseline is for.
 */
const classicTokens = ({ palette, source, shadows }: SkinContext): SkinTokens => {
  const primary = palette.primary.main;
  const paper = palette.background.paper;
  const divider = palette.divider;
  const hairline = `1px solid ${divider}`;
  const isLight = palette.mode === 'light';
  return {
    // CssBaseline body, and AppShell's <main>.
    canvasBg: source.canvas,
    canvasImage: `radial-gradient(circle at 90% 0%, ${alpha(source.overlay, isLight ? 0.045 : 0.06)}, transparent 30rem)`,
    canvasAttachment: 'scroll',
    pageBg: palette.background.default,

    textPrimary: palette.text.primary,
    textSecondary: palette.text.secondary,
    accentText: primary,

    // The common card: bgcolor background.paper, border 1, borderColor divider.
    surfaceBg: paper,
    surfaceBorder: hairline,
    surfaceBorderColor: divider,
    surfaceShadow: 'none',
    surfaceHoverShadow: 'none',
    surfaceBackdrop: 'none',
    surfaceSheen: 'none',
    // DetailSection and the event page's section headers.
    surfaceTintBg: alpha(primary, 0.045),
    // The sidebar's logo tile, the skip link.
    surfaceRaisedBg: paper,
    surfaceRaisedBorder: hairline,
    surfaceRaisedShadow: 'none',
    surfacePressedShadow: 'none',
    // Board column body.
    surfaceInsetBg: alpha(primary, 0.03),
    surfaceInsetBorder: hairline,
    surfaceInsetShadow: 'none',
    // A card inside a card is the ordinary card in Classic.
    surfaceNestedBg: paper,
    surfaceNestedShadow: 'none',
    // MuiCard.
    cardRadius: '14px',

    // NotificationsBell and UserMenu panels; MuiDialog.
    overlayBg: paper,
    overlayBorder: hairline,
    overlayShadow: '0 12px 32px rgba(26, 92, 56, 0.14)',
    overlayBackdrop: 'none',
    overlayRadius: '10px',
    dialogRadius: '16px',
    // TaskDrawer's paper: the page canvas, without the corner glow.
    sheetBg: palette.background.default,
    sheetImage: 'none',
    sheetBackdrop: 'none',

    // PageHeader.
    heroBg: alpha(primary, 0.075),
    heroBorder: `1px solid ${alpha(primary, 0.14)}`,
    heroBorderBottom: `1px solid ${alpha(primary, 0.11)}`,
    heroShadow: 'none',
    heroBackdrop: 'none',

    // PageHeader's icon square.
    tileBg: alpha(primary, 0.1),
    tileBorder: `1px solid ${alpha(primary, 0.16)}`,
    tileShadow: 'none',
    tileInsetShadow: 'none',

    // AppShell's AppBar and permanent Drawer.
    appbarBg: alpha(paper, 0.88),
    appbarBorder: hairline,
    appbarShadow: 'none',
    appbarBackdrop: 'blur(14px)',
    sidebarBg: alpha(paper, 0.96),
    sidebarImage: `linear-gradient(180deg, ${alpha(primary, 0.055)} 0, ${alpha(paper, 0)} 190px)`,
    sidebarBorder: hairline,
    sidebarShadow: 'none',
    sidebarBackdrop: 'none',

    // SidebarNav: ThreadedNavLink, RailNavLink, ACTIVE_ROW, NavBadge.
    navColor: palette.text.secondary,
    navHoverBg: palette.action.hover,
    navHoverColor: palette.text.primary,
    navHoverShadow: 'none',
    navActiveBg: primary,
    navActiveColor: palette.getContrastText(primary),
    navActiveShadow: `0 6px 16px -8px ${alpha(brandColors.forest, 0.7)}`,
    navActiveHoverBg: palette.primary.dark,
    navSpine: divider,
    navSpineActive: primary,
    navHeadingColor: palette.text.secondary,
    navChevronColor: palette.text.disabled,
    navBadgeBg: palette.error.main,
    navBadgeColor: palette.common.white,
    navBadgeShadow: 'none',
    navBadgeActiveBg: palette.common.black,

    // MUI's MenuItem and ListItemButton.
    itemRadius: '0px',
    itemHoverBg: palette.action.hover,
    itemHoverShadow: 'none',
    itemSelectedBg: alpha(primary, palette.action.selectedOpacity),
    itemSelectedShadow: 'none',
    itemSelectedColor: 'inherit',

    // ChoiceCards and the theme picker's cards.
    choiceBg: paper,
    choiceBorderColor: divider,
    choiceHoverBorderColor: palette.text.secondary,
    choiceSelectedBorderColor: primary,
    choiceShadow: 'none',
    choiceSelectedShadow: shadows[4],

    // Drag handles are small IconButtons with no surface of their own.
    handleBg: 'transparent',
    handleShadow: 'none',
    handlePressedShadow: 'none',

    // MediaUploadField's DropZone.
    dropzoneBg: 'transparent',
    dropzoneBorderColor: divider,
    dropzoneHoverBg: alpha(primary, 0.04),
    dropzoneActiveBg: alpha(primary, 0.06),
    dropzoneShadow: 'none',

    // TaskBoardView's column.
    columnBg: alpha(primary, 0.03),
    columnOverBg: alpha(primary, 0.08),
    columnBorderColor: divider,
    columnShadow: 'none',

    // StatusHistory.
    timelineRail: divider,
    timelineDot: palette.action.disabled,
    timelineDotActive: primary,
    timelineDotShadow: 'none',

    // DataTable's grid chrome.
    gridHeaderBg: alpha(primary, 0.07),
    gridHeaderBorder: `1px solid ${alpha(primary, 0.18)}`,
    gridRule: divider,
    gridRowStripe: alpha(primary, 0.02),
    gridRowHover: alpha(primary, 0.06),
    gridRowSelected: alpha(primary, 0.1),
    gridFooterBg: palette.background.default,

    // ChoiceCards, DetailTabs and BoardCard draw this ring.
    focusRingColor: primary,
    focusRing: `2px solid ${primary}`,
    focusRingOffset: '2px',

    // MUI Link with its default underline.
    linkColor: primary,
    linkHoverColor: primary,
    linkVisitedColor: primary,
    linkUnderline: alpha(primary, 0.4),
    linkUnderlineThickness: 'auto',
    linkUnderlineOffset: 'auto',

    // MuiButton in the house theme (disableElevation).
    buttonRadius: '10px',
    buttonShadow: 'none',
    buttonHoverShadow: 'none',
    buttonPressedShadow: 'none',

    // MuiIconButton in the house theme.
    controlRadius: '10px',
    controlBg: 'transparent',
    controlShadow: 'none',
    controlHoverShadow: 'none',
    controlPressedShadow: 'none',

    // MuiOutlinedInput in the house theme.
    inputRadius: '10px',
    inputBg: isLight ? paper : alpha('#ffffff', 0.04),
    inputBorderColor: source.cardBorder,
    inputShadow: 'none',
    inputBackdrop: 'none',
    inputFocusShadow: `0 0 0 3px ${alpha(source.overlay, 0.12)}`,

    // MUI's ToggleButton defaults.
    segmentBg: 'transparent',
    segmentShadow: 'none',
    segmentSelectedBg: alpha(palette.text.primary, palette.action.selectedOpacity),
    segmentSelectedShadow: 'none',
    segmentSelectedColor: palette.text.primary,

    // MuiChip in the house theme; MUI defaults for the rest.
    chipRadius: '8px',
    chipShadow: 'none',
    chipDefaultBg: palette.action.selected,
    badgeShadow: 'none',
    avatarShadow: 'none',
    trackBg: isLight ? lighten(primary, 0.62) : darken(primary, 0.5),
    skeletonBg: alpha(palette.text.primary, isLight ? 0.11 : 0.13),
    // MUI's Tooltip defaults.
    tooltipBg: alpha(palette.grey[700], 0.92),
    tooltipColor: palette.common.white,
    tooltipRadius: '7px',
    tooltipShadow: 'none',
    tooltipBackdrop: 'none',
    dividerHighlight: 'transparent',
    stepFilter: 'none',
  };
};

export const classicSkin: SkinDefinition = {
  key: 'classic',
  label: 'Classic',
  description: 'The console as it has always looked.',
  palette: (preset) => preset,
  tokens: classicTokens,
  backdrops: (source) => [source.canvas, source.background.default],
};

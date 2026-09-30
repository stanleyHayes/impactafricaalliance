/**
 * Skin tokens for hand-built surfaces: the guide.
 *
 * The console has three independent looks: a colour preset, light or dark
 * mode, and a skin (Classic, Neumorphism, Glassmorphism, Claymorphism). MUI
 * components pick the skin up from the theme on their own. A surface built
 * from a `Box` with its own `bgcolor`, `border` and `boxShadow` does not: it
 * has to read the skin's tokens, which the theme publishes as CSS custom
 * properties on `:root` (`--iaa-surface-bg` and so on; the full list and what
 * each one means is `SkinTokens` in `theme/skins/types.ts`).
 *
 * In Classic every token is exactly what the console painted before skins
 * existed, so moving a surface onto the tokens is invisible there. That is
 * checked: `theme.test.ts` pins Classic's theme, and the visual baseline pins
 * its pixels.
 *
 * WHAT THE THEME ALREADY DOES (do not restyle these by hand)
 *
 * Buttons of every variant, icon buttons (so ActionIcon and drag handles),
 * toggle buttons, tabs, the stepper, text fields, selects, autocompletes,
 * date fields and the calendar, switches, checkboxes, radios, sliders, chips,
 * badges, avatars, links, pagination, progress bars, skeletons, alerts,
 * snackbars, tooltips, accordions, dividers, tables, the data grid, cards,
 * outlined papers, menus, popovers, dialogs and drawers all follow the skin
 * from the theme (`theme/skins/components.ts`). Two more levers reach
 * hand-built boxes without any change: the skin retunes the palette
 * (`background.paper`, `divider`, `text.secondary` follow its surfaces) and
 * scales the radius and shadow units (see the rules of thumb). What `sx`
 * sets by hand still wins, which is why hand-built surfaces need the helpers.
 *
 * Two shell notes: `<main>` must use `surfaceSx.page`, or its solid
 * `background.default` hides the Glass and Clay washes on the body; and
 * ThemeToggle's reveal should pass the skin to `createAppTheme` so its circle
 * is the skin's canvas colour.
 *
 * WHICH HELPER FOR WHICH SURFACE
 *
 * | Surface                                              | Use                          |
 * | ---------------------------------------------------- | ---------------------------- |
 * | Page area inside the shell (`<main>`)                 | `surfaceSx.page`             |
 * | Card, panel, section, list or board card, stat tile  | `surfaceSx.card` (+ `cardHover`) |
 * | A card inside a card: dashboard tiles in a panel, form-builder questions | `surfaceSx.nested` |
 * | Tinted header strip of a section card                | `surfaceSx.tinted`           |
 * | Small lifted thing: logo tile, top-bar action, skip link | `surfaceSx.raised` (+ `pressed`) |
 * | Well sunk into a card: board column body, search strip | `surfaceSx.inset`          |
 * | Hand-built popover or menu panel (`slotProps.paper`) | `surfaceSx.overlay`          |
 * | The page header                                      | `surfaceSx.hero`             |
 * | Icon square, medallion, avatar-like icon holder      | `surfaceSx.tile` / `tileInset` |
 * | Top bar, sidebar paper, sidebar wash                 | `surfaceSx.appBar`, `sidebar`, `sidebarWash` |
 * | Sidebar links, rail links, group headings, count pills | `navSx.*`                  |
 * | Selectable card (ChoiceCards, pickers)               | `choiceSx(selected)`         |
 * | Upload drop zone                                     | `dropZoneSx`, `dropZoneActiveSx` |
 * | Board column                                         | `columnSx(isOver)`           |
 * | Timeline rail and dots                               | `timelineSx`                 |
 * | Drag handle                                          | `handleSx`                   |
 * | Link styled by hand (`Box component={RouterLink}`)   | `linkSx`                     |
 * | "Back to …" text button at the top of a page         | `backLinkSx` (in the `sx` array) |
 * | A sheet sliding over the page (the task drawer)      | `tokenVar('sheetBg')` and friends |
 * | A focus ring on anything focusable                   | `focusRingSx`                |
 * | Anything else                                        | `tokenVar('…')` for one value, or `skinned()` |
 *
 * Each helper is a plain `sx` object: spread it and keep your layout.
 *
 *     // Before: a card drawn by hand.
 *     <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }} />
 *
 *     // After: the same pixels in Classic, and the skin's card everywhere else.
 *     <Box sx={{ p: 3, borderRadius: 3, ...surfaceSx.card }} />
 *
 * Only replace what the helper covers when your Classic values are the ones
 * in the helper's comment. When a surface's Classic look is its own (a tone
 * colour, an unusual tint), keep it exactly and add the skin on top with
 * `skinned(classic, skin)`: Classic gets `classic` untouched, every other skin
 * gets `classic` with `skin` laid over it.
 *
 *     // Before: a stat tile tinted in its own tone.
 *     sx={{ borderRadius: 2.5, bgcolor: alpha(tone, 0.12), boxShadow: `inset 0 0 0 1px ${alpha(tone, 0.16)}` }}
 *
 *     // After: identical in Classic; in a skin it keeps its tone and takes the skin's depth.
 *     sx={skinned(
 *       { borderRadius: 2.5, bgcolor: alpha(tone, 0.12), boxShadow: `inset 0 0 0 1px ${alpha(tone, 0.16)}` },
 *       { boxShadow: tokenVar('tileShadow') },
 *     )}
 *
 *     // A top-bar action (see ThemeSelector's trigger): keep Classic's tinted
 *     // square, and let a skin make it one of its raised controls.
 *     sx={skinned(classicSquare, {
 *       bgcolor: tokenVar('controlBg'),
 *       border: tokenVar('surfaceRaisedBorder'),
 *       '&:hover': { bgcolor: tokenVar('controlBg') },
 *     })}
 *
 * RULES OF THUMB
 *
 * - Keep numeric radii (`borderRadius: 3`). The skin scales the radius unit
 *   (Classic 4px, Neumorphism and Glass 6px, Clay 8px), so every number grows
 *   with the skin. Only pixel strings stay fixed.
 * - Keep `sx` shadows as numbers where you have them (`boxShadow: 4`): each
 *   skin has its own shadow ramp.
 * - Never replace a colour that means something. Status, tone and chart
 *   colours stay; the skin changes the container's shape and depth.
 * - Photographs, uploaded images and brand watermarks are not skinned.
 * - Text colours come from the palette (`text.primary`, `text.secondary`),
 *   which each skin tunes to keep 4.5:1 on its surfaces. For the primary as
 *   text on a surface use `tokenVar('accentText')`, not `primary.main`.
 * - Focus: `focusRingSx` gives a ring with 3:1 against the skin's surfaces.
 * - JavaScript that needs a raw value (a colour for a canvas, an animation)
 *   reads `theme.skinTokens`.
 */
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { deepmerge } from '@mui/utils';

import { skinVar, type SkinTokenName } from './skins';

/** An `sx` style object (never `null`, so helpers can be spread and merged). */
type Sx = NonNullable<SystemStyleObject<Theme>>;

/** `var(--iaa-…)` for one token, for any CSS value in `sx`. */
export const tokenVar = (token: SkinTokenName): string => skinVar(token);

const v = tokenVar;

/** A solid focus ring with 3:1 against the skin's surfaces. Classic: 2px solid primary, 2px out. */
export const focusRingSx: Sx = { outline: v('focusRing'), outlineOffset: v('focusRingOffset') };

/**
 * The common surfaces. Each comment gives the Classic values the helper
 * reproduces; if yours are those, the helper can replace them outright.
 */
export const surfaceSx = {
  /** Classic: `bgcolor: 'background.default'`. Transparent in skins whose canvas carries a backdrop. */
  page: { bgcolor: v('pageBg') },
  /** Classic: `bgcolor: 'background.paper', border: 1, borderColor: 'divider'`, no shadow or image. */
  card: {
    bgcolor: v('surfaceBg'),
    backgroundImage: v('surfaceSheen'),
    border: v('surfaceBorder'),
    borderColor: v('surfaceBorderColor'),
    boxShadow: v('surfaceShadow'),
    backdropFilter: v('surfaceBackdrop'),
  },
  /** For `'&:hover'` on a clickable card. Classic: no shadow. */
  cardHover: { boxShadow: v('surfaceHoverShadow') },
  /**
   * A card inside another card. Classic: exactly `card`. The skins give it
   * less depth than a top-level card (so shadows do not double up) and, in
   * Glass, thinner glass with no second blur.
   */
  nested: {
    bgcolor: v('surfaceNestedBg'),
    backgroundImage: 'none',
    border: v('surfaceBorder'),
    borderColor: v('surfaceBorderColor'),
    boxShadow: v('surfaceNestedShadow'),
  },
  /** Classic: `bgcolor: alpha(primary.main, 0.045)` (DetailSection, event sections). */
  tinted: { bgcolor: v('surfaceTintBg') },
  /** Classic: `bgcolor: 'background.paper', border: 1, borderColor: 'divider'` (the sidebar's logo tile). */
  raised: {
    bgcolor: v('surfaceRaisedBg'),
    border: v('surfaceRaisedBorder'),
    boxShadow: v('surfaceRaisedShadow'),
  },
  /** For `'&:active'` or a toggled-on state of a raised element. Classic: no shadow. */
  pressed: { boxShadow: v('surfacePressedShadow') },
  /** Classic: `bgcolor: alpha(primary.main, 0.03), border: 1, borderColor: 'divider'` (a board column). */
  inset: {
    bgcolor: v('surfaceInsetBg'),
    border: v('surfaceInsetBorder'),
    boxShadow: v('surfaceInsetShadow'),
  },
  /**
   * Classic: `bgcolor: 'background.paper'`, `border: 1, borderColor: 'divider'`,
   * `borderRadius: 2.5`, `boxShadow: '0 12px 32px rgba(26, 92, 56, 0.14)'`
   * (the notifications and user menu panels).
   */
  overlay: {
    bgcolor: v('overlayBg'),
    backgroundImage: v('surfaceSheen'),
    border: v('overlayBorder'),
    borderRadius: v('overlayRadius'),
    boxShadow: v('overlayShadow'),
    backdropFilter: v('overlayBackdrop'),
  },
  /** Classic: PageHeader's `alpha(primary, 0.075)` fill, 0.14 border and 0.11 bottom rule. */
  hero: {
    bgcolor: v('heroBg'),
    backgroundImage: v('surfaceSheen'),
    border: v('heroBorder'),
    borderBottom: v('heroBorderBottom'),
    boxShadow: v('heroShadow'),
    backdropFilter: v('heroBackdrop'),
  },
  /** Classic: `bgcolor: alpha(primary, 0.1), border: 1px solid alpha(primary, 0.16)` (PageHeader's icon square). */
  tile: { bgcolor: v('tileBg'), border: v('tileBorder'), boxShadow: v('tileShadow') },
  /** A tile sunk into its surface. Classic: `bgcolor: alpha(primary, 0.1)`, no border (DetailSection's icon). */
  tileInset: { bgcolor: v('tileBg'), boxShadow: v('tileInsetShadow') },
  /** Classic: `bgcolor: alpha(paper, 0.88), backdropFilter: 'blur(14px)', borderBottom: 1, borderColor: 'divider'`. */
  appBar: {
    bgcolor: v('appbarBg'),
    borderBottom: v('appbarBorder'),
    boxShadow: v('appbarShadow'),
    backdropFilter: v('appbarBackdrop'),
  },
  /** The docked drawer paper. Classic: `bgcolor: alpha(paper, 0.96), borderRight: 1, borderColor: 'divider'`. */
  sidebar: {
    bgcolor: v('sidebarBg'),
    borderRight: v('sidebarBorder'),
    boxShadow: v('sidebarShadow'),
    backdropFilter: v('sidebarBackdrop'),
  },
  /** The sidebar's inner column. Classic: the primary wash fading out over 190px. */
  sidebarWash: { backgroundImage: v('sidebarImage') },
} as const satisfies Record<string, Sx>;

/**
 * Sidebar navigation. Classic values are SidebarNav's: `text.secondary` idle,
 * `action.hover` + `text.primary` under the pointer, the primary pill with its
 * forest shadow when current, `primary.dark` under the pointer when current.
 */
export const navSx = {
  link: {
    color: v('navColor'),
    '&:hover': {
      bgcolor: v('navHoverBg'),
      color: v('navHoverColor'),
      boxShadow: v('navHoverShadow'),
    },
    '&.Mui-focusVisible, &:focus-visible': focusRingSx,
  },
  active: {
    bgcolor: v('navActiveBg'),
    color: v('navActiveColor'),
    boxShadow: v('navActiveShadow'),
    '& .MuiListItemIcon-root': { color: v('navActiveColor') },
    '&:hover': { bgcolor: v('navActiveHoverBg'), color: v('navActiveColor') },
  },
  /** The file-tree spine and feet (`bgcolor`). */
  spine: { bgcolor: v('navSpine') },
  spineActive: { bgcolor: v('navSpineActive') },
  heading: { color: v('navHeadingColor') },
  chevron: { color: v('navChevronColor') },
  badge: { bgcolor: v('navBadgeBg'), color: v('navBadgeColor'), boxShadow: v('navBadgeShadow') },
  /** The count pill on the current row. Classic: black. */
  badgeOnActive: { bgcolor: v('navBadgeActiveBg'), color: v('navBadgeColor') },
} as const satisfies Record<string, Sx>;

/**
 * A selectable card (ChoiceCards, the theme picker). Keep your own `border: 2`
 * width. Classic: `background.paper`, `divider` / `primary.main` border,
 * `text.secondary` border under the pointer, `boxShadow: 4` when selected.
 */
export const choiceSx = (selected: boolean): Sx => ({
  bgcolor: v('choiceBg'),
  borderColor: selected ? v('choiceSelectedBorderColor') : v('choiceBorderColor'),
  boxShadow: selected ? v('choiceSelectedShadow') : v('choiceShadow'),
  '&:hover': {
    borderColor: selected ? v('choiceSelectedBorderColor') : v('choiceHoverBorderColor'),
  },
  '&.Mui-focusVisible': focusRingSx,
});

/** Upload drop zone at rest (keep your dashed `border`). Classic: transparent, `divider` dashes. */
export const dropZoneSx: Sx = {
  bgcolor: v('dropzoneBg'),
  borderColor: v('dropzoneBorderColor'),
  boxShadow: v('dropzoneShadow'),
};

/** Under the pointer or while a file is dragged over. Classic: primary dashes, 0.04 / 0.06 tint. */
export const dropZoneActiveSx = {
  hover: { bgcolor: v('dropzoneHoverBg'), borderColor: v('focusRingColor') },
  dragging: { bgcolor: v('dropzoneActiveBg'), borderColor: v('focusRingColor') },
} as const satisfies Record<string, Sx>;

/** A board column. Classic: `alpha(primary, 0.03)` (0.08 with primary border while a card is over it). */
export const columnSx = (isOver: boolean): Sx => ({
  bgcolor: isOver ? v('columnOverBg') : v('columnBg'),
  borderColor: isOver ? v('focusRingColor') : v('columnBorderColor'),
  boxShadow: v('columnShadow'),
});

/** Timeline parts (`bgcolor` on the pseudo-elements). Classic: `divider` rail, `action.disabled` / primary dots. */
export const timelineSx = {
  rail: { bgcolor: v('timelineRail') },
  dot: { bgcolor: v('timelineDot'), boxShadow: v('timelineDotShadow') },
  dotActive: { bgcolor: v('timelineDotActive'), boxShadow: v('timelineDotShadow') },
} as const satisfies Record<string, Sx>;

/** A drag handle (an IconButton). Classic: no surface of its own. */
export const handleSx: Sx = {
  bgcolor: v('handleBg'),
  boxShadow: v('handleShadow'),
  '&:active': { boxShadow: v('handlePressedShadow') },
};

/** A link built by hand. Classic: MUI Link's primary with its 0.4 underline. */
export const linkSx: Sx = {
  color: v('linkColor'),
  textDecorationColor: v('linkUnderline'),
  textDecorationThickness: v('linkUnderlineThickness'),
  textUnderlineOffset: v('linkUnderlineOffset'),
  '&:hover': { color: v('linkHoverColor') },
  '&:visited': { color: v('linkVisitedColor') },
  '&:focus-visible': { ...focusRingSx, borderRadius: '4px' },
};

/**
 * Data grid and table chrome, for DataTable's `sx`. Classic values are
 * DataTable's: a 0.07 primary header with a 0.18 rule, 0.02 zebra rows,
 * 0.06 hover, 0.1 selected, `background.default` footer.
 */
export const gridSx = {
  header: { bgcolor: v('gridHeaderBg'), borderBottom: v('gridHeaderBorder') },
  stripe: { bgcolor: v('gridRowStripe') },
  hover: { bgcolor: v('gridRowHover') },
  selected: { bgcolor: v('gridRowSelected') },
  footer: { bgcolor: v('gridFooterBg') },
  rule: { borderColor: v('gridRule') },
} as const satisfies Record<string, Sx>;

const BORDER_SHORTHANDS = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'];

/**
 * `skin` over `classic`. A border shorthand in `skin` brings its own colour,
 * so a `borderColor` left in `classic` (which would recolour it, being later
 * in the object) is dropped unless `skin` sets one too.
 */
const layer = (classic: Sx, skin: Sx): Sx => {
  const bordered = BORDER_SHORTHANDS.some((key) => key in skin) && !('borderColor' in skin);
  if (!bordered) return deepmerge(classic, skin);
  const rest = Object.fromEntries(
    Object.entries(classic).filter(([key]) => key !== 'borderColor'),
  ) as Sx;
  return deepmerge(rest, skin);
};

/**
 * The escape hatch for a surface whose Classic look is its own: Classic gets
 * `classic` exactly; every other skin gets `classic` with `skin` laid over it
 * (keys in `skin` win, nested selectors merge). Returns an `sx` callback, so
 * it goes straight into `sx` or into an `sx` array.
 */
export const skinned =
  (classic: Sx, skin: Sx) =>
  (theme: Theme): Sx =>
    !theme.skin || theme.skin === 'classic' ? classic : layer(classic, skin);

/**
 * A "Back to …" link at the top of a page (a text Button with an arrow). In
 * Classic it stays the plain text button. A skin makes it one of its small
 * controls, so the way back is as tactile as the rest of the page: a raised
 * pill in Neumorphism that presses in, a frosted chip in Glass, a pastel clay
 * pill in Clay. Goes in the `sx` array: `sx={[{ mb: 2 }, backLinkSx]}`.
 */
export const backLinkSx = skinned(
  {},
  {
    px: 1.5,
    borderRadius: v('buttonRadius'),
    bgcolor: v('controlBg'),
    boxShadow: v('controlShadow'),
    '&:hover': { bgcolor: v('controlBg'), boxShadow: v('controlHoverShadow') },
    '&:active': { boxShadow: v('controlPressedShadow') },
    '&.Mui-disabled': { bgcolor: 'transparent', boxShadow: 'none' },
  },
);

import { alpha, type Components, type CSSObject, type Theme } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import type {} from '@mui/x-data-grid/themeAugmentation';
import type {} from '@mui/x-date-pickers/themeAugmentation';

import { skinVar as v } from './css-vars';
import type { SkinKey } from './types';

/**
 * MUI component overrides for every skin except Classic.
 *
 * They read the skin's CSS variables rather than colours, so one set serves
 * Neumorphism, Glass and Clay: each skin differs in the values it publishes,
 * not in these rules. A few extras at the bottom are specific to one skin
 * (Clay's press, Glass's blurred dialog scrim).
 *
 * Two rules keep call sites in charge. Anything a page sets in `sx` still
 * wins, because these overrides come earlier in the same class and use
 * `:where()` wherever a variant class would otherwise out-rank `sx`. And
 * nothing here removes a colour that means something: status chips, error
 * outlines and the preset's primary fill all keep their colours; the skin
 * changes shape, depth and material.
 */

type Overrides = Components<Omit<Theme, 'components'>>;

const FOCUS = '&.Mui-focusVisible, &:focus-visible';

/** The skin's focus ring outside the element. */
const ring: CSSObject = { outline: v('focusRing'), outlineOffset: v('focusRingOffset') };
/** Inside, for rows in scrolling lists whose edge would clip an outside ring. */
const ringInside: CSSObject = { outline: v('focusRing'), outlineOffset: '-2px' };

const surface: CSSObject = {
  backgroundColor: v('surfaceBg'),
  backgroundImage: v('surfaceSheen'),
  border: v('surfaceBorder'),
  boxShadow: v('surfaceShadow'),
  backdropFilter: v('surfaceBackdrop'),
};

const overlay: CSSObject = {
  backgroundColor: v('overlayBg'),
  backgroundImage: v('surfaceSheen'),
  border: v('overlayBorder'),
  borderRadius: v('overlayRadius'),
  boxShadow: v('overlayShadow'),
  backdropFilter: v('overlayBackdrop'),
};

const itemStates: CSSObject = {
  '&:hover': { backgroundColor: v('itemHoverBg'), boxShadow: v('itemHoverShadow') },
  '&.Mui-selected, &.Mui-selected:hover': {
    backgroundColor: v('itemSelectedBg'),
    boxShadow: v('itemSelectedShadow'),
    color: v('itemSelectedColor'),
  },
};

/**
 * "Inside any of these", as one `:where()` for `&:where(…)`. Written as a
 * descendant test on the element itself because Emotion prefixes a nested
 * selector that starts with a colon (`:where(.a) &`) with the element's own
 * class, which would then never match. `:where()` adds no specificity, so a
 * call site's `sx` still wins.
 */
const insideAny = (ancestors: readonly string[]): string =>
  `:where(${ancestors.map((ancestor) => `${ancestor} *`).join(', ')})`;

/** Icon buttons that live inside another control keep that control's surface. */
const EMBEDDED_ICON_BUTTON = insideAny([
  '.MuiInputBase-root',
  '.MuiPickersInputBase-root',
  '.MuiInputAdornment-root',
  '.MuiAutocomplete-endAdornment',
  '.MuiChip-root',
  '.MuiAlert-root',
  '.MuiSnackbarContent-root',
  '.MuiDataGrid-columnHeader',
  '.MuiDataGrid-toolbarContainer',
  '.MuiPickersCalendarHeader-root',
  '.MuiPickersArrowSwitcher-root',
  '.MuiTablePagination-actions',
]);

/**
 * Icon buttons in a table row, grid cell or list row (edit, delete, more).
 * Raised at rest, four of them repeated down every row compete with the
 * status chips, so they lie flat until their row is under the pointer or they
 * are themselves hovered or focused.
 */
const IN_ROW = insideAny(['.MuiTableCell-root', '.MuiDataGrid-cell', '.MuiListItem-root']);
const ROW_UNDER_POINTER = insideAny([
  '.MuiTableRow-root:hover',
  '.MuiDataGrid-row:hover',
  '.MuiListItem-root:hover',
]);

const rowIconButton: CSSObject = {
  [`&${IN_ROW}`]: { backgroundColor: 'transparent', boxShadow: 'none' },
  [`&${ROW_UNDER_POINTER}, &${IN_ROW}:focus-visible, &${IN_ROW}.Mui-focusVisible`]: {
    backgroundColor: v('controlBg'),
    boxShadow: v('controlShadow'),
  },
};

const ALERT_COLOURS = ['success', 'info', 'warning', 'error'] as const;

/**
 * A standard alert in dark mode: MUI paints a near-black strip that reads as
 * a hole in a skin's charcoal or clay. The skin lays a light tint of the
 * alert's colour over its own card instead, raised like its other panels.
 */
const darkAlert = (theme: Theme, key: string | undefined): CSSObject => {
  const colour = ALERT_COLOURS.find((candidate) => candidate === key) ?? 'success';
  const tint = alpha(theme.palette[colour].main, 0.14);
  return {
    backgroundColor: v('surfaceBg'),
    backgroundImage: `linear-gradient(${tint}, ${tint})`,
    color: theme.palette.text.primary,
  };
};

const surfaces: Overrides = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: v('canvasBg'),
        backgroundImage: v('canvasImage'),
        backgroundAttachment: v('canvasAttachment'),
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundColor: v('surfaceBg'),
        backgroundImage: 'none',
        backdropFilter: v('surfaceBackdrop'),
      },
      outlined: {
        backgroundImage: v('surfaceSheen'),
        border: v('surfaceBorder'),
        boxShadow: v('surfaceShadow'),
      },
      elevation0: { boxShadow: v('surfaceShadow') },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        ...surface,
        borderRadius: v('cardRadius'),
        '&:has(.MuiCardActionArea-root:hover)': { boxShadow: v('surfaceHoverShadow') },
      },
    },
  },
  MuiCardActionArea: {
    styleOverrides: {
      root: { borderRadius: 'inherit', [FOCUS]: ringInside },
      focusHighlight: { borderRadius: 'inherit' },
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: {
        ...surface,
        borderRadius: v('cardRadius'),
        '&::before': { display: 'none' },
        '& + .MuiAccordion-root': { marginTop: 12 },
      },
    },
  },
  MuiAccordionSummary: {
    styleOverrides: { root: { borderRadius: 'inherit', [FOCUS]: ringInside } },
  },
  MuiAlert: {
    styleOverrides: {
      root: ({ theme, ownerState }) => ({
        borderRadius: v('controlRadius'),
        boxShadow: v('surfaceRaisedShadow'),
        backdropFilter: v('surfaceBackdrop'),
        ...(theme.palette.mode === 'dark' &&
          ownerState.variant === 'standard' &&
          darkAlert(theme, ownerState.color ?? ownerState.severity)),
      }),
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        '&:where(:not(.MuiDivider-vertical):not(.MuiDivider-withChildren))': {
          boxShadow: `0 1px 0 ${v('dividerHighlight')}`,
        },
        '&:where(.MuiDivider-vertical)': { boxShadow: `1px 0 0 ${v('dividerHighlight')}` },
      },
    },
  },
  MuiSkeleton: { styleOverrides: { root: { backgroundColor: v('skeletonBg') } } },
  MuiAvatar: { styleOverrides: { root: { boxShadow: v('avatarShadow') } } },
  MuiBadge: { styleOverrides: { badge: { boxShadow: v('badgeShadow') } } },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: v('appbarBg'),
        border: 0,
        borderBottom: v('appbarBorder'),
        boxShadow: v('appbarShadow'),
        backdropFilter: v('appbarBackdrop'),
      },
    },
  },
};

const overlays: Overrides = {
  MuiPopover: { styleOverrides: { paper: overlay } },
  MuiMenu: { styleOverrides: { paper: overlay, list: { padding: 6 } } },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: v('itemRadius'),
        ...itemStates,
        '&.Mui-focusVisible': { backgroundColor: v('itemHoverBg'), ...ringInside },
        '& + .MuiMenuItem-root': { marginTop: 2 },
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: { root: { ...itemStates, '&.Mui-focusVisible': ringInside } },
  },
  MuiAutocomplete: {
    styleOverrides: {
      paper: overlay,
      listbox: {
        padding: 6,
        '& .MuiAutocomplete-option': {
          borderRadius: v('itemRadius'),
          '&.Mui-focused': { backgroundColor: v('itemHoverBg'), boxShadow: v('itemHoverShadow') },
          '&[aria-selected="true"], &[aria-selected="true"].Mui-focused': {
            backgroundColor: v('itemSelectedBg'),
            boxShadow: v('itemSelectedShadow'),
            color: v('itemSelectedColor'),
          },
          '&.Mui-focusVisible': ringInside,
        },
      },
    },
  },
  MuiSelect: { styleOverrides: { icon: { color: v('textSecondary') } } },
  MuiDialog: {
    styleOverrides: { paper: { ...overlay, borderRadius: v('dialogRadius') } },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: v('overlayBg'),
        backgroundImage: 'none',
        boxShadow: v('overlayShadow'),
        backdropFilter: v('overlayBackdrop'),
        // A docked drawer is the sidebar and casts the sidebar's shadow. One
        // that slides in (the phone's navigation, the task drawer) floats over
        // dimmed content, so it keeps the overlay material above: Glass's
        // sidebar glass is too thin to read over the dimmed page.
        [`&${insideAny(['.MuiDrawer-docked'])}`]: { boxShadow: v('sidebarShadow') },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: v('tooltipBg'),
        color: v('tooltipColor'),
        borderRadius: v('tooltipRadius'),
        boxShadow: v('tooltipShadow'),
        backdropFilter: v('tooltipBackdrop'),
      },
      arrow: { color: v('tooltipBg') },
    },
  },
  MuiSnackbarContent: {
    styleOverrides: {
      root: {
        borderRadius: v('controlRadius'),
        boxShadow: v('overlayShadow'),
        backdropFilter: v('overlayBackdrop'),
      },
    },
  },
  MuiPickerPopper: { styleOverrides: { paper: overlay } },
};

const buttons: Overrides = {
  MuiButton: {
    styleOverrides: {
      // Per-variant looks go in `variants`, which MUI emits as plain root
      // styles before the call site's `sx`. A nested `&:where(.MuiButton-…)`
      // rule would be emitted after `sx` at the same specificity and beat a
      // colour or shadow a page sets on purpose.
      root: {
        borderRadius: v('buttonRadius'),
        [FOCUS]: ring,
        '&.Mui-disabled': { boxShadow: 'none' },
        variants: [
          {
            props: { variant: 'contained' },
            style: {
              boxShadow: v('buttonShadow'),
              '&:hover': { boxShadow: v('buttonHoverShadow') },
              '&:active': { boxShadow: v('buttonPressedShadow') },
              '&.Mui-disabled': { boxShadow: 'none' },
            },
          },
          {
            props: { variant: 'outlined' },
            style: {
              backgroundColor: v('surfaceRaisedBg'),
              boxShadow: v('surfaceRaisedShadow'),
              '&:hover': { boxShadow: v('controlHoverShadow') },
              '&:active': { boxShadow: v('surfacePressedShadow') },
              '&.Mui-disabled': { boxShadow: 'none' },
            },
          },
          {
            props: { variant: 'text' },
            style: {
              '&:hover': { backgroundColor: v('itemHoverBg'), boxShadow: v('itemHoverShadow') },
              '&:active': { boxShadow: v('surfacePressedShadow') },
            },
          },
          {
            // Primary as text must read on the skin's surfaces; the fill keeps the preset's primary.
            props: ({ ownerState }) =>
              ownerState.color === 'primary' && ownerState.variant !== 'contained',
            style: { color: v('accentText') },
          },
        ],
      },
    },
  },
  MuiButtonGroup: {
    styleOverrides: {
      root: {
        borderRadius: v('buttonRadius'),
        '&:where(.MuiButtonGroup-contained)': { boxShadow: v('buttonShadow') },
        '& .MuiButtonGroup-grouped.MuiButton-root, & .MuiButtonGroup-grouped.MuiButton-root:hover':
          {
            boxShadow: 'none',
          },
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: v('controlRadius'),
        backgroundColor: v('controlBg'),
        boxShadow: v('controlShadow'),
        '&:hover': { backgroundColor: v('controlBg'), boxShadow: v('controlHoverShadow') },
        '&:active': { boxShadow: v('controlPressedShadow') },
        [FOCUS]: ring,
        '&.Mui-disabled': { boxShadow: 'none', backgroundColor: 'transparent' },
        ...rowIconButton,
        [`&${EMBEDDED_ICON_BUTTON}, &${EMBEDDED_ICON_BUTTON}:hover, &${EMBEDDED_ICON_BUTTON}:active`]:
          {
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        boxShadow: v('buttonShadow'),
        '&:hover': { boxShadow: v('buttonHoverShadow') },
        '&:active': { boxShadow: v('buttonPressedShadow') },
        [FOCUS]: ring,
      },
    },
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: {
        padding: 3,
        gap: 3,
        backgroundColor: v('segmentBg'),
        borderRadius: v('controlRadius'),
        boxShadow: v('segmentShadow'),
        '& .MuiToggleButtonGroup-grouped.MuiToggleButton-root': {
          margin: 0,
          border: 0,
          borderRadius: `calc(${v('controlRadius')} - 3px)`,
        },
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        borderRadius: v('controlRadius'),
        '&.Mui-selected, &.Mui-selected:hover': {
          backgroundColor: v('segmentSelectedBg'),
          boxShadow: v('segmentSelectedShadow'),
          color: v('segmentSelectedColor'),
        },
        [FOCUS]: ringInside,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      // `variants` rather than nested `&:where(…)` rules, so a tone a page
      // gives a chip in `sx` (a submission type, a role) still wins.
      root: {
        borderRadius: v('chipRadius'),
        boxShadow: v('chipShadow'),
        '&:where(.MuiChip-clickable):active': { boxShadow: v('surfacePressedShadow') },
        [FOCUS]: ring,
        variants: [
          {
            props: ({ ownerState }) =>
              ownerState.variant !== 'outlined' && (ownerState.color ?? 'default') === 'default',
            style: { backgroundColor: v('chipDefaultBg') },
          },
          { props: { variant: 'outlined' }, style: { boxShadow: 'none' } },
        ],
      },
    },
  },
  MuiLink: {
    styleOverrides: {
      // A firmer underline set a little lower, so a link reads as one at a
      // glance on the skin's softer surfaces. A link that stands on its own
      // (a record title, "Open") also takes the skin's hover tint, drawn as
      // a spread shadow so the text does not move.
      root: ({ ownerState }) => {
        const primary = ownerState.color === 'primary';
        const standalone = ownerState.underline !== 'always';
        return {
          borderRadius: 4,
          textDecorationThickness: v('linkUnderlineThickness'),
          textUnderlineOffset: v('linkUnderlineOffset'),
          [FOCUS]: ring,
          ...(primary && {
            color: v('linkColor'),
            '--Link-underlineColor': v('linkUnderline'),
            '&:visited': { color: v('linkVisitedColor') },
          }),
          '&:hover': {
            ...(primary && { color: v('linkHoverColor') }),
            ...(standalone && {
              backgroundColor: v('itemHoverBg'),
              boxShadow: `0 0 0 3px ${v('itemHoverBg')}`,
            }),
          },
        };
      },
    },
  },
  MuiBreadcrumbs: { styleOverrides: { separator: { color: v('textSecondary') } } },
  MuiPaginationItem: {
    styleOverrides: {
      root: {
        borderRadius: v('controlRadius'),
        '&:where(.MuiPaginationItem-page, .MuiPaginationItem-previousNext, .MuiPaginationItem-firstLast)':
          {
            backgroundColor: v('controlBg'),
            boxShadow: v('controlShadow'),
          },
        ...itemStates,
        [FOCUS]: ring,
      },
    },
  },
};

/** A tab inside the track: its corners follow the track's, less the track's padding. */
const TAB_RADIUS = `calc(${v('controlRadius')} - 3px)`;

const navigation: Overrides = {
  /*
   * Page tabs (All / My / Archived, the application statuses) are the same
   * track as the segmented controls: a well with the current tab raised in
   * it. The pill marks the current tab on its own, so the underline goes; a
   * scrollable row still scrolls the current tab into view and keeps its
   * arrows. The page's own divider rule under the row is dropped (a doubled
   * class, so it beats the `borderBottom` pages set in `sx`), because the
   * track replaces it.
   */
  MuiTabs: {
    styleOverrides: {
      root: {
        width: 'fit-content',
        maxWidth: '100%',
        minHeight: 0,
        padding: 3,
        borderRadius: v('controlRadius'),
        backgroundColor: v('segmentBg'),
        boxShadow: v('segmentShadow'),
        '&&': { borderBottom: 0 },
      },
      list: { gap: 3 },
      indicator: { display: 'none' },
      // A scroll arrow with nowhere to go keeps its place in the track, so
      // it shows faintly rather than leaving an unexplained gap.
      scrollButtons: { borderRadius: TAB_RADIUS, '&.Mui-disabled': { opacity: 0.3 } },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: 40,
        paddingBlock: 8,
        borderRadius: TAB_RADIUS,
        '&:hover': { backgroundColor: v('itemHoverBg') },
        '&.Mui-selected, &.Mui-selected:hover': {
          color: v('segmentSelectedColor'),
          backgroundColor: v('segmentSelectedBg'),
          boxShadow: v('segmentSelectedShadow'),
        },
        [FOCUS]: ringInside,
      },
    },
  },
  MuiStepIcon: { styleOverrides: { root: { filter: v('stepFilter') } } },
  MuiStepButton: {
    styleOverrides: { root: { borderRadius: v('controlRadius'), [FOCUS]: ring } },
  },
  MuiStepConnector: { styleOverrides: { line: { borderColor: v('gridRule') } } },
};

const fields: Overrides = {
  MuiOutlinedInput: {
    styleOverrides: {
      // A function, so it replaces the house root outright rather than merging
      // with its hover colour, which would paint over the error outline.
      root: ({ theme }) => ({
        borderRadius: v('inputRadius'),
        backgroundColor: v('inputBg'),
        boxShadow: v('inputShadow'),
        backdropFilter: v('inputBackdrop'),
        // Hover and focus darken the line, so the edge is never fainter than at rest.
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: v('focusRingColor') },
        '&.Mui-focused': { boxShadow: v('inputFocusShadow') },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: v('focusRingColor') },
        '&.Mui-error .MuiOutlinedInput-notchedOutline, &.Mui-error:hover .MuiOutlinedInput-notchedOutline':
          { borderColor: theme.palette.error.main },
        '&.Mui-disabled': { boxShadow: 'none' },
        '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.action.disabled,
        },
      }),
      input: { '&::placeholder': { color: v('textSecondary'), opacity: 1 } },
      notchedOutline: { borderColor: v('inputBorderColor') },
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      // The house label asks for `text.primary` in raw CSS, which browsers
      // ignore, leaving the focused label in the preset's primary: too faint
      // on these surfaces. The skin's readable accent instead.
      root: { '&.Mui-focused': { color: v('accentText') } },
    },
  },
  MuiPickersOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: v('inputRadius'),
        backgroundColor: v('inputBg'),
        boxShadow: v('inputShadow'),
        backdropFilter: v('inputBackdrop'),
        '&:hover:not(.Mui-error):not(.Mui-disabled) .MuiPickersOutlinedInput-notchedOutline': {
          borderColor: v('focusRingColor'),
        },
        '&.Mui-focused': { boxShadow: v('inputFocusShadow') },
        '&.Mui-focused:not(.Mui-error) .MuiPickersOutlinedInput-notchedOutline': {
          borderColor: v('focusRingColor'),
        },
      },
      notchedOutline: { borderColor: v('inputBorderColor') },
    },
  },
  MuiFilledInput: {
    styleOverrides: {
      root: {
        borderRadius: `${v('inputRadius')} ${v('inputRadius')} 0 0`,
        backgroundColor: v('inputBg'),
        boxShadow: v('inputShadow'),
        '&:hover, &.Mui-focused': { backgroundColor: v('inputBg') },
      },
    },
  },
  MuiInput: {
    styleOverrides: { underline: { '&::before': { borderBottomColor: v('inputBorderColor') } } },
  },
  MuiSwitch: {
    styleOverrides: {
      track: {
        opacity: 1,
        boxSizing: 'border-box',
        backgroundColor: v('trackBg'),
        border: `1px solid ${v('inputBorderColor')}`,
        boxShadow: v('surfaceInsetShadow'),
      },
      thumb: { boxShadow: v('controlShadow') },
      switchBase: {
        '&.Mui-checked + .MuiSwitch-track': { opacity: 0.55, borderColor: 'transparent' },
        '&.Mui-focusVisible .MuiSwitch-thumb': ring,
      },
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        '&:not(.Mui-checked):not(.MuiCheckbox-indeterminate) .iaa-control-box': {
          borderColor: v('inputBorderColor'),
          backgroundColor: v('inputBg'),
          boxShadow: v('inputShadow'),
        },
        '&:hover:not(.Mui-checked):not(.MuiCheckbox-indeterminate) .iaa-control-box': {
          borderColor: v('focusRingColor'),
        },
        '&.Mui-checked .iaa-control-box, &.MuiCheckbox-indeterminate .iaa-control-box': {
          boxShadow: v('controlShadow'),
        },
        [FOCUS]: ringInside,
      },
    },
  },
  MuiRadio: {
    styleOverrides: {
      root: {
        '&:not(.Mui-checked) .iaa-control-box': {
          borderColor: v('inputBorderColor'),
          backgroundColor: v('inputBg'),
          boxShadow: v('inputShadow'),
        },
        '&:hover:not(.Mui-checked) .iaa-control-box': { borderColor: v('focusRingColor') },
        [FOCUS]: ringInside,
      },
    },
  },
  MuiSlider: {
    styleOverrides: {
      rail: { opacity: 1, backgroundColor: v('trackBg'), boxShadow: v('surfaceInsetShadow') },
      thumb: {
        boxShadow: v('controlShadow'),
        '&:hover': { boxShadow: v('controlHoverShadow') },
        '&.Mui-focusVisible': { boxShadow: v('controlHoverShadow'), ...ring },
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 999,
        backgroundColor: v('trackBg'),
        boxShadow: v('surfaceInsetShadow'),
      },
      bar: { borderRadius: 999 },
    },
  },
};

const data: Overrides = {
  MuiTableHead: { styleOverrides: { root: { backgroundColor: v('gridHeaderBg') } } },
  MuiTableCell: { styleOverrides: { root: { borderBottomColor: v('gridRule') } } },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&.MuiTableRow-hover:hover': { backgroundColor: v('gridRowHover') },
        '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: v('gridRowSelected') },
      },
    },
  },
  MuiDataGrid: {
    styleOverrides: {
      root: {
        '--DataGrid-rowBorderColor': v('gridRule'),
        borderColor: v('surfaceBorderColor'),
        '& .MuiDataGrid-columnHeaders': { backgroundColor: v('gridHeaderBg') },
        '& .MuiDataGrid-row:hover': { backgroundColor: v('gridRowHover') },
        '& .MuiDataGrid-row.Mui-selected': { backgroundColor: v('gridRowSelected') },
        '& .MuiDataGrid-footerContainer': { backgroundColor: v('gridFooterBg') },
        '& .MuiDataGrid-cell:focus-visible, & .MuiDataGrid-columnHeader:focus-visible': ringInside,
      },
    },
  },
  MuiPickerDay: {
    styleOverrides: {
      root: {
        borderRadius: v('controlRadius'),
        '&:hover': { backgroundColor: v('itemHoverBg'), boxShadow: v('itemHoverShadow') },
        '&.Mui-selected': { boxShadow: v('buttonShadow') },
        '&.MuiPickerDay-today:not(.Mui-selected)': { borderColor: v('accentText') },
        [FOCUS]: ring,
      },
    },
  },
};

/**
 * Clay presses: a button sinks two pixels when pushed and rises one under the
 * pointer, and its corners are pills. The movement is dropped under reduced
 * motion; the shadow change alone still shows the press.
 */
const clayExtras: Overrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        minHeight: 42,
        fontWeight: 700,
        '&:where(.MuiButton-contained, .MuiButton-outlined):hover': {
          transform: 'translateY(-1px)',
        },
        '&:active': { transform: 'translateY(2px)' },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover, &:active': { transform: 'none' },
        },
      },
    },
  },
  MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
};

/**
 * Glass dims and blurs what is behind a dialog, so the frosted panel reads as
 * in front. A switch that is off has a white thumb on white glass, so the
 * thumb carries the field line (3:1) that the other skins get from depth.
 */
const glassExtras: Overrides = {
  MuiBackdrop: {
    styleOverrides: {
      root: { '&:not(.MuiBackdrop-invisible)': { backdropFilter: 'blur(6px) saturate(120%)' } },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: {
        '& .MuiSwitch-switchBase:not(.Mui-checked) .MuiSwitch-thumb': {
          boxShadow: `inset 0 0 0 1px ${v('inputBorderColor')}, ${v('controlShadow')}`,
        },
      },
    },
  },
};

/** Neumorphism never lifts on hover: the only motion is the press into the canvas. */
const neumorphismExtras: Overrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        '&:where(.MuiButton-contained):active, &:where(.MuiButton-outlined):active': {
          transform: 'none',
        },
      },
    },
  },
};

const EXTRAS: Record<Exclude<SkinKey, 'classic'>, Overrides> = {
  neumorphism: neumorphismExtras,
  glassmorphism: glassExtras,
  claymorphism: clayExtras,
};

/** Every override a non-Classic skin lays over the house theme. */
export const skinComponents = (skin: Exclude<SkinKey, 'classic'>): Overrides =>
  [surfaces, overlays, buttons, navigation, fields, data, EXTRAS[skin]].reduce<Overrides>(
    (all, part) => deepmerge(all, part),
    {},
  );

import type { UserRole } from '@iaa/shared';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { alpha, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { SystemStyleObject } from '@mui/system';
import { useId, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { mix } from '../../theme/colour';
import { skinned, surfaceSx, tokenVar } from '../../theme/surfaces';
import { useTour } from '../tour';

import { panelHeaderSx, pillActionSkin, topBarActionOpenSkin } from './top-bar-action';

/** A style object `skinned()` accepts (never `null`). */
type Sx = NonNullable<SystemStyleObject<Theme>>;

const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** The role as the chip and the menu's header say it (drawn in capitals). */
const ROLE_LABELS: Record<UserRole, string> = { admin: 'Admin', editor: 'Editor' };

interface NavItem {
  label: string;
  description: string;
  to: string;
  icon: JSX.Element;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Profile',
    description: 'View your account details.',
    to: '/account/profile',
    icon: <PersonOutlineIcon fontSize="small" />,
  },
  {
    label: 'Edit Profile',
    description: 'Update your personal details.',
    to: '/account/edit',
    icon: <ManageAccountsIcon fontSize="small" />,
  },
  {
    label: 'Update Password',
    description: 'Choose a new password.',
    to: '/account/password',
    icon: <LockResetIcon fontSize="small" />,
  },
  {
    label: 'Settings',
    description: 'Manage your preferences.',
    to: '/account/settings',
    icon: <SettingsIcon fontSize="small" />,
  },
];

const HELPER_ITEMS: readonly NavItem[] = [
  {
    label: 'Show me around',
    description: 'Take a quick dashboard tour.',
    to: '#tour',
    icon: <ExploreOutlinedIcon fontSize="small" />,
  },
  {
    label: 'User guide',
    description: 'Learn how the dashboard works.',
    to: '/account/user-guide',
    icon: <HelpOutlineOutlinedIcon fontSize="small" />,
  },
];

const menuTextSlotProps = {
  primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } },
  secondary: {
    noWrap: true,
    sx: { mt: 0.25, fontSize: '0.75rem', lineHeight: 1.4, color: 'text.secondary' },
  },
};

/** The theme picker's tints (its `${primary}12` and `18`) as alphas, so any colour format works. */
const TINT = { rest: 0x12 / 0xff, hover: 0x18 / 0xff } as const;
const tint = (amount: number) => (t: Theme) => alpha(t.palette.primary.main, amount);

/**
 * The chip's primary hairline: faint under the pointer, firmer while open, so
 * rest, hover and open read as three steps. Dark mode's brighter primary needs
 * less to read the same.
 */
const edge =
  (light: number, dark: number) =>
  (t: Theme): string =>
    alpha(t.palette.primary.main, t.palette.mode === 'dark' ? dark : light);
const hoverEdge = edge(0.28, 0.2);
const openEdge = edge(0.5, 0.35);

const noMotion = { '@media (prefers-reduced-motion: reduce)': { transition: 'none' } };

/**
 * The person's initials on a faint primary disc: the way people appear across
 * the console (the Users list, task assignees), rather than a solid mint coin.
 */
const avatarSx = (size: number, fontSize: string): Sx => ({
  width: size,
  height: size,
  flexShrink: 0,
  fontSize,
  fontWeight: 700,
  color: 'text.primary',
  bgcolor: tint(0.16),
});

/** The role as the console writes a label: small, uppercase, tracked, secondary. */
const roleLabelSx: Sx = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  lineHeight: 1.3,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

/**
 * In the chip, a skin deepens the role a little: a raised control's inner
 * shade (Clay's especially) darkens the lower half, where the role sits.
 */
const chipRoleSx = skinned(roleLabelSx, {
  color: (t) => mix(t.palette.text.secondary, t.palette.text.primary, 0.2),
});

/**
 * The name's widest: 128px, which keeps a long-named chip near 200px. Below
 * 640px that would squeeze the bar's title until its caption took a third
 * line and the bar grew taller (first in a skin, whose controls are larger),
 * so there the name keeps 98px, which still shows "Stanley Hayford" whole.
 */
const nameWidthSx: Sx = { maxWidth: 98, '@media (min-width: 640px)': { maxWidth: 128 } };

/**
 * The name on one line (`noWrap`), cut at a character with an ellipsis, as the
 * menu's header and the Users list cut names, so a long name fills the line
 * before it is cut. A line that cannot break also keeps the chip at its full
 * width in a tight bar, where the title gives way instead.
 * `useEllipsisAfterWord` keeps the ellipsis off a space or a hyphen.
 */
const nameSx: Sx = {
  width: '100%',
  fontSize: '0.8125rem',
  fontWeight: 600,
  lineHeight: 1.25,
  color: 'text.primary',
};

const ELLIPSIS = '\u2026';

/** What an ellipsis should not follow: spaces, commas, dashes and (last in the set) hyphens. */
const DANGLING = /[\s,\u2010-\u2015-]+$/u;

/**
 * `text-overflow: ellipsis` cuts after the last character that fits with the
 * ellipsis, so it can leave "Osimpo …" or "Asante-…". Given the line's width,
 * the width of each start of the text (`upTo(end)`) and of the ellipsis,
 * returns the end padding that moves such a cut back to the end of the word;
 * 0 when the text fits or the cut falls inside a word.
 */
export const padBeforeEllipsis = (
  text: string,
  width: number,
  upTo: (end: number) => number,
  ellipsis: number,
): number => {
  if (upTo(text.length) <= width + 0.5) return 0;
  const room = width - ellipsis;
  let fit = 0;
  let over = text.length;
  while (over - fit > 1) {
    const middle = Math.floor((fit + over) / 2);
    if (upTo(middle) <= room) fit = middle;
    else over = middle;
  }
  const kept = text.slice(0, fit).replace(DANGLING, '').length;
  if (kept === 0 || kept === fit) return 0;
  // Room for the word and the ellipsis and 1px, less than a space or a hyphen.
  return Math.max(0, room - upTo(kept) - 1);
};

/**
 * The name's end padding, from the name as laid out. The measuring is done
 * with the ellipsis switched off, since Safari gives no width to the text an
 * ellipsis hides; nothing is painted in between.
 */
const namePad = (element: HTMLElement): number => {
  const text = element.firstChild;
  // None when the whole name shows, or nothing is laid out (on a phone, in tests).
  if (!(text instanceof Text) || element.scrollWidth <= element.clientWidth) return 0;
  const { width } = element.getBoundingClientRect();
  const range = document.createRange();
  const widthOf = (node: Text, end: number): number => {
    range.setStart(node, 0);
    range.setEnd(node, end);
    return range.getBoundingClientRect().width;
  };
  element.style.textOverflow = 'clip';
  const tail = element.appendChild(document.createTextNode(ELLIPSIS));
  try {
    return padBeforeEllipsis(text.data, width, (end) => widthOf(text, end), widthOf(tail, 1));
  } finally {
    tail.remove();
    element.style.textOverflow = '';
  }
};

/**
 * Keeps the name's ellipsis after a whole word or a letter, never a space or
 * a hyphen: pads the end of the line when the cut would leave one. Measures
 * again when the line's width changes (a breakpoint, the text size) and once
 * a font has loaded, since the brand face swaps in after the first paint.
 */
const useEllipsisAfterWord = (text: string) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [pad, setPad] = useState(0);
  // `text` is read from the element; it is a dependency so a new name is measured.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const update = (): void => setPad(namePad(element));
    update();
    const fonts = 'fonts' in document ? document.fonts : undefined;
    fonts?.addEventListener('loadingdone', update);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : undefined;
    observer?.observe(element, { box: 'border-box' });
    return () => {
      fonts?.removeEventListener('loadingdone', update);
      observer?.disconnect();
    };
  }, [text]);
  return { ref, pad };
};

/**
 * The role in the menu's header, as a small tag cut from the chip's material:
 * Classic's hairline and faint tint; a skin's own neutral chip. Its text is
 * body text, which keeps 4.5:1 on either.
 */
const roleTagSx = skinned(
  {
    ...roleLabelSx,
    mt: 0.75,
    height: 20,
    color: 'text.primary',
    borderRadius: '6px',
    border: (t) => `1px solid ${t.palette.divider}`,
    bgcolor: tint(TINT.rest),
    '& .MuiChip-label': { px: '7px' },
  },
  { border: 'none', bgcolor: tokenVar('chipDefaultBg'), borderRadius: tokenVar('chipRadius') },
);

/** At rest, the picker's material; on a phone, where only the initials show, bare like the bell. */
const restSx: Sx = {
  bgcolor: (t) => ({ xs: 'transparent', sm: alpha(t.palette.primary.main, TINT.rest) }),
  borderColor: { xs: 'transparent', sm: 'divider' },
};

/** Open, the tint stays deep and the hairline turns primary, so open never reads as hover. */
const openSx: Sx = { color: 'text.primary', bgcolor: tint(TINT.hover), borderColor: openEdge };

/**
 * The chip is one of the top bar's actions, so it is made like the theme
 * picker: the control radius, a hairline and the picker's tint, deeper under
 * the pointer, where the hairline takes a faint primary. It is as tall as New
 * task and the bell (40px), not a third height, and grows only if the text is
 * set larger. It keeps its width in a tight bar: the title gives way first.
 * On a phone it is the initials alone, the size of the theme squares, boxed
 * once used; being open shows there too, with no chevron. Focus draws the
 * bar's icon-button ring. `textAlign` is set because a <button> centres its
 * text, which pulled the role off the name's edge. No theme override reaches
 * a ButtonBase, so a skin gives it the whole raised-control recipe at the
 * height of its raised bell (42px), pressed in while the menu is open.
 */
const chipSx = (open: boolean): ReturnType<typeof skinned> =>
  skinned(
    {
      minHeight: 40,
      flexShrink: 0,
      gap: 1,
      pl: '3px',
      pr: { xs: '3px', sm: 0.5 },
      justifyContent: 'flex-start',
      textAlign: 'left',
      borderRadius: tokenVar('controlRadius'),
      border: '1px solid',
      color: 'text.secondary',
      ...(open ? openSx : restSx),
      transition: (t) => t.transitions.create(['background-color', 'border-color', 'color']),
      '&:hover': {
        color: 'text.primary',
        bgcolor: tint(TINT.hover),
        borderColor: open ? openEdge : hoverEdge,
      },
      '&:focus-visible': {
        outline: (t) => `2px solid ${t.palette.text.primary}`,
        outlineOffset: 2,
      },
      ...noMotion,
    },
    {
      ...pillActionSkin,
      ...(open && topBarActionOpenSkin),
      minHeight: 42,
      pl: '4px',
      pr: { xs: '4px', sm: 0.5 },
      transition: (t) => t.transitions.create(['background-color', 'box-shadow']),
    },
  );

interface ChipProps {
  name: string;
  role?: UserRole;
  open: boolean;
  onOpen: (event: MouseEvent<HTMLElement>) => void;
}

/**
 * Initials, name and role, and a chevron that turns while the menu is open;
 * spans only, as a <button> holds phrasing content. The accessible name stays
 * "Account menu" and the name and role describe it, so a screen reader also
 * hears who is signed in.
 */
const AccountChip = ({ name, role, open, onOpen }: ChipProps): JSX.Element => {
  const id = useId();
  const { ref: nameRef, pad } = useEllipsisAfterWord(name);
  return (
    <ButtonBase
      id="admin-user-menu"
      onClick={onOpen}
      aria-label="Account menu"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-describedby={role ? `${id}-name ${id}-role` : `${id}-name`}
      sx={chipSx(open)}
    >
      {/* Flat while the chip is pressed in, so a skin never stacks two depths. */}
      <Avatar
        component="span"
        aria-hidden
        sx={[avatarSx(32, '0.75rem'), open && { boxShadow: 'none' }]}
      >
        {initials(name)}
      </Avatar>
      <Box
        component="span"
        sx={{
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          alignItems: 'flex-start',
          minWidth: 0,
          ...nameWidthSx,
        }}
      >
        <Typography
          ref={nameRef}
          id={`${id}-name`}
          component="span"
          noWrap
          sx={nameSx}
          style={pad ? { paddingInlineEnd: pad } : undefined}
        >
          {name}
        </Typography>
        {role && (
          <Typography id={`${id}-role`} component="span" noWrap sx={chipRoleSx}>
            {ROLE_LABELS[role]}
          </Typography>
        )}
      </Box>
      <KeyboardArrowDownRoundedIcon
        sx={{
          display: { xs: 'none', sm: 'block' },
          flexShrink: 0,
          ml: -0.5,
          fontSize: 18,
          transition: (t) => t.transitions.create('transform'),
          transform: open ? 'rotate(180deg)' : 'none',
          ...noMotion,
        }}
      />
    </ButtonBase>
  );
};

interface HeaderProps {
  name: string;
  email?: string;
  role?: UserRole;
}

/** The menu's header: the chip's disc, larger, with the name, email and role. */
const MenuHeader = ({ name, email, role }: HeaderProps): JSX.Element => (
  <Box sx={[{ px: 2, py: 1.75, display: 'flex', gap: 1.5, alignItems: 'center' }, panelHeaderSx]}>
    <Avatar sx={avatarSx(44, '1rem')}>{initials(name)}</Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
        {name}
      </Typography>
      {email && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {email}
        </Typography>
      )}
      {role && <Chip size="small" label={ROLE_LABELS[role]} sx={roleTagSx} />}
    </Box>
  </Box>
);

/**
 * The account chip that ends the top bar, and the account menu it opens. The
 * chip shows the person's initials on a faint disc, their name and role, and
 * a chevron, in the theme picker's material at the height of the bar's other
 * actions; on a phone, the initials alone.
 */
export const UserMenu = (): JSX.Element => {
  const { user, logout } = useAuth();
  const { start: startTour } = useTour();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const name = user?.name ?? 'Account';
  const role = user?.role;

  const go = (to: string): void => {
    setAnchorEl(null);
    navigate(to);
  };

  return (
    <>
      <AccountChip
        name={name}
        role={role}
        open={open}
        onOpen={(event) => setAnchorEl(event.currentTarget)}
      />

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: 1.25,
              width: 320,
              maxWidth: 'calc(100vw - 32px)',
              ...surfaceSx.overlay,
              overflowX: 'hidden',
              overflowY: 'auto',
            },
          },
        }}
      >
        <MenuHeader name={name} email={user?.email} role={role} />

        <Divider />

        <Box sx={{ py: 0.5 }}>
          {NAV_ITEMS.map((item) => (
            <MenuItem
              key={item.to}
              onClick={() => go(item.to)}
              sx={{ py: 0.9, mx: 0.75, borderRadius: 1.5 }}
            >
              <ListItemIcon sx={{ color: 'text.secondary', minWidth: 34 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.description}
                slotProps={menuTextSlotProps}
                sx={{ minWidth: 0 }}
              />
            </MenuItem>
          ))}
        </Box>

        <Divider />

        <Box sx={{ py: 0.5 }}>
          {HELPER_ITEMS.map((item) => (
            <MenuItem
              key={item.to}
              onClick={() => {
                setAnchorEl(null);
                if (item.to === '#tour') {
                  startTour();
                } else {
                  navigate(item.to);
                }
              }}
              sx={{ py: 0.9, mx: 0.75, borderRadius: 1.5 }}
            >
              <ListItemIcon sx={{ color: 'text.secondary', minWidth: 34 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.description}
                slotProps={menuTextSlotProps}
                sx={{ minWidth: 0 }}
              />
            </MenuItem>
          ))}
        </Box>

        <Divider />

        <Box sx={{ py: 0.5 }}>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              logout();
            }}
            sx={{
              py: 0.9,
              mx: 0.75,
              borderRadius: 1.5,
              color: 'error.main',
              '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.08) },
            }}
          >
            <ListItemIcon sx={{ color: 'error.main', minWidth: 34 }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Log out"
              secondary="Sign out of your account."
              slotProps={{
                ...menuTextSlotProps,
                primary: { sx: { fontSize: '0.875rem', fontWeight: 700 } },
              }}
              sx={{ minWidth: 0 }}
            />
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
};

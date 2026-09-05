import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
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
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useTour } from '../tour';

const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

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

/** Account pill (avatar + name + role + chevron) with a refined account dropdown. */
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
      <ButtonBase
        id="admin-user-menu"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        sx={{
          gap: 1,
          pl: 0.5,
          pr: { xs: 0.5, sm: 1 },
          py: 0.5,
          borderRadius: 999,
          border: 1,
          borderColor: open ? 'primary.main' : 'divider',
          bgcolor: open ? (t) => alpha(t.palette.primary.main, 0.06) : 'transparent',
          transition: (t) => t.transitions.create(['background-color', 'border-color']),
          '&:hover': {
            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
            borderColor: 'primary.light',
          },
          '&:focus-visible': {
            outline: (t) => `2px solid ${t.palette.primary.main}`,
            outlineOffset: 2,
          },
        }}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          {initials(name)}
        </Avatar>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            alignItems: 'flex-start',
            lineHeight: 1.1,
            minWidth: 0,
            maxWidth: 168,
          }}
        >
          <Typography
            noWrap
            sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary', width: '100%' }}
          >
            {name}
          </Typography>
          {role && (
            <Typography
              noWrap
              sx={{
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                width: '100%',
              }}
            >
              {role}
            </Typography>
          )}
        </Box>
        <KeyboardArrowDownIcon
          fontSize="small"
          sx={{
            color: 'text.secondary',
            display: { xs: 'none', sm: 'block' },
            transition: (t) => t.transitions.create('transform'),
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </ButtonBase>

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
              borderRadius: 2.5,
              border: 1,
              borderColor: 'divider',
              overflowX: 'hidden',
              overflowY: 'auto',
              boxShadow: '0 12px 32px rgba(26, 92, 56, 0.14)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.75,
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            background: (t) =>
              `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)}, ${alpha(
                t.palette.primary.main,
                0,
              )})`,
          }}
        >
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: '1rem',
              fontWeight: 700,
            }}
          >
            {initials(name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
              {name}
            </Typography>
            {user?.email && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {user.email}
              </Typography>
            )}
            {role && (
              <Chip
                size="small"
                label={role}
                color="secondary"
                sx={{
                  mt: 0.5,
                  height: 19,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              />
            )}
          </Box>
        </Box>

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

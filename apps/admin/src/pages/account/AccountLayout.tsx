import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import HelpCenterRoundedIcon from '@mui/icons-material/HelpCenterRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';

const ACCOUNT_LINKS = [
  { to: '/account/profile', label: 'Profile', icon: <PersonRoundedIcon /> },
  { to: '/account/edit', label: 'Edit profile', icon: <ManageAccountsRoundedIcon /> },
  { to: '/account/password', label: 'Security', icon: <LockResetRoundedIcon /> },
  { to: '/account/mfa', label: 'Two-factor auth', icon: <VerifiedUserRoundedIcon /> },
  { to: '/account/notifications', label: 'Notifications', icon: <NotificationsRoundedIcon /> },
  { to: '/account/settings', label: 'Settings', icon: <SettingsRoundedIcon /> },
  { to: '/account/user-guide', label: 'User guide', icon: <HelpCenterRoundedIcon /> },
] as const;

const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

const formatRole = (role: string): string =>
  role
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

/** Shared identity banner and local navigation for every account page. */
const AccountLayout = (): JSX.Element => {
  const { user } = useAuth();

  return (
    <Box>
      <Box
        component="header"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          mb: 3,
          p: { xs: 3, sm: 4 },
          borderRadius: 3.5,
          bgcolor: 'primary.dark',
          color: 'common.white',
          background:
            'radial-gradient(circle at 82% 12%, alpha(brandColors.gold, 0.19), transparent 26%), linear-gradient(145deg, brandColors.forest, brandColors.deepForest)',
          '&::after': {
            position: 'absolute',
            right: -100,
            bottom: -180,
            width: 350,
            height: 350,
            border: '1px solid alpha(brandColors.gold, 0.16)',
            borderRadius: '50%',
            boxShadow: '0 0 0 46px alpha(brandColors.gold, 0.025)',
            content: '""',
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={3}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Stack direction="row" spacing={2.25} alignItems="center">
            <Avatar
              sx={{
                width: { xs: 64, sm: 76 },
                height: { xs: 64, sm: 76 },
                border: '3px solid rgba(255,255,255,0.16)',
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                fontSize: '1.45rem',
                fontWeight: 800,
              }}
            >
              {initials(user?.name ?? '')}
            </Avatar>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <BadgeRoundedIcon sx={{ color: 'secondary.light', fontSize: 18 }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'secondary.light', fontWeight: 750, letterSpacing: 1.4 }}
                >
                  Account workspace
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 0.25, color: 'common.white' }}>
                {user?.name ?? 'Console account'}
              </Typography>
              <Typography sx={{ mt: 0.35, color: 'rgba(255,255,255,0.64)', fontSize: '0.88rem' }}>
                {user?.email}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
            <Chip
              size="small"
              label={formatRole(user?.role ?? 'member')}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'common.white' }}
            />
            <Chip
              size="small"
              label={user?.isActive ? 'Active account' : 'Inactive account'}
              sx={{
                bgcolor: user?.isActive ? 'rgba(70,180,112,0.18)' : 'rgba(255,255,255,0.1)',
                color: user?.isActive ? '#B8F0CC' : 'common.white',
              }}
            />
          </Stack>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '220px minmax(0, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Box
          component="nav"
          aria-label="Account navigation"
          sx={{
            display: { xs: 'flex', lg: 'grid' },
            gap: 0.75,
            overflowX: { xs: 'auto', lg: 'visible' },
            p: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {ACCOUNT_LINKS.map((link) => (
            <Box
              key={link.to}
              component={NavLink}
              to={link.to}
              sx={{
                display: 'flex',
                minWidth: { xs: 'max-content', lg: 0 },
                minHeight: 44,
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                borderRadius: 2,
                color: 'text.secondary',
                fontSize: '0.85rem',
                fontWeight: 650,
                textDecoration: 'none',
                transition: 'background-color 160ms ease, color 160ms ease',
                '& svg': { fontSize: 20 },
                '&:hover': { bgcolor: 'alpha(brandColors.forest, 0.06)', color: 'text.primary' },
                '&.active': {
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  boxShadow: '0 9px 20px -14px rgba(18,63,41,0.85)',
                },
              }}
            >
              {link.icon}
              {link.label}
            </Box>
          ))}
        </Box>

        <Box component="section" sx={{ minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AccountLayout;

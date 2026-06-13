import type { PublicUser } from '@iaa/shared';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { AccountPanel, AccountSectionHeader } from '../../components/account/AccountSurface';

const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

const formatDate = (iso?: string): string =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not available';

const formatRole = (role?: string): string =>
  role
    ? role
        .split('-')
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ')
    : 'Member';

const activeChipSx = (active: boolean) => ({
  bgcolor: active ? 'rgba(70,180,112,0.18)' : 'rgba(255,255,255,0.1)',
  color: active ? '#B8F0CC' : 'common.white',
  '& .MuiChip-icon': { color: active ? '#B8F0CC' : 'rgba(255,255,255,0.78)' },
});

const identityModel = (user: PublicUser | null) => {
  const name = user?.name ?? 'Console member';
  const active = user?.isActive ?? false;
  return {
    name,
    email: user?.email ?? '',
    initials: initials(name),
    role: formatRole(user?.role),
    activeLabel: active ? 'Verified active account' : 'Inactive account',
    activeSx: activeChipSx(active),
    memberSince: formatDate(user?.createdAt),
    updatedAt: formatDate(user?.updatedAt),
  };
};

const DetailItem = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}): JSX.Element => (
  <Stack
    direction="row"
    spacing={1.5}
    alignItems="center"
    sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}
  >
    <Box
      sx={{
        display: 'grid',
        width: 38,
        height: 38,
        flexShrink: 0,
        placeItems: 'center',
        borderRadius: 1.75,
        bgcolor: 'rgba(26,92,56,0.07)',
        color: 'primary.main',
        '& svg': { fontSize: 20 },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', fontWeight: 650 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.2, fontWeight: 700, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Box>
  </Stack>
);

const IdentityCard = ({ user }: { user: PublicUser | null }): JSX.Element => {
  const model = identityModel(user);

  return (
    <AccountPanel>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3, sm: 4 },
          bgcolor: 'primary.main',
          color: 'common.white',
          '&::after': {
            position: 'absolute',
            right: -80,
            bottom: -130,
            width: 260,
            height: 260,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%',
            content: '""',
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2.5}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Avatar
            sx={{
              width: 82,
              height: 82,
              border: '3px solid rgba(255,255,255,0.2)',
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              fontSize: '1.65rem',
              fontWeight: 800,
            }}
          >
            {model.initials}
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ color: 'common.white', fontSize: '1.8rem' }}>
              {model.name}
            </Typography>
            <Typography sx={{ mt: 0.4, color: 'rgba(255,255,255,0.68)' }}>{model.email}</Typography>
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
              <Chip
                size="small"
                label={model.role}
                sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}
              />
              <Chip
                size="small"
                label={model.activeLabel}
                icon={<VerifiedUserRoundedIcon />}
                sx={model.activeSx}
              />
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DetailItem icon={<PersonRoundedIcon />} label="Full name" value={model.name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DetailItem
              icon={<AlternateEmailRoundedIcon />}
              label="Email address"
              value={model.email || '—'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DetailItem
              icon={<CalendarMonthRoundedIcon />}
              label="Member since"
              value={model.memberSince}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DetailItem
              icon={<ManageAccountsRoundedIcon />}
              label="Profile updated"
              value={model.updatedAt}
            />
          </Grid>
        </Grid>
      </Box>
    </AccountPanel>
  );
};

const QuickAction = ({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
}): JSX.Element => (
  <Box
    component={RouterLink}
    to={to}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      p: 2,
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      color: 'text.primary',
      textDecoration: 'none',
      transition: 'background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
      '&:hover': {
        borderColor: 'rgba(26,92,56,0.3)',
        bgcolor: 'rgba(26,92,56,0.035)',
        transform: 'translateX(3px)',
      },
    }}
  >
    <Box
      sx={{
        display: 'grid',
        width: 42,
        height: 42,
        flexShrink: 0,
        placeItems: 'center',
        borderRadius: 2,
        bgcolor: 'rgba(26,92,56,0.08)',
        color: 'primary.main',
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 750 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
    <EastRoundedIcon sx={{ color: 'text.disabled', fontSize: 19 }} />
  </Box>
);

const Profile = (): JSX.Element => {
  const { user } = useAuth();

  return (
    <>
      <AccountSectionHeader
        icon={<PersonRoundedIcon />}
        title="Profile overview"
        description="Review your identity, access status, and account history."
        action={
          <Button
            component={RouterLink}
            to="/account/edit"
            variant="contained"
            startIcon={<ManageAccountsRoundedIcon />}
          >
            Edit profile
          </Button>
        }
      />

      <Grid container spacing={3} alignItems="stretch">
        <Grid size={{ xs: 12, xl: 8 }}>
          <IdentityCard user={user} />
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <AccountPanel sx={{ height: '100%', p: 3 }}>
            <Typography variant="h6">Quick account actions</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
              Keep your identity current and your console access protected.
            </Typography>
            <Stack spacing={1.25}>
              <QuickAction
                to="/account/edit"
                icon={<ManageAccountsRoundedIcon />}
                title="Update personal details"
                description="Change your name or email address."
              />
              <QuickAction
                to="/account/password"
                icon={<LockResetRoundedIcon />}
                title="Strengthen account security"
                description="Set a new console password."
              />
            </Stack>
          </AccountPanel>
        </Grid>
      </Grid>
    </>
  );
};

export default Profile;

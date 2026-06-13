import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { AccountPanel, AccountSectionHeader } from '../../components/account/AccountSurface';
import { usePreferences } from '../../lib/preferences';

const PreferenceRow = ({
  icon,
  title,
  description,
  control,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  control: JSX.Element;
}): JSX.Element => (
  <Stack
    direction="row"
    spacing={2}
    alignItems="center"
    justifyContent="space-between"
    sx={{
      p: 2,
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      bgcolor: 'background.paper',
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
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
          '& svg': { fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 750 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
    {control}
  </Stack>
);

const AccountShortcut = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: ReactNode;
  label: string;
}): JSX.Element => (
  <Button
    component={RouterLink}
    to={to}
    variant="outlined"
    startIcon={icon}
    sx={{ justifyContent: 'flex-start' }}
  >
    {label}
  </Button>
);

const Settings = (): JSX.Element => {
  const { prefs, setPreference } = usePreferences();

  return (
    <>
      <AccountSectionHeader
        icon={<SettingsRoundedIcon />}
        title="Settings"
        description="Personalise how this admin console behaves on your device."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <AccountPanel sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography variant="h6">Workspace preferences</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
              These settings are saved locally for this browser.
            </Typography>
            <Stack spacing={1.5}>
              <PreferenceRow
                icon={<ViewSidebarRoundedIcon />}
                title="Collapse sidebar by default"
                description="Start with the sidebar shown as a compact icon rail."
                control={
                  <Switch
                    checked={prefs.sidebarCollapsed}
                    onChange={(event) => setPreference('sidebarCollapsed', event.target.checked)}
                    inputProps={{ 'aria-label': 'Collapse sidebar by default' }}
                  />
                }
              />
              <PreferenceRow
                icon={<NotificationsRoundedIcon />}
                title="Show notification badge"
                description="Display unread submission counts in the top bar."
                control={
                  <Switch
                    checked={prefs.showNotificationBadge}
                    onChange={(event) =>
                      setPreference('showNotificationBadge', event.target.checked)
                    }
                    inputProps={{ 'aria-label': 'Show notification badge' }}
                  />
                }
              />
            </Stack>
          </AccountPanel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <AccountPanel sx={{ height: '100%', p: 3 }}>
            <Typography variant="h6">Account shortcuts</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
              Jump to the places where your account identity and security are managed.
            </Typography>
            <Stack spacing={1.25}>
              <AccountShortcut
                to="/account/edit"
                icon={<ManageAccountsRoundedIcon />}
                label="Edit profile"
              />
              <AccountShortcut
                to="/account/password"
                icon={<LockResetRoundedIcon />}
                label="Update password"
              />
            </Stack>
          </AccountPanel>
        </Grid>
      </Grid>
    </>
  );
};

export default Settings;

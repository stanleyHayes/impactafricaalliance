import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { alpha, type Theme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useEffect, type ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';
import { AccountPanel, AccountSectionHeader } from '../../components/account/AccountSurface';
import { ModePicker, PalettePicker, SkinPicker } from '../../components/theme/AppearancePickers';
import { usePreferences } from '../../lib/preferences';
import { revealModeChange } from '../../theme/mode-reveal';
import { skinned, surfaceSx } from '../../theme/surfaces';
import { useThemeSettings, type ColorMode } from '../../theme/ThemeContext';

/**
 * An icon square. Classic tints it with the primary; a skin makes it one of
 * its icon tiles (raised, frosted or clay), as every other icon holder is.
 */
const iconTileSx = (fill: number) =>
  skinned({ bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, fill) }, surfaceSx.tile);

/**
 * A bordered paper box inside an account panel. Classic draws it as a small
 * card; a skin sets it into the panel as one of its wells, so it does not read
 * as a card stacked on a card.
 */
const panelWellSx = skinned(
  { border: 1, borderColor: 'divider', bgcolor: 'background.paper' },
  surfaceSx.inset,
);

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
    sx={[{ p: 2, borderRadius: 2 }, panelWellSx]}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={[
          {
            display: 'grid',
            width: 42,
            height: 42,
            flexShrink: 0,
            placeItems: 'center',
            borderRadius: 2,
            color: 'text.primary',
            '& svg': { fontSize: 22 },
          },
          iconTileSx(0.08),
        ]}
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

/** One group of the Appearance panel: its name and what it changes, above its picker. */
const AppearanceGroup = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}): JSX.Element => (
  <Box>
    <Typography variant="body2" sx={{ fontWeight: 750 }}>
      {title}
    </Typography>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', mt: 0.25, mb: 1.5 }}
    >
      {description}
    </Typography>
    {children}
  </Box>
);

/**
 * The console's look, chosen on the page: the top bar's pickers laid out
 * wider. Both read and set the same theme settings, so each always shows what
 * the other chose. A choice applies at once, as in the popover; a new mode
 * grows out of the card that was chosen, as it does from the top bar's toggle.
 */
const AppearancePanel = (): JSX.Element => {
  const { preset, setPreset, mode, setMode, skin, setSkin } = useThemeSettings();

  const chooseMode = (next: ColorMode, origin: HTMLElement): void => {
    if (next !== mode) revealModeChange(origin, () => setMode(next));
  };

  return (
    // Clear of the fixed top bar when a link opens the page here.
    <AccountPanel id="appearance" sx={{ p: { xs: 2.5, sm: 3 }, scrollMarginTop: '88px' }}>
      <Typography variant="h6">Appearance</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
        Choices apply straight away, and only for you on this browser. The website is not affected.
      </Typography>
      <AppearanceGroup title="Mode" description="Light or dark, for the whole console.">
        <ModePicker preset={preset} mode={mode} onSelect={chooseMode} />
      </AppearanceGroup>
      <Divider sx={{ my: 2.5 }} />
      <AppearanceGroup
        title="Theme"
        description="The console's colours, previewed in the mode you are using."
      >
        <PalettePicker layout="page" preset={preset} mode={mode} onSelect={setPreset} />
      </AppearanceGroup>
      <Divider sx={{ my: 2.5 }} />
      <AppearanceGroup
        title="Skin"
        description="How surfaces and controls are shaped. Works with every theme, light or dark."
      >
        <SkinPicker layout="page" preset={preset} mode={mode} skin={skin} onSelect={setSkin} />
      </AppearanceGroup>
    </AccountPanel>
  );
};

/**
 * Opens the page at the panel a link names (`/account/settings#appearance`).
 * The browser's own jump comes before the page is drawn, so it finds nothing
 * to jump to.
 */
const useScrollToLinkedPanel = (): void => {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash.length > 1) document.getElementById(hash.slice(1))?.scrollIntoView?.();
  }, [hash]);
};

const Settings = (): JSX.Element => {
  const { prefs, setPreference } = usePreferences();
  // The badge counts unread submissions; without them there is no badge to show.
  const canReadSubmissions = useHasPermission('read', 'submissions');
  useScrollToLinkedPanel();

  return (
    <>
      <AccountSectionHeader
        icon={<SettingsRoundedIcon />}
        title="Settings"
        description="Personalise how this admin console behaves on your device."
      />

      <Grid container spacing={3}>
        <Grid size={12}>
          <AppearancePanel />
        </Grid>

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
                    slotProps={{ input: { 'aria-label': 'Collapse sidebar by default' } }}
                  />
                }
              />
              {canReadSubmissions && (
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
                      slotProps={{ input: { 'aria-label': 'Show notification badge' } }}
                    />
                  }
                />
              )}
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

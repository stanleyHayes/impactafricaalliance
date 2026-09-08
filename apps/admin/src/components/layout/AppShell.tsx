import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { usePreferences } from '../../lib/preferences';
import { Tour } from '../tour';
import { useTour } from '../tour/TourContext';

import { NotificationsBell } from './NotificationsBell';
import { SidebarNav } from './SidebarNav';
import { ThemeSelector } from './ThemeSelector';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

const DRAWER_WIDTH = 264;
const RAIL_WIDTH = 76;

/** Authenticated admin layout: top bar + collapsible grouped sidebar + routed content. */
export const AppShell = (): JSX.Element => {
  const { prefs, setPreference } = usePreferences();
  const { start: startTour } = useTour();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = prefs.sidebarCollapsed;
  const desktopWidth = collapsed ? RAIL_WIDTH : DRAWER_WIDTH;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || prefs.tourCompleted) return;
    startedRef.current = true;
    const timer = window.setTimeout(() => startTour(), 800);
    return () => window.clearTimeout(timer);
  }, [prefs.tourCompleted, startTour]);

  const renderDrawer = (mini: boolean): JSX.Element => (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
        background: (t) =>
          `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.055)} 0, ${alpha(
            t.palette.background.paper,
            0,
          )} 190px)`,
      }}
    >
      <Toolbar
        sx={{
          gap: 1.25,
          minHeight: 72,
          px: mini ? 1 : 2.25,
          justifyContent: mini ? 'center' : 'flex-start',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            width: 42,
            height: 42,
            flexShrink: 0,
            placeItems: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Box component="img" src="/brand/icon-512.png" alt="IAA" sx={{ width: 34 }} />
        </Box>
        {!mini && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 750, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              IAA Admin
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.68rem', whiteSpace: 'nowrap' }}
            >
              Content workspace
            </Typography>
          </Box>
        )}
      </Toolbar>
      <Divider />
      <Box id="admin-sidebar-nav" sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <SidebarNav collapsed={mini} onNavigate={() => setMobileOpen(false)} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Box
        component="a"
        href="#admin-main"
        sx={{
          position: 'fixed',
          top: -100,
          left: 16,
          zIndex: 1500,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          color: 'text.primary',
          '&:focus': { top: 12 },
        }}
      >
        Skip to content
      </Box>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.88),
          backdropFilter: 'blur(14px)',
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen((open) => !open)}
            sx={{ mr: 1, display: { md: 'none' } }}
            aria-label="Toggle navigation"
          >
            <MenuIcon />
          </IconButton>
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton
              edge="start"
              onClick={() => setPreference('sidebarCollapsed', !collapsed)}
              sx={{ mr: 1.5, display: { xs: 'none', md: 'inline-flex' } }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>
          </Tooltip>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 750, lineHeight: 1.25 }} noWrap>
              IAA Admin Console
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              Manage content, community, and programme operations
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={{ xs: 0.5, sm: 1 }}
            alignItems="center"
            id="admin-topbar-actions"
          >
            <ThemeSelector />
            <ThemeToggle />
            <NotificationsBell />
            <Divider
              orientation="vertical"
              flexItem
              sx={{ my: 1, mx: { xs: 0.25, sm: 0.5 }, borderColor: 'divider' }}
            />
            <UserMenu />
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: desktopWidth },
          flexShrink: { md: 0 },
          transition: (t) =>
            t.transitions.create('width', { duration: t.transitions.duration.shorter }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {renderDrawer(false)}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: desktopWidth,
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: (t) => alpha(t.palette.background.paper, 0.96),
              overflowX: 'hidden',
              transition: (t) =>
                t.transitions.create('width', { duration: t.transitions.duration.shorter }),
            },
          }}
        >
          {renderDrawer(collapsed)}
        </Drawer>
      </Box>

      <Box
        component="main"
        id="admin-main"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          // Flex items default to min-width:auto, which lets wide children (e.g. the
          // dashboard stat cards, data grids) push the page past the viewport on mobile.
          // Allowing main to shrink keeps every admin page within the viewport width.
          minWidth: 0,
          minHeight: '100dvh',
          p: { xs: 2, sm: 3, lg: 4 },
          width: { md: `calc(100% - ${desktopWidth}px)` },
          bgcolor: 'background.default',
          transition: (t) =>
            t.transitions.create(['width', 'margin'], { duration: t.transitions.duration.shorter }),
        }}
      >
        <Toolbar sx={{ minHeight: 72 }} />
        <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      <Tour />
    </Box>
  );
};

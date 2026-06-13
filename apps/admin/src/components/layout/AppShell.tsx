import { UserRole } from '@iaa/shared';
import ArticleIcon from '@mui/icons-material/Article';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import InboxIcon from '@mui/icons-material/Inbox';
import LogoutIcon from '@mui/icons-material/Logout';
import MailIcon from '@mui/icons-material/MarkEmailRead';
import MenuIcon from '@mui/icons-material/Menu';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { RESOURCES } from '../../resources/registry';

const DRAWER_WIDTH = 248;

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

const OPERATIONS: NavItem[] = [
  { to: '/submissions', label: 'Submissions', icon: <InboxIcon /> },
  { to: '/subscribers', label: 'Subscribers', icon: <MailIcon /> },
  { to: '/donations', label: 'Donations', icon: <VolunteerActivismIcon /> },
];

const navItemStyle = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
  background: isActive ? 'rgba(26,92,56,0.12)' : 'transparent',
});

const NavLinks = (): JSX.Element => {
  const { user } = useAuth();
  return (
    <Box>
      <List>
        <NavLink to="/" end style={navItemStyle}>
          <ListItemButton>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </NavLink>
      </List>
      <Divider />
      <List subheader={<ListSubheader>Content</ListSubheader>}>
        {RESOURCES.map((resource) => (
          <NavLink key={resource.key} to={`/content/${resource.key}`} style={navItemStyle}>
            <ListItemButton>
              <ListItemIcon>
                <ArticleIcon />
              </ListItemIcon>
              <ListItemText primary={resource.label} />
            </ListItemButton>
          </NavLink>
        ))}
      </List>
      <Divider />
      <List subheader={<ListSubheader>Operations</ListSubheader>}>
        {OPERATIONS.map((item) => (
          <NavLink key={item.to} to={item.to} style={navItemStyle}>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </NavLink>
        ))}
        {user?.role === UserRole.Admin && (
          <NavLink to="/users" style={navItemStyle}>
            <ListItemButton>
              <ListItemIcon>
                <GroupsIcon />
              </ListItemIcon>
              <ListItemText primary="Users" />
            </ListItemButton>
          </NavLink>
        )}
      </List>
    </Box>
  );
};

/** Authenticated admin layout: top bar + persistent sidebar + routed content. */
export const AppShell = (): JSX.Element => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box>
      <Toolbar sx={{ gap: 1 }}>
        <Box component="img" src="/brand/logo-primary.png" alt="IAA" sx={{ height: 32 }} />
        <Typography sx={{ fontWeight: 700 }}>Admin</Typography>
      </Toolbar>
      <Divider />
      <NavLinks />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={1}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen((open) => !open)}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="Toggle navigation"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            IAA Admin Console
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            {user?.name} · {user?.role}
          </Typography>
          <Tooltip title="Log out">
            <IconButton onClick={logout} aria-label="Log out">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

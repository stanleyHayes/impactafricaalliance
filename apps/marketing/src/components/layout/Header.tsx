import { PRIMARY_NAV } from '@iaa/shared';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { useState } from 'react';
import { Link as RouterLink, NavLink, useLocation } from 'react-router-dom';

import { Logo } from '../Logo';

const navLinkSx = (active: boolean) => ({
  color: active ? 'primary.main' : 'text.primary',
  fontWeight: active ? 700 : 500,
  textDecoration: 'none',
  px: 1.5,
  py: 1,
  borderRadius: 1,
  '&:hover': { color: 'primary.main' },
});

/** Sticky site header with desktop nav and a mobile drawer overlay. */
export const Header = (): JSX.Element => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: 'rgba(247,247,242,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Container>
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', gap: 2 }}>
          <RouterLink to="/" aria-label="Home">
            <Logo height={44} />
          </RouterLink>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}
          >
            {PRIMARY_NAV.map((link) => (
              <Box
                key={link.path}
                component={NavLink}
                to={link.path}
                end={link.path === '/'}
                sx={() => navLinkSx(pathname === link.path)}
              >
                {link.label}
              </Box>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={RouterLink}
              to="/get-involved#partner"
              variant="contained"
              color="secondary"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Partner With Us
            </Button>
            <IconButton
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280, p: 2 }} role="presentation" onClick={() => setOpen(false)}>
          <Logo height={40} />
          <Divider sx={{ my: 2 }} />
          <List>
            {PRIMARY_NAV.map((link) => (
              <ListItemButton
                key={link.path}
                component={RouterLink}
                to={link.path}
                selected={pathname === link.path}
              >
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
          </List>
          <Button
            component={RouterLink}
            to="/get-involved#partner"
            variant="contained"
            color="secondary"
            fullWidth
            sx={{ mt: 2 }}
          >
            Partner With Us
          </Button>
        </Box>
      </Drawer>
    </AppBar>
  );
};

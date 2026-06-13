import { ORG, PRIMARY_NAV } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { Link as RouterLink, NavLink } from 'react-router-dom';

import { Logo } from '../Logo';

const navLinkSx = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 48,
  px: 1.35,
  color: 'text.primary',
  fontSize: '0.91rem',
  fontWeight: 600,
  lineHeight: 1,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'color 180ms ease',
  '&::after': {
    position: 'absolute',
    right: 11,
    bottom: 5,
    left: 11,
    height: 3,
    borderRadius: 999,
    bgcolor: 'secondary.main',
    content: '""',
    opacity: 0,
    transform: 'scaleX(0.35)',
    transition: 'opacity 180ms ease, transform 180ms ease',
  },
  '&:hover': {
    color: 'primary.main',
  },
  '&:focus-visible': {
    borderRadius: 1,
    outline: '3px solid rgba(212,160,23,0.35)',
    outlineOffset: 2,
  },
  '&.active': {
    color: 'primary.main',
    fontWeight: 700,
  },
  '&.active::after': {
    opacity: 1,
    transform: 'scaleX(1)',
  },
} as const;

const drawerLinkSx = {
  position: 'relative',
  gap: 1.5,
  minHeight: 58,
  mb: 0.5,
  px: 2,
  borderRadius: 2,
  color: 'text.primary',
  transition: 'background-color 180ms ease, color 180ms ease, transform 180ms ease',
  '&:hover': {
    bgcolor: 'rgba(26,92,56,0.07)',
    color: 'primary.main',
    transform: 'translateX(2px)',
  },
  '&.active': {
    bgcolor: 'rgba(26,92,56,0.1)',
    color: 'primary.main',
  },
  '&.active::before': {
    position: 'absolute',
    top: 14,
    bottom: 14,
    left: 0,
    width: 3,
    borderRadius: 999,
    bgcolor: 'secondary.main',
    content: '""',
  },
} as const;

const PartnershipButton = ({ fullWidth = false }: { fullWidth?: boolean }): JSX.Element => (
  <Button
    component={RouterLink}
    to="/get-involved#partner"
    variant="contained"
    color="secondary"
    fullWidth={fullWidth}
    endIcon={<ArrowForwardRoundedIcon />}
    sx={{
      minHeight: 46,
      px: 2.5,
      fontWeight: 700,
      boxShadow: '0 10px 24px -14px rgba(89,65,4,0.65)',
      '&:hover': {
        bgcolor: 'secondary.dark',
        boxShadow: '0 12px 28px -14px rgba(89,65,4,0.75)',
        transform: 'translateY(-1px)',
      },
    }}
  >
    Partner with us
  </Button>
);

/** Quiet context bar for the organisation's footprint and secondary links. */
const UtilityBar = (): JSX.Element => (
  <Box
    sx={{
      display: { xs: 'none', lg: 'block' },
      bgcolor: 'primary.dark',
      color: 'common.white',
    }}
  >
    <Container maxWidth="xl">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ minHeight: 34 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <PublicRoundedIcon sx={{ fontSize: 15, color: 'secondary.main' }} />
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 500, letterSpacing: 0.15 }}
          >
            Advancing opportunity across Ghana, Sierra Leone &amp; Nigeria
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2.25}>
          <Link
            component={RouterLink}
            to="/news"
            underline="none"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'rgba(255,255,255,0.82)',
              fontSize: '0.78rem',
              fontWeight: 600,
              '&:hover': { color: 'common.white' },
            }}
          >
            <NewspaperRoundedIcon sx={{ fontSize: 15 }} />
            News &amp; Stories
          </Link>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ my: 0.9, borderColor: 'rgba(255,255,255,0.2)' }}
          />
          <Link
            href={`mailto:${ORG.email}`}
            underline="none"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'rgba(255,255,255,0.82)',
              fontSize: '0.78rem',
              fontWeight: 600,
              '&:hover': { color: 'common.white' },
            }}
          >
            <EmailRoundedIcon sx={{ fontSize: 15 }} />
            {ORG.email}
          </Link>
        </Stack>
      </Stack>
    </Container>
  </Box>
);

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

const MobileNavigation = ({ open, onClose }: MobileNavigationProps): JSX.Element => (
  <Drawer
    id="mobile-navigation"
    anchor="right"
    open={open}
    onClose={onClose}
    ModalProps={{ keepMounted: true }}
    slotProps={{
      paper: {
        sx: {
          width: { xs: '100%', sm: 390 },
          maxWidth: '100%',
          bgcolor: 'background.default',
        },
      },
    }}
  >
    <Box sx={{ display: 'flex', minHeight: '100%', flexDirection: 'column' }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'primary.dark',
          color: 'common.white',
          p: 3,
          pb: 3.5,
          '&::after': {
            position: 'absolute',
            right: -65,
            bottom: -92,
            width: 210,
            height: 210,
            border: '1px solid rgba(212,160,23,0.24)',
            borderRadius: '50%',
            content: '""',
          },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <RouterLink to="/" aria-label="Impact Africa Alliance home" onClick={onClose}>
            <Logo variant="white" height={44} />
          </RouterLink>
          <IconButton
            aria-label="Close navigation"
            onClick={onClose}
            sx={{
              mt: -0.5,
              mr: -0.5,
              color: 'common.white',
              border: '1px solid rgba(255,255,255,0.22)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
        <Typography
          sx={{
            position: 'relative',
            zIndex: 1,
            mt: 2.5,
            maxWidth: 270,
            color: 'rgba(255,255,255,0.76)',
            fontSize: '0.9rem',
            lineHeight: 1.65,
          }}
        >
          {ORG.tagline}
        </Typography>
      </Box>

      <Box component="nav" aria-label="Mobile navigation" sx={{ flex: 1, p: 2.5 }}>
        <Typography
          variant="overline"
          sx={{
            display: 'block',
            mb: 1,
            color: 'text.secondary',
            fontWeight: 700,
            letterSpacing: 1.4,
          }}
        >
          Explore
        </Typography>
        <List disablePadding>
          {PRIMARY_NAV.map((link, index) => (
            <ListItemButton
              key={link.path}
              component={NavLink}
              to={link.path}
              end={link.path === '/'}
              onClick={onClose}
              sx={drawerLinkSx}
            >
              <Typography
                aria-hidden="true"
                sx={{ minWidth: 24, color: 'text.secondary', fontSize: '0.72rem', fontWeight: 700 }}
              >
                {String(index + 1).padStart(2, '0')}
              </Typography>
              <ListItemText
                primary={link.label}
                primaryTypographyProps={{ fontSize: '1rem', fontWeight: 650 }}
              />
              <ArrowForwardRoundedIcon sx={{ fontSize: 19, opacity: 0.62 }} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <ListItemButton component={NavLink} to="/news" onClick={onClose} sx={drawerLinkSx}>
          <NewspaperRoundedIcon sx={{ ml: 0.25, mr: 0.25, color: 'primary.main', fontSize: 20 }} />
          <ListItemText
            primary="News & Stories"
            primaryTypographyProps={{ fontSize: '0.96rem', fontWeight: 650 }}
          />
          <ArrowForwardRoundedIcon sx={{ fontSize: 19, opacity: 0.62 }} />
        </ListItemButton>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'common.white', p: 3 }}>
        <PartnershipButton fullWidth />
        <Link
          href={`mailto:${ORG.email}`}
          underline="none"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.8,
            mt: 2,
            color: 'text.secondary',
            fontSize: '0.8rem',
            fontWeight: 600,
            '&:hover': { color: 'primary.main' },
          }}
        >
          <EmailRoundedIcon sx={{ fontSize: 16 }} />
          {ORG.email}
        </Link>
      </Box>
    </Box>
  </Drawer>
);

/** Sticky, responsive site navigation with a compact institutional utility bar. */
export const Header = (): JSX.Element => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = (): void => setScrolled(window.scrollY > 12);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: 'transparent',
        color: 'text.primary',
        boxShadow: scrolled ? '0 12px 34px -24px rgba(12,42,26,0.7)' : 'none',
        transition: 'box-shadow 220ms ease',
      }}
    >
      <UtilityBar />

      <Box
        sx={{
          position: 'relative',
          borderBottom: 1,
          borderColor: scrolled ? 'rgba(26,92,56,0.15)' : 'divider',
          bgcolor: scrolled ? 'rgba(255,255,255,0.94)' : 'rgba(247,247,242,0.94)',
          backdropFilter: 'blur(14px)',
          transition: 'background-color 220ms ease, border-color 220ms ease',
          '&::after': {
            position: 'absolute',
            right: 0,
            bottom: -1,
            left: 0,
            height: 2,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.8) 22%, rgba(26,92,56,0.8) 78%, transparent 100%)',
            content: '""',
            opacity: scrolled ? 0 : 0.42,
            transition: 'opacity 220ms ease',
          },
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: 72, lg: scrolled ? 76 : 82 },
              gap: { xs: 1.5, lg: 2.5 },
              transition: 'min-height 220ms ease',
            }}
          >
            <RouterLink
              to="/"
              aria-label="Impact Africa Alliance home"
              style={{ display: 'inline-flex', flexShrink: 0 }}
            >
              <Logo height={55} />
            </RouterLink>

            <Box sx={{ flex: 1 }} />

            <Stack
              component="nav"
              aria-label="Primary navigation"
              direction="row"
              alignItems="center"
              spacing={0.15}
              sx={{ display: { xs: 'none', lg: 'flex' } }}
            >
              {PRIMARY_NAV.map((link) => (
                <Box
                  key={link.path}
                  component={NavLink}
                  to={link.path}
                  end={link.path === '/'}
                  sx={navLinkSx}
                >
                  {link.label}
                </Box>
              ))}
            </Stack>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: 'none', lg: 'block' },
                my: 2.1,
                borderColor: 'rgba(26,92,56,0.17)',
              }}
            />

            <Box sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
              <PartnershipButton />
            </Box>

            <IconButton
              aria-label="Open navigation"
              aria-controls={mobileOpen ? 'mobile-navigation' : undefined}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              sx={{
                display: { lg: 'none' },
                width: 46,
                height: 46,
                flexShrink: 0,
                border: 1,
                borderColor: 'rgba(26,92,56,0.18)',
                bgcolor: 'rgba(26,92,56,0.05)',
                color: 'primary.main',
                '&:hover': { bgcolor: 'rgba(26,92,56,0.1)' },
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </Box>

      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </AppBar>
  );
};

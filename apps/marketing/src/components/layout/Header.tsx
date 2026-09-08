import { ORG } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { Logo } from '../Logo';
import { SocialLinks } from '../SocialLinks';

import { DesktopNavigation, MobileNavigationLinks } from './SiteNavigation';
import { ThemeToggle } from './ThemeToggle';

const PartnershipButton = ({ fullWidth = false }: { fullWidth?: boolean }): JSX.Element => (
  <Button
    component={RouterLink}
    to="/get-involved#partner"
    variant="contained"
    color="secondary"
    fullWidth={fullWidth}
    endIcon={<ArrowForwardRoundedIcon />}
    sx={{
      minHeight: 44,
      px: 2.5,
      fontWeight: 700,
      boxShadow: '0 10px 24px -14px rgba(245,184,0,0.45)',
      '&:hover': {
        bgcolor: 'secondary.dark',
        boxShadow: '0 12px 28px -14px rgba(245,184,0,0.55)',
        transform: 'translateY(-1px)',
      },
    }}
  >
    Partner with us
  </Button>
);

/** Quiet institutional utility bar. */
const UtilityBar = (): JSX.Element => (
  <Box
    sx={{
      display: { xs: 'none', lg: 'block' },
      bgcolor: 'common.black',
      color: 'common.white',
    }}
  >
    <Container maxWidth="xl">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ minHeight: 36 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              animation: 'pulse 2.4s ease-out infinite',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(0,214,139,0.45)' },
                '70%': { boxShadow: '0 0 0 8px rgba(0,214,139,0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(0,214,139,0)' },
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 600, letterSpacing: 0.2 }}
          >
            Advancing opportunity across Ghana, Sierra Leone &amp; Nigeria
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2.5}>
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
          <Divider
            orientation="vertical"
            flexItem
            sx={{ my: 0.75, borderColor: 'rgba(255,255,255,0.18)' }}
          />
          {/*
            The channels sit in the utility bar rather than only in the footer:
            someone who never scrolls to the bottom of a page still gets the
            chance to follow, which is the point of putting them here.
          */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '& .MuiIconButton-root': {
                p: 0.5,
                color: 'rgba(255,255,255,0.72)',
                transition: 'color 160ms ease, transform 160ms ease',
                '&:hover': {
                  color: 'common.white',
                  bgcolor: 'transparent',
                  transform: 'translateY(-2px)',
                },
                '&:focus-visible': { color: 'common.white' },
              },
              '& .MuiSvgIcon-root': { fontSize: 17 },
              '@media (prefers-reduced-motion: reduce)': {
                '& .MuiIconButton-root': { transition: 'none' },
                '& .MuiIconButton-root:hover': { transform: 'none' },
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'secondary.main',
                fontWeight: 800,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                fontSize: '0.68rem',
              }}
            >
              Follow
            </Typography>
            <SocialLinks />
          </Box>
        </Stack>
      </Stack>
    </Container>
  </Box>
);

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
}

const MobileNavigation = ({ open, onClose }: MobileNavigationProps): JSX.Element => {
  const theme = useTheme();
  return (
    <Drawer
      id="mobile-navigation"
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 420 },
            maxWidth: '100%',
            bgcolor: 'background.default',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            flexShrink: 0,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
            px: 2.5,
            py: 2,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <RouterLink
              to="/"
              aria-label="Impact Africa Alliance home"
              onClick={onClose}
              style={{ display: 'inline-flex', flexShrink: 0 }}
            >
              <Logo variant={theme.palette.mode === 'dark' ? 'white' : 'primary'} height={40} />
            </RouterLink>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <ThemeToggle />
              <IconButton
                aria-label="Close navigation"
                onClick={onClose}
                sx={{
                  width: 44,
                  height: 44,
                  border: 1,
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>
        <Box
          component="nav"
          aria-label="Mobile navigation"
          sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
        >
          <MobileNavigationLinks onClose={onClose} />
          <Box sx={{ px: 3, pb: 3 }}>
            <Button
              component={RouterLink}
              to="/get-involved#partner"
              onClick={onClose}
              variant="contained"
              color="secondary"
              fullWidth
              endIcon={<ArrowForwardRoundedIcon />}
            >
              Partner with us
            </Button>
            <Typography sx={{ mt: 3, color: 'text.secondary', fontSize: '.85rem' }}>
              {ORG.tagline}
            </Typography>
            <Link
              href={`mailto:${ORG.email}`}
              sx={{ display: 'inline-block', mt: 1.5, color: 'text.secondary', fontSize: '.8rem' }}
            >
              {ORG.email}
            </Link>
            {/* The utility bar is hidden below lg, so the channels live here too. */}
            <Box sx={{ mt: 1.5, ml: -0.5 }}>
              <SocialLinks color="primary" />
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

/** Sticky header with five grouped destinations on desktop and mobile. */
export const Header = (): JSX.Element => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const theme = useTheme();

  // Safety net: whatever dismissed the drawer (tile tap, back button, a link
  // rendered inside it), landing on a new route must never leave it open.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
        boxShadow: scrolled ? '0 12px 34px -24px rgba(0,0,0,0.18)' : 'none',
        transition: 'box-shadow 220ms ease',
      }}
    >
      <UtilityBar />

      <Box
        sx={{
          position: 'relative',
          borderBottom: 1,
          borderColor: scrolled ? 'divider' : 'transparent',
          bgcolor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(255,255,255,0.92)'
              : alpha(theme.palette.background.paper, 0.92),
          backdropFilter: 'blur(14px)',
          transition: 'background-color 220ms ease, border-color 220ms ease',
          '&::after': {
            position: 'absolute',
            right: 0,
            bottom: -1,
            left: 0,
            height: 2,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(245,184,0,0.9) 25%, rgba(0,214,139,0.9) 75%, transparent 100%)',
            content: '""',
            opacity: scrolled ? 0 : 0.5,
            transition: 'opacity 220ms ease',
          },
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: 72, lg: 78 },
              gap: { xs: 1.5, lg: 3 },
            }}
          >
            <RouterLink
              to="/"
              aria-label="Impact Africa Alliance home"
              style={{ display: 'inline-flex', flexShrink: 0 }}
            >
              <Logo variant={theme.palette.mode === 'dark' ? 'white' : 'primary'} height={54} />
            </RouterLink>

            <Box sx={{ flex: 1 }} />

            <DesktopNavigation />

            <Box sx={{ flex: 1, display: { xs: 'none', lg: 'block' } }} />

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <ThemeToggle />
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <PartnershipButton />
              </Box>
            </Stack>

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
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'text.primary',
                '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
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

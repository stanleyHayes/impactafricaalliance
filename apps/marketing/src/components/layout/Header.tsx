import { ORG, PRIMARY_NAV } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
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
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link as RouterLink, NavLink, useLocation } from 'react-router-dom';

import { Logo } from '../Logo';

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
          <Divider orientation="vertical" flexItem sx={{ my: 0.8, borderColor: 'rgba(255,255,255,0.18)' }} />
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

const drawerLinkSx = {
  position: 'relative',
  gap: 1.5,
  minHeight: 56,
  mb: 0.5,
  px: 2,
  borderRadius: 2,
  color: 'text.primary',
  transition: 'background-color 180ms ease, color 180ms ease, transform 180ms ease',
  '&:hover': {
    bgcolor: 'action.hover',
    color: 'primary.main',
    transform: 'translateX(2px)',
  },
  '&.active': {
    bgcolor: (theme: Theme) => alpha(theme.palette.secondary.main, 0.15),
    color: 'text.primary',
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
          bgcolor: 'common.black',
          color: 'common.white',
          p: 3,
          pb: 3.5,
          '&::after': {
            position: 'absolute',
            right: -65,
            bottom: -92,
            width: 210,
            height: 210,
            border: '1px solid rgba(0,214,139,0.24)',
            borderRadius: '50%',
            content: '""',
          },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <RouterLink to="/" aria-label="Impact Africa Alliance home" onClick={onClose}>
            <Logo variant="white" height={44} />
          </RouterLink>
          <Stack direction="row" spacing={1} alignItems="center">
            <ThemeToggle />
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
                slotProps={{ primary: { sx: { fontSize: '1rem', fontWeight: 650 } } }}
              />
              <ArrowForwardRoundedIcon sx={{ fontSize: 19, opacity: 0.62 }} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <ListItemButton component={NavLink} to="/news" onClick={onClose} sx={drawerLinkSx}>
          <NewspaperRoundedIcon sx={{ ml: 0.25, mr: 0.25, color: 'text.primary', fontSize: 20 }} />
          <ListItemText
            primary="News & Stories"
            slotProps={{ primary: { sx: { fontSize: '0.96rem', fontWeight: 650 } } }}
          />
          <ArrowForwardRoundedIcon sx={{ fontSize: 19, opacity: 0.62 }} />
        </ListItemButton>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
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

/** Sticky header with segmented pill navigation and sliding active indicator. */
export const Header = (): JSX.Element => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const updateScrolled = (): void => setScrolled(window.scrollY > 12);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const measure = (): void => {
      const active = nav?.querySelector<HTMLElement>('a.active');
      if (!active) {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }
      setPillStyle({
        opacity: 1,
        width: active.offsetWidth,
        height: active.offsetHeight,
        top: active.offsetTop,
        transform: `translateX(${active.offsetLeft}px)`,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname]);

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

            <Box
              ref={navRef}
              component="nav"
              aria-label="Primary navigation"
              sx={{
                position: 'relative',
                display: { xs: 'none', lg: 'inline-flex' },
                alignItems: 'center',
                gap: '4px',
                p: '5px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 999,
                bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  borderRadius: 999,
                  bgcolor: 'secondary.main',
                  boxShadow: '0 2px 8px rgba(245,184,0,0.35)',
                  pointerEvents: 'none',
                  transition:
                    'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), width 360ms cubic-bezier(0.22, 1, 0.36, 1), height 200ms ease, opacity 200ms ease',
                  ...pillStyle,
                }}
              />
              {PRIMARY_NAV.map((link) => (
                <Box
                  key={link.path}
                  component={NavLink}
                  to={link.path}
                  end={link.path === '/'}
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 40,
                    px: 2,
                    borderRadius: 999,
                    color: 'text.primary',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'color 150ms ease',
                    '&:hover': { color: 'primary.main' },
                    '&.active': {
                      color: 'common.black',
                      fontWeight: 700,
                    },
                    '&.active:hover': { color: 'common.black' },
                    '&:focus-visible': {
                      outline: '3px solid rgba(0,214,139,0.35)',
                      outlineOffset: 2,
                    },
                  }}
                >
                  {link.label}
                </Box>
              ))}
            </Box>

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

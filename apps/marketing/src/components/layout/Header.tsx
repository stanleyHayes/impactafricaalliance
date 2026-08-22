import { ORG, PRIMARY_NAV } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import type { SvgIconProps } from '@mui/material/SvgIcon';
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

type NavIcon = React.ComponentType<SvgIconProps>;

/** Glyph per destination, so every tile in the grid reads at a glance. */
const NAV_ICONS: Readonly<Record<string, NavIcon>> = {
  '/': HomeRoundedIcon,
  '/about': InfoRoundedIcon,
  '/our-work': LayersRoundedIcon,
  '/impact': InsightsRoundedIcon,
  '/get-involved': VolunteerActivismRoundedIcon,
  '/resources': MenuBookRoundedIcon,
  '/contact': MailRoundedIcon,
};

const CORNERS = [
  { id: 'tl', top: 0, left: 0, borderTop: '1px solid', borderLeft: '1px solid' },
  { id: 'tr', top: 0, right: 0, borderTop: '1px solid', borderRight: '1px solid' },
  { id: 'bl', bottom: 0, left: 0, borderBottom: '1px solid', borderLeft: '1px solid' },
  { id: 'br', bottom: 0, right: 0, borderBottom: '1px solid', borderRight: '1px solid' },
] as const;

/**
 * Four L-shaped corner marks framing a tile. Decorative only, so every mark is
 * transparent to pointer events — the circle this drawer used to draw behind
 * its header was not, and it silently ate taps on the close button.
 */
const CornerMarks = ({ color, size = 11 }: { color: string; size?: number }): JSX.Element => (
  <>
    {CORNERS.map(({ id, ...edges }) => (
      <Box
        key={id}
        aria-hidden
        sx={{
          position: 'absolute',
          width: size,
          height: size,
          borderColor: color,
          pointerEvents: 'none',
          ...edges,
        }}
      />
    ))}
  </>
);

const tileSx = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1.25,
  minHeight: 128,
  p: 2,
  bgcolor: 'background.default',
  color: 'text.secondary',
  textDecoration: 'none',
  transition: 'background-color 200ms ease, color 200ms ease',
  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  '&.active': {
    bgcolor: (theme: Theme) => alpha(theme.palette.secondary.main, 0.14),
    color: 'text.primary',
  },
  '&:focus-visible': {
    outline: '2px solid rgba(0,214,139,0.55)',
    outlineOffset: -3,
  },
} as const;

interface NavTileProps {
  label: string;
  path: string;
  index: number;
  Icon: NavIcon;
  onClose: () => void;
}

const NavTile = ({ label, path, index, Icon, onClose }: NavTileProps): JSX.Element => (
  <Box
    component={NavLink}
    to={path}
    end={path === '/'}
    onClick={onClose}
    sx={tileSx}
  >
    <CornerMarks color="divider" />
    <Typography
      aria-hidden="true"
      sx={{
        position: 'absolute',
        top: 12,
        left: 14,
        color: 'text.disabled',
        fontSize: '0.66rem',
        fontWeight: 700,
        letterSpacing: 1.6,
        pointerEvents: 'none',
      }}
    >
      {String(index + 1).padStart(2, '0')}
    </Typography>
    <Icon sx={{ fontSize: 27 }} />
    <Typography
      sx={{
        fontSize: '0.76rem',
        fontWeight: 700,
        letterSpacing: 2,
        textAlign: 'center',
        textTransform: 'uppercase',
        lineHeight: 1.35,
      }}
    >
      {label}
    </Typography>
  </Box>
);

const MobileNavigation = ({ open, onClose }: MobileNavigationProps): JSX.Element => {
  const tiles = [
    ...PRIMARY_NAV.map((link) => ({
      label: link.label,
      path: link.path,
      Icon: NAV_ICONS[link.path] ?? LayersRoundedIcon,
    })),
    { label: 'News & Stories', path: '/news', Icon: NewspaperRoundedIcon },
  ];

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
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%',
            bgcolor: 'background.default',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        {/*
          flexShrink: 0 keeps this bar at its natural height — as a plain flex
          child it used to be squeezed (and clipped) by the taller nav below,
          which is how the close button became unreachable. Sticky keeps it in
          view once the tiles start scrolling.
        */}
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
              <Logo variant="white" height={40} />
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
                  '&:hover': { bgcolor: 'action.hover', borderColor: 'text.primary' },
                }}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* minHeight: 0 lets this pane actually scroll instead of forcing the
            column taller than the drawer and squeezing its siblings. */}
        <Box
          component="nav"
          aria-label="Mobile navigation"
          sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1px',
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'divider',
            }}
          >
            {tiles.map((tile, index) => (
              <NavTile
                key={tile.path}
                label={tile.label}
                path={tile.path}
                index={index}
                Icon={tile.Icon}
                onClose={onClose}
              />
            ))}
          </Box>

          <Box
            component={RouterLink}
            to="/get-involved#partner"
            onClick={onClose}
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              minHeight: 92,
              px: 3,
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1),
              color: 'text.primary',
              textDecoration: 'none',
              transition: 'background-color 200ms ease',
              '&:hover': { bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.2) },
              '&:focus-visible': { outline: '2px solid rgba(0,214,139,0.55)', outlineOffset: -3 },
            }}
          >
            <CornerMarks color="secondary.main" size={14} />
            <Typography
              aria-hidden="true"
              sx={{
                position: 'absolute',
                top: 12,
                left: 14,
                color: 'text.disabled',
                fontSize: '0.66rem',
                fontWeight: 700,
                letterSpacing: 1.6,
                pointerEvents: 'none',
              }}
            >
              {String(tiles.length + 1).padStart(2, '0')}
            </Typography>
            <SendRoundedIcon sx={{ color: 'secondary.main', fontSize: 24 }} />
            <Typography
              sx={{
                fontSize: '0.95rem',
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Partner with us
            </Typography>
          </Box>

          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography
              sx={{ mb: 1.5, color: 'text.secondary', fontSize: '0.85rem', lineHeight: 1.6 }}
            >
              {ORG.tagline}
            </Typography>
            <Link
              href={`mailto:${ORG.email}`}
              underline="none"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
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
      </Box>
    </Drawer>
  );
};

/** Sticky header with segmented pill navigation and sliding active indicator. */
export const Header = (): JSX.Element => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);
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

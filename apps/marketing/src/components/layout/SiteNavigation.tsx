import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { alpha, type Theme } from '@mui/material/styles';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useId, useState, type ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { Watermark } from '../Watermark';

const navigationWatermarkColor = (theme: Theme): string =>
  alpha(
    theme.palette.mode === 'light' ? '#315E4B' : theme.palette.primary.main,
    theme.palette.mode === 'light' ? 0.24 : 0.09,
  );

interface Destination {
  label: string;
  path: string;
  description: string;
  Icon: ComponentType<SvgIconProps>;
}

type NavigationItem =
  | { label: string; path: string; children?: never }
  | { label: string; path?: never; children: Destination[] };

const NAVIGATION: NavigationItem[] = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  {
    label: 'Our Work',
    children: [
      {
        label: 'Our programmes',
        path: '/our-work',
        description: 'Explore our skills, education, and empowerment initiatives.',
        Icon: LayersRoundedIcon,
      },
      {
        label: 'Impact',
        path: '/impact',
        description: 'See the progress our communities are making.',
        Icon: InsightsRoundedIcon,
      },
    ],
  },
  {
    label: 'News & Events',
    children: [
      {
        label: 'Events',
        path: '/events',
        description: 'Find upcoming gatherings, webinars, and opportunities to connect.',
        Icon: CalendarMonthRoundedIcon,
      },
      {
        label: 'News & Stories',
        path: '/news',
        description: 'Read the latest updates and stories from the alliance.',
        Icon: NewspaperRoundedIcon,
      },
      {
        label: 'Resources',
        path: '/resources',
        description: 'Browse reports, publications, and useful downloads.',
        Icon: MenuBookRoundedIcon,
      },
      {
        label: 'Reviews',
        path: '/reviews',
        description: 'What partners and participants say about working with us.',
        Icon: RateReviewRoundedIcon,
      },
    ],
  },
  {
    label: 'Get Involved',
    children: [
      {
        label: 'Join the alliance',
        path: '/get-involved',
        description: 'Volunteer, mentor, donate, or become a partner.',
        Icon: VolunteerActivismRoundedIcon,
      },
      {
        label: 'Contact',
        path: '/contact',
        description: 'Talk to our team about your questions and ideas.',
        Icon: MailRoundedIcon,
      },
    ],
  },
];

const matchesPath = (pathname: string, path: string): boolean =>
  pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

const DestinationContent = ({ destination }: { destination: Destination }): JSX.Element => {
  const { Icon, label, description } = destination;
  return (
    <>
      <Box
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          color: 'text.primary',
        }}
      >
        <Icon aria-hidden sx={{ fontSize: 23 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="span" sx={{ display: 'block', fontSize: '.95rem', fontWeight: 650 }}>
          {label}
        </Typography>
        <Typography
          component="span"
          sx={{
            display: 'block',
            mt: 0.5,
            color: 'text.secondary',
            fontSize: '.8rem',
            lineHeight: 1.55,
          }}
        >
          {description}
        </Typography>
      </Box>
    </>
  );
};

const destinationSx = {
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1.75,
  p: 2,
  whiteSpace: 'normal',
  borderRadius: 2.5,
  textDecoration: 'none',
  color: 'text.primary',
  '&.active': { bgcolor: 'action.selected' },
  '&:hover': { bgcolor: 'action.hover' },
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
} as const;

const Dropdown = ({
  label,
  destinations,
}: {
  label: string;
  destinations: Destination[];
}): JSX.Element => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();
  const { pathname } = useLocation();
  const active = destinations.some((destination) => matchesPath(pathname, destination.path));
  const open = Boolean(anchor);

  return (
    <>
      <Button
        id={`${id}-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        className={active ? 'nav-active' : undefined}
        endIcon={<ExpandMoreRoundedIcon sx={{ transform: open ? 'rotate(180deg)' : 'none' }} />}
        onClick={(event) => setAnchor(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setAnchor(event.currentTarget);
          }
        }}
      >
        {label}
      </Button>
      <Menu
        id={`${id}-menu`}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              width: 380,
              maxWidth: 'calc(100vw - 32px)',
              p: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 4,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              boxShadow: '0 20px 60px rgba(0,0,0,.18)',
              '&::before': {
                content: '""',
                position: 'absolute',
                right: -40,
                bottom: -40,
                width: 260,
                height: 260,
                bgcolor: navigationWatermarkColor,
                mask: 'url(/patterns/alliance-network.svg) center / contain no-repeat',
                WebkitMask: 'url(/patterns/alliance-network.svg) center / contain no-repeat',
                opacity: 1,
                pointerEvents: 'none',
              },
            },
          },
          list: { 'aria-labelledby': `${id}-trigger`, sx: { position: 'relative', p: 0 } },
        }}
      >
        {destinations.map((destination) => (
          <MenuItem
            key={destination.path}
            component={NavLink}
            to={destination.path}
            aria-label={destination.label}
            onClick={() => setAnchor(null)}
            sx={destinationSx}
          >
            <DestinationContent destination={destination} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export const DesktopNavigation = (): JSX.Element => (
  <Box
    component="nav"
    aria-label="Primary navigation"
    sx={{
      display: { xs: 'none', lg: 'inline-flex' },
      alignItems: 'center',
      gap: 0.5,
      p: 0.625,
      border: 1,
      borderColor: 'divider',
      borderRadius: 99,
      bgcolor: 'background.paper',
      '& > a, & > button': {
        position: 'relative',
        minHeight: 40,
        px: 1.75,
        color: 'text.primary',
        fontSize: '.88rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        transition: 'color 180ms cubic-bezier(0.4, 0, 0.2, 1)',
        // A rule sweeps out from the centre on hover. The active item already
        // carries the gold pill, so it opts out rather than wearing both.
        '&::after': {
          position: 'absolute',
          left: '50%',
          right: '50%',
          bottom: 5,
          height: 2,
          borderRadius: 2,
          bgcolor: 'primary.main',
          transition:
            'left 240ms cubic-bezier(0.22, 1, 0.36, 1), right 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          content: '""',
          pointerEvents: 'none',
        },
        '&:hover::after': { left: 14, right: 14 },
        '&.active, &.nav-active': { bgcolor: 'secondary.main', color: 'common.black' },
        '&.active::after, &.nav-active::after': { left: '50%', right: '50%' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        '@media (prefers-reduced-motion: reduce)': {
          '&::after': { transition: 'none' },
        },
      },
    }}
  >
    {NAVIGATION.map((item) =>
      item.children ? (
        <Dropdown key={item.label} label={item.label} destinations={item.children} />
      ) : (
        <Button key={item.path} component={NavLink} to={item.path} end={item.path === '/'}>
          {item.label}
        </Button>
      ),
    )}
  </Box>
);

export const MobileNavigationLinks = ({ onClose }: { onClose: () => void }): JSX.Element => {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState<string | false>(false);
  const id = useId();
  return (
    <Box sx={{ p: 2 }}>
      {NAVIGATION.map((item, index) => {
        if (!item.children)
          return (
            <Button
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                px: 2,
                py: 1.5,
                color: 'text.primary',
                borderRadius: 2,
                '&.active': { bgcolor: 'action.selected' },
              }}
            >
              {item.label}
            </Button>
          );
        const active = item.children.some((destination) => matchesPath(pathname, destination.path));
        return (
          <Accordion
            key={item.label}
            expanded={expanded === item.label}
            onChange={(_, isExpanded) => setExpanded(isExpanded ? item.label : false)}
            disableGutters
            elevation={0}
            sx={{
              bgcolor: 'transparent',
              backgroundImage: 'none',
              '&::before': { display: 'none' },
            }}
          >
            <AccordionSummary
              id={`${id}-${index}-trigger`}
              aria-controls={`${id}-${index}-panel`}
              expandIcon={<ExpandMoreRoundedIcon />}
              sx={{
                minHeight: 48,
                px: 2,
                borderRadius: 2,
                bgcolor: active ? 'action.selected' : 'transparent',
                '& .MuiAccordionSummary-content': { my: 1.5 },
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
            </AccordionSummary>
            <AccordionDetails
              id={`${id}-${index}-panel`}
              sx={{ position: 'relative', overflow: 'hidden', p: 0.5 }}
            >
              <Watermark
                variant="network"
                size={240}
                opacity={1}
                position="bottom-right"
                sx={{ color: navigationWatermarkColor }}
              />
              {item.children.map((destination) => (
                <Box
                  key={destination.path}
                  component={NavLink}
                  to={destination.path}
                  aria-label={destination.label}
                  onClick={onClose}
                  sx={destinationSx}
                >
                  <DestinationContent destination={destination} />
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

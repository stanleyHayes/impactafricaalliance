import { ORG, PILLARS, PRIMARY_NAV, brandColors } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Logo } from '../Logo';
import { SocialLinks } from '../SocialLinks';

const NAV_ICONS: Record<string, SvgIconComponent> = {
  '/': HomeRoundedIcon,
  '/about': InfoOutlinedIcon,
  '/our-work': GridViewRoundedIcon,
  '/impact': InsightsRoundedIcon,
  '/get-involved': VolunteerActivismRoundedIcon,
  '/contact': MailOutlineRoundedIcon,
};

const PROGRAM_ICONS: Record<string, SvgIconComponent> = {
  'digital-skills': CodeRoundedIcon,
  'stem-learning': ScienceRoundedIcon,
  'climate-action': BoltRoundedIcon,
  'women-empowerment': Diversity3RoundedIcon,
};

const ACTION_LINKS = [
  { label: 'Partner with us', path: '/get-involved#partner' },
  { label: 'Volunteer or mentor', path: '/get-involved#volunteer' },
  { label: 'Support the mission', path: '/get-involved#donate' },
  { label: 'Send us a message', path: '/contact' },
] as const;

const FooterHeading = ({ children }: { children: string }): JSX.Element => (
  <Typography
    variant="subtitle2"
    sx={{
      mb: 2.25,
      color: 'rgba(255,255,255,0.92)',
      fontWeight: 750,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      '&::after': {
        display: 'block',
        width: 28,
        height: 2,
        mt: 1.1,
        borderRadius: 99,
        bgcolor: 'secondary.main',
        content: '""',
      },
    }}
  >
    {children}
  </Typography>
);

const FooterLink = ({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: SvgIconComponent;
  children: ReactNode;
}): JSX.Element => (
  <Link
    component={RouterLink}
    to={to}
    underline="none"
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minWidth: 0,
      color: 'rgba(255,255,255,0.7)',
      fontSize: '0.92rem',
      lineHeight: 1.35,
      transition: 'color 180ms ease, transform 180ms ease',
      '&:hover': {
        color: 'common.white',
        transform: 'translateX(3px)',
      },
      '&:hover .footer-link-icon': {
        bgcolor: 'secondary.main',
        color: brandColors.charcoalBlack,
      },
    }}
  >
    <Box
      className="footer-link-icon"
      sx={{
        display: 'grid',
        width: 25,
        height: 25,
        flexShrink: 0,
        placeItems: 'center',
        borderRadius: '50%',
        bgcolor: 'rgba(255,255,255,0.06)',
        color: 'secondary.light',
        transition: 'background-color 180ms ease, color 180ms ease',
      }}
    >
      <Icon sx={{ fontSize: 15 }} />
    </Box>
    <Box component="span">{children}</Box>
  </Link>
);

/** Clean site footer: brand summary, useful navigation, and a focused contact path. */
export const Footer = (): JSX.Element => (
  <Box
    component="footer"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      bgcolor: '#071F16',
      background:
        'radial-gradient(circle at 8% 12%, rgba(212,160,23,0.13), transparent 26%), radial-gradient(circle at 90% 0%, rgba(46,125,79,0.22), transparent 30%), linear-gradient(180deg, #0E3322 0%, #071F16 58%, #061911 100%)',
      color: 'common.white',
      pt: { xs: 5, md: 6 },
      '&::before': {
        position: 'absolute',
        right: { xs: -230, md: -120 },
        bottom: { xs: -250, md: -230 },
        width: { xs: 460, md: 560 },
        height: { xs: 460, md: 560 },
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '50%',
        boxShadow: '0 0 0 54px rgba(255,255,255,0.018), 0 0 0 108px rgba(212,160,23,0.025)',
        content: '""',
      },
    }}
  >
    <Container sx={{ position: 'relative', zIndex: 1 }}>
      <Grid
        container
        spacing={{ xs: 3, md: 4 }}
        alignItems="stretch"
        sx={{
          pb: { xs: 4, md: 5 },
          borderBottom: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <Grid size={{ xs: 12, md: 7 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.35,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2.5,
              bgcolor: 'rgba(255,255,255,0.06)',
            }}
          >
            <Logo variant="white" height={40} />
          </Box>
          <Typography
            variant="h4"
            sx={{
              maxWidth: 620,
              mt: 3,
              color: 'common.white',
              fontSize: { xs: '1.8rem', md: '2.25rem' },
              lineHeight: 1.16,
            }}
          >
            Empowering Africa. One community at a time.
          </Typography>
          <Typography
            sx={{ mt: 1.75, maxWidth: 540, color: 'rgba(255,255,255,0.68)', lineHeight: 1.75 }}
          >
            We connect skills, opportunity, and partnerships so young people, women, and communities
            can lead lasting change across Africa.
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.62)', fontWeight: 650 }}>
              Follow
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                p: 0.5,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 999,
                bgcolor: 'rgba(255,255,255,0.045)',
                '& .MuiIconButton-root': {
                  color: 'rgba(255,255,255,0.75)',
                },
                '& .MuiIconButton-root:hover': {
                  bgcolor: 'rgba(212,160,23,0.16)',
                  color: 'secondary.light',
                },
              }}
            >
              <SocialLinks color="inherit" />
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              height: '100%',
              p: { xs: 3, md: 3.5 },
              border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.07)',
              boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', 0.08)}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: 'secondary.light', fontWeight: 750, letterSpacing: 1.7 }}
            >
              Work with IAA
            </Typography>
            <Typography variant="h5" sx={{ mt: 1, color: 'common.white' }}>
              Have an idea, partnership, or question?
            </Typography>
            <Typography sx={{ mt: 1.25, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7 }}>
              Tell us where you want to create impact. We&apos;ll help route the conversation to the
              right team.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 3 }}>
              <Link
                component={RouterLink}
                to="/get-involved#partner"
                underline="none"
                sx={{
                  display: 'inline-flex',
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  px: 2.25,
                  borderRadius: 999,
                  bgcolor: 'secondary.main',
                  color: brandColors.charcoalBlack,
                  fontWeight: 800,
                  '&:hover': { bgcolor: 'secondary.light' },
                }}
              >
                Partner with us
                <ArrowForwardRoundedIcon fontSize="small" />
              </Link>
              <Link
                href={`mailto:${ORG.email}`}
                underline="none"
                sx={{
                  display: 'inline-flex',
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  px: 2.25,
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 999,
                  color: 'common.white',
                  fontWeight: 750,
                  '&:hover': { borderColor: 'secondary.main', color: 'secondary.light' },
                }}
              >
                <MailOutlineRoundedIcon fontSize="small" />
                Email us
              </Link>
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 4, md: 5 }} sx={{ py: { xs: 4.5, md: 5.5 } }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <FooterHeading>Navigate</FooterHeading>
          <Stack spacing={1.25}>
            {PRIMARY_NAV.map((link) => (
              <FooterLink
                key={link.path}
                to={link.path}
                icon={NAV_ICONS[link.path] ?? HomeRoundedIcon}
              >
                {link.label}
              </FooterLink>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FooterHeading>Initiatives</FooterHeading>
          <Stack spacing={1.25}>
            {PILLARS.map((pillar) => (
              <FooterLink
                key={pillar.key}
                to={pillar.path}
                icon={PROGRAM_ICONS[pillar.key] ?? CodeRoundedIcon}
              >
                {pillar.title}
              </FooterLink>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <FooterHeading>Take Action</FooterHeading>
          <Stack spacing={1.25}>
            {ACTION_LINKS.map((link) => (
              <FooterLink key={link.path} to={link.path} icon={ArrowForwardRoundedIcon}>
                {link.label}
              </FooterLink>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 5 }}>
          <FooterHeading>Contact</FooterHeading>
          <Stack spacing={1.6}>
            <Link
              href={`mailto:${ORG.email}`}
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                color: 'rgba(255,255,255,0.76)',
                overflowWrap: 'anywhere',
                transition: 'color 180ms ease',
                '&:hover': { color: 'common.white' },
              }}
            >
              <MailOutlineRoundedIcon sx={{ fontSize: 19, color: 'secondary.light' }} />
              <Box component="span" sx={{ fontSize: '0.92rem' }}>
                {ORG.email}
              </Box>
            </Link>
            <Stack direction="row" spacing={1.2} alignItems="flex-start">
              <PlaceOutlinedIcon sx={{ fontSize: 19, color: 'secondary.light', mt: 0.25 }} />
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)' }}>
                  Ghana · Sierra Leone · Nigeria
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.52)' }}>
                  Pan-African delivery, community-rooted partnerships.
                </Typography>
              </Box>
            </Stack>
            <Box
              sx={{
                display: 'inline-flex',
                width: 'fit-content',
                px: 1.4,
                py: 0.75,
                border: '1px solid rgba(212,160,23,0.2)',
                borderRadius: 999,
                color: 'secondary.light',
                fontSize: '0.75rem',
                fontWeight: 750,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
              }}
            >
              African-led. Community-rooted.
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          py: 2.5,
          borderTop: '1px solid rgba(255,255,255,0.11)',
          color: 'rgba(255,255,255,0.52)',
        }}
      >
        <Typography variant="body2">
          © {new Date().getFullYear()} {ORG.name}. All rights reserved.
        </Typography>
        <Typography variant="body2" sx={{ maxWidth: 520 }}>
          Aligned with AU Agenda 2063 &amp; the UN Sustainable Development Goals.
        </Typography>
      </Stack>
    </Container>
  </Box>
);

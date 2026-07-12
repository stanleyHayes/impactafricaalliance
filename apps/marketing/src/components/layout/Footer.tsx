import { ORG, PILLARS, PRIMARY_NAV, FOOTER_LEGAL_LINKS, brandColors } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
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

const FooterHeading = ({ children }: { children: string }): JSX.Element => (
  <Typography
    variant="subtitle2"
    sx={{
      mb: 2,
      color: 'rgba(255,255,255,0.92)',
      fontWeight: 750,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      '&::after': {
        display: 'block',
        width: 24,
        height: 2,
        mt: 0.9,
        borderRadius: 99,
        bgcolor: 'secondary.main',
        content: '""',
      },
    }}
  >
    {children}
  </Typography>
);

const FooterLink = ({ to, children }: { to: string; children: ReactNode }): JSX.Element => (
  <Link
    component={RouterLink}
    to={to}
    underline="none"
    sx={{
      display: 'inline-block',
      color: 'rgba(255,255,255,0.68)',
      fontSize: '0.9rem',
      lineHeight: 1.35,
      transition: 'color 180ms ease, transform 180ms ease',
      '&:hover': {
        color: 'common.white',
        transform: 'translateX(2px)',
      },
    }}
  >
    {children}
  </Link>
);

/** Clean site footer: brand summary, useful navigation, and a focused contact path. */
export const Footer = (): JSX.Element => (
  <Box
    component="footer"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      background:
        'radial-gradient(circle at 8% 12%, rgba(245,184,0,0.10), transparent 24%), radial-gradient(circle at 92% 0%, rgba(0,214,139,0.12), transparent 28%), linear-gradient(180deg, #0B3D2E 0%, #001E14 58%, #050F16 100%)',
      color: 'common.white',
      pt: { xs: 5, md: 7 },
      '&::before': {
        position: 'absolute',
        right: { xs: -200, md: -120 },
        bottom: { xs: -220, md: -200 },
        width: { xs: 400, md: 520 },
        height: { xs: 400, md: 520 },
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '50%',
        boxShadow: `0 0 0 44px rgba(255,255,255,0.015), 0 0 0 90px ${alpha(brandColors.mint, 0.02)}`,
        content: '""',
      },
    }}
  >
    <Container sx={{ position: 'relative', zIndex: 1 }}>
      <Grid
        container
        spacing={{ xs: 4, md: 6 }}
        sx={{
          alignItems: 'center',
          pb: { xs: 4, md: 5 },
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Grid size={{ xs: 12, md: 7 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.15,
              border: '1px solid rgba(0,214,139,0.18)',
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.05)',
            }}
          >
            <Logo variant="white" height={34} />
          </Box>
          <Typography
            variant="h4"
            sx={{
              maxWidth: 560,
              mt: 2.5,
              color: 'common.white',
              fontSize: { xs: '1.6rem', md: '2rem' },
              lineHeight: 1.16,
            }}
          >
            Empowering Africa. One community at a time.
          </Typography>
          <Typography
            sx={{ mt: 1.5, maxWidth: 480, color: 'rgba(255,255,255,0.64)', lineHeight: 1.7 }}
          >
            We connect skills, opportunity, and partnerships so young people, women, and communities
            can lead lasting change.
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.58)', fontWeight: 650 }}>
              Follow
            </Typography>
            <SocialLinks color="inherit" />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              p: { xs: 2.75, md: 3.25 },
              border: '1px solid rgba(0,214,139,0.15)',
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.05)',
              boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', 0.06)}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontWeight: 750, letterSpacing: 1.6 }}
            >
              Work with IAA
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.75, color: 'common.white', fontWeight: 700 }}>
              Have an idea, partnership, or question?
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.66)', lineHeight: 1.65 }}>
              Tell us where you want to create impact and we&apos;ll route the conversation to the
              right team.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2.5 }}>
              <Link
                component={RouterLink}
                to="/get-involved#partner"
                underline="none"
                sx={{
                  display: 'inline-flex',
                  minHeight: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.75,
                  px: 2,
                  borderRadius: 999,
                  bgcolor: 'secondary.main',
                  color: brandColors.deepForest,
                  fontWeight: 800,
                  fontSize: '0.92rem',
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
                  minHeight: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.75,
                  px: 2,
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 999,
                  color: 'common.white',
                  fontWeight: 750,
                  fontSize: '0.92rem',
                  '&:hover': { borderColor: 'primary.main', color: 'primary.light' },
                }}
              >
                <MailOutlineRoundedIcon fontSize="small" />
                Email us
              </Link>
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 4, md: 6 }} sx={{ py: { xs: 4, md: 5 } }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <FooterHeading>Navigate</FooterHeading>
          <Stack spacing={1.25}>
            {PRIMARY_NAV.map((link) => (
              <FooterLink key={link.path} to={link.path}>
                {link.label}
              </FooterLink>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 5 }}>
          <FooterHeading>Initiatives</FooterHeading>
          <Stack spacing={1.25}>
            {PILLARS.map((pillar) => (
              <FooterLink key={pillar.key} to={pillar.path}>
                {pillar.title}
              </FooterLink>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 5 }}>
          <FooterHeading>Contact</FooterHeading>
          <Stack spacing={1.5}>
            <Link
              href={`mailto:${ORG.email}`}
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'rgba(255,255,255,0.72)',
                overflowWrap: 'anywhere',
                transition: 'color 180ms ease',
                '&:hover': { color: 'common.white' },
              }}
            >
              <MailOutlineRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Box component="span" sx={{ fontSize: '0.9rem' }}>
                {ORG.email}
              </Box>
            </Link>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <PlaceOutlinedIcon sx={{ fontSize: 18, color: 'primary.main', mt: 0.2 }} />
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                  Ghana · Sierra Leone · Nigeria
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.48)' }}>
                  Pan-African delivery, community-rooted partnerships.
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <Box
        sx={{
          py: 3,
          borderTop: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography variant="body2">
            © {new Date().getFullYear()} {ORG.name}. All rights reserved.
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            flexWrap="wrap"
            divider={
              <Box component="span" sx={{ color: 'rgba(255,255,255,0.22)' }}>
                |
              </Box>
            }
          >
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.path}
                component={RouterLink}
                to={link.path}
                underline="none"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.85rem',
                  '&:hover': { color: 'common.white' },
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              component="button"
              type="button"
              underline="none"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('cookie-banner:open'));
              }}
              sx={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                p: 0,
                '&:hover': { color: 'common.white' },
              }}
            >
              Manage cookies
            </Link>
          </Stack>
        </Stack>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 1.5,
            color: 'rgba(255,255,255,0.42)',
            textAlign: { xs: 'left', md: 'center' },
          }}
        >
          Aligned with AU Agenda 2063 &amp; the UN Sustainable Development Goals.
        </Typography>
      </Box>
    </Container>
  </Box>
);

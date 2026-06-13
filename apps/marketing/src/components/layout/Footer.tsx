import { ORG, PILLARS, PRIMARY_NAV } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { Logo } from '../Logo';
import { SocialLinks } from '../SocialLinks';

const FooterHeading = ({ children }: { children: string }): JSX.Element => (
  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
    {children}
  </Typography>
);

const footerLinkSx = { color: 'inherit', opacity: 0.85, '&:hover': { opacity: 1 } } as const;

/** Four-column site footer on the brand forest-green background. */
export const Footer = (): JSX.Element => (
  <Box component="footer" sx={{ bgcolor: 'primary.dark', color: 'common.white', pt: 8, pb: 4 }}>
    <Container>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.06)',
              p: 1.5,
              borderRadius: 2,
              display: 'inline-block',
            }}
          >
            <Logo variant="white" height={40} />
          </Box>
          <Typography sx={{ mt: 2, opacity: 0.9, maxWidth: 280 }}>{ORG.tagline}</Typography>
          <Box sx={{ mt: 2 }}>
            <SocialLinks color="inherit" />
          </Box>
        </Grid>

        <Grid size={{ xs: 6, md: 2 }}>
          <FooterHeading>Quick Links</FooterHeading>
          <Stack spacing={1}>
            {PRIMARY_NAV.map((link) => (
              <Link
                key={link.path}
                component={RouterLink}
                to={link.path}
                underline="hover"
                sx={footerLinkSx}
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <FooterHeading>Our Programs</FooterHeading>
          <Stack spacing={1}>
            {PILLARS.map((pillar) => (
              <Link
                key={pillar.key}
                component={RouterLink}
                to={pillar.path}
                underline="hover"
                sx={footerLinkSx}
              >
                {pillar.title}
              </Link>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <FooterHeading>Get In Touch</FooterHeading>
          <Stack spacing={1} sx={{ opacity: 0.9 }}>
            <Link href={`mailto:${ORG.email}`} underline="hover" sx={footerLinkSx}>
              {ORG.email}
            </Link>
            <Typography variant="body2">
              Regional offices: Ghana · Sierra Leone · Nigeria
            </Typography>
          </Stack>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.15)' }} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ opacity: 0.8 }}
      >
        <Typography variant="body2">
          © {new Date().getFullYear()} {ORG.name}. All rights reserved.
        </Typography>
        <Typography variant="body2">
          Aligned with AU Agenda 2063 &amp; the UN Sustainable Development Goals.
        </Typography>
      </Stack>
    </Container>
  </Box>
);

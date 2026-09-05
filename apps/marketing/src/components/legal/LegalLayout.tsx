import { ORG, brandFonts } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { Box, Button, Container, Link, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const PAGES = [
  {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    description: 'How we handle your information',
    Icon: ShieldOutlinedIcon,
  },
  {
    path: '/cookie-policy',
    label: 'Cookie Policy',
    description: 'Cookies and your preferences',
    Icon: CookieOutlinedIcon,
  },
  {
    path: '/terms-of-use',
    label: 'Terms of Use',
    description: 'Using our website and content',
    Icon: DescriptionOutlinedIcon,
  },
  {
    path: '/privacy-request',
    label: 'Privacy Request',
    description: 'Tell us what you need',
    Icon: TuneRoundedIcon,
  },
];

export const LegalLayout = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}): JSX.Element => {
  const { pathname } = useLocation();
  const current = PAGES.find((page) => page.path === pathname) ?? PAGES[0]!;
  const { Icon } = current;
  const articleRef = useRef<HTMLDivElement>(null);
  const [contents, setContents] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    if (pathname === '/privacy-request') {
      setContents([]);
      return;
    }
    const headings = Array.from(articleRef.current?.querySelectorAll('h2, h3, h4, h5') ?? []);
    setContents(
      headings.map((heading, index) => {
        heading.id = 'policy-section-' + index;
        return { id: heading.id, text: heading.textContent ?? '' };
      }),
    );
  }, [children, pathname]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box
        component="header"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          border: 1,
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.055),
        }}
      >
        <Icon
          aria-hidden
          sx={{
            position: 'absolute',
            right: { xs: -30, md: 40 },
            bottom: -45,
            fontSize: { xs: 220, md: 275 },
            color: 'text.secondary',
            opacity: 0.07,
            transform: 'rotate(-12deg)',
          }}
        />
        <Box
          component="svg"
          viewBox="0 0 360 260"
          aria-hidden
          focusable="false"
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            color: 'text.secondary',
            opacity: 0.08,
            pointerEvents: 'none',
          }}
        >
          <g fill="none" stroke="currentColor">
            <circle cx="290" cy="150" r="105" />
            <circle cx="290" cy="150" r="140" />
            <path d="M40 215 150 60 290 150 350 35M150 60 350 35M40 215 290 150" />
          </g>
          <g fill="currentColor">
            <circle cx="40" cy="215" r="4" />
            <circle cx="150" cy="60" r="4" />
            <circle cx="290" cy="150" r="4" />
          </g>
        </Box>
        <Box sx={{ position: 'relative', maxWidth: 680 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
            <Icon sx={{ fontSize: 20 }} />
            <Typography variant="overline" sx={{ letterSpacing: 2 }}>
              Privacy &amp; trust
            </Typography>
          </Stack>
          <Typography
            component="h1"
            sx={{
              mt: 1.5,
              fontFamily: brandFonts.heading,
              fontWeight: 600,
              fontSize: { xs: '2.5rem', md: '3.6rem' },
              lineHeight: 1.1,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 550, lineHeight: 1.7 }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '250px minmax(0, 1fr)' },
          gap: { xs: 3, md: 5 },
          mt: { xs: 3, md: 5 },
          alignItems: 'start',
        }}
      >
        <Box component="aside" sx={{ position: { md: 'sticky' }, top: 110, minWidth: 0 }}>
          <Box
            component="nav"
            aria-label="Privacy and legal pages"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: '1fr' },
              gap: 1,
            }}
          >
            {PAGES.map(({ path, label, description, Icon: NavIcon }) => (
              <Box
                component={RouterLink}
                to={path}
                key={path}
                aria-current={pathname === path ? 'page' : undefined}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.25,
                  p: 1.5,
                  border: 1,
                  borderColor: pathname === path ? 'text.secondary' : 'divider',
                  borderRadius: 2.5,
                  color: 'text.primary',
                  textDecoration: 'none',
                  bgcolor: (theme) =>
                    alpha(theme.palette.text.secondary, pathname === path ? 0.1 : 0.025),
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                <NavIcon sx={{ fontSize: 21, mt: 0.25, color: 'text.secondary' }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 650, fontSize: '.9rem' }}>{label}</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.45 }}
                  >
                    {description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          {contents.length > 0 && (
            <Box
              component="nav"
              aria-label="On this page"
              sx={{ mt: 3, display: { xs: 'none', md: 'block' } }}
            >
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
                On this page
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1, maxHeight: '36vh', overflowY: 'auto', pr: 1 }}>
                {contents.map(({ id, text }) => (
                  <Link
                    key={id}
                    href={'#' + id}
                    color="text.secondary"
                    underline="hover"
                    sx={{ fontSize: '.82rem', lineHeight: 1.5, py: 0.35 }}
                  >
                    {text}
                  </Link>
                ))}
              </Stack>
            </Box>
          )}
          {pathname === '/cookie-policy' && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<TuneRoundedIcon />}
              onClick={() => window.dispatchEvent(new CustomEvent('cookie-banner:open'))}
              sx={{ mt: 2, width: '100%', borderColor: 'divider' }}
            >
              Cookie preferences
            </Button>
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box
            ref={articleRef}
            component="article"
            sx={{
              color: 'text.primary',
              maxWidth: 760,
              overflowWrap: 'anywhere',
              '& h2, & h3, & h4, & h5': {
                scrollMarginTop: 130,
                fontFamily: brandFonts.body,
                fontWeight: 700,
                fontSize: { xs: '1.25rem', md: '1.4rem' },
                lineHeight: 1.35,
              },
              '& section': { pb: 2, mb: 3, borderBottom: 1, borderColor: 'divider' },
              '& section:last-child': { borderBottom: 0 },
              '& p, & li': { lineHeight: 1.85 },
              '& a': {
                color: 'text.primary',
                textDecorationColor: 'text.secondary',
                textUnderlineOffset: 4,
              },
            }}
          >
            {children}
          </Box>
          <Box
            sx={{
              mt: 3,
              p: 2.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.04),
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
            }}
          >
            <MailOutlineRoundedIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 650 }}>Need to talk to us?</Typography>
              <Link
                href={'mailto:' + ORG.email}
                color="text.secondary"
                sx={{ fontSize: '.9rem', overflowWrap: 'anywhere' }}
              >
                {ORG.email}
              </Link>
              {pathname !== '/privacy-request' && (
                <Box>
                  <Button
                    component={RouterLink}
                    to="/privacy-request"
                    color="inherit"
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{ mt: 1, px: 0 }}
                  >
                    Make a privacy request
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

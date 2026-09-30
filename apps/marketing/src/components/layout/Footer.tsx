import {
  ORG,
  PILLARS,
  PRIMARY_NAV,
  FOOTER_LEGAL_LINKS,
  brandColors,
  formatOfficeAddress,
  type Office,
  type PillarDefinition,
  type SiteSetting,
} from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { programIcon } from '../../content/icons';
import { findProgram } from '../../content/programs';
import { useOffices, useSiteSettings } from '../../lib/content-hooks';
import { Logo } from '../Logo';
import { SocialLinks } from '../SocialLinks';

/** Used only until Site Settings loads, or if a field has not been filled in yet. */
const FALLBACK_PRESENCE = ['Ghana', 'Nigeria', 'Sierra Leone'];

/**
 * The header's menus draw these pages with the same marks, so a destination
 * looks alike wherever it is offered. Home and About have none there, so theirs
 * come from the same rounded set.
 */
const NAV_ICONS: Record<string, SvgIconComponent> = {
  '/': HomeRoundedIcon,
  '/about': InfoRoundedIcon,
  '/our-work': LayersRoundedIcon,
  '/impact': InsightsRoundedIcon,
  '/get-involved': VolunteerActivismRoundedIcon,
  '/resources': MenuBookRoundedIcon,
  '/contact': MailRoundedIcon,
};

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

const listSx = { m: 0, p: 0, listStyle: 'none' } as const;

/** One keyboard ring for every link in the footer, so focus looks the same as it moves. */
const focusRingSx = {
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
} as const;

const navigateLinkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1.25,
  // Room inside the focus ring on either side; the negative margin keeps the
  // icon in line with the heading above.
  py: 0.5,
  px: 0.75,
  mx: -0.75,
  borderRadius: 2,
  color: 'rgba(255,255,255,0.72)',
  fontSize: '0.9rem',
  lineHeight: 1.35,
  transition: 'color 180ms ease, transform 180ms ease',
  '& .MuiSvgIcon-root': {
    fontSize: 18,
    color: 'primary.main',
    transition: 'color 180ms ease',
  },
  '&:hover': { color: 'common.white', transform: 'translateX(2px)' },
  '&:hover .MuiSvgIcon-root': { color: 'primary.light' },
  ...focusRingSx,
  [reducedMotion]: { '&:hover': { transform: 'none' } },
} as const;

/*
  One programme per row on a small phone and on a desktop. In between, a row
  would run far past its text and end in half a card of nothing, so the cards
  pair up, two to a row, each with its mark above its name.
*/
const pairedCards = '@media (min-width: 480px) and (max-width: 899.95px)';

const initiativeListSx = {
  ...listSx,
  display: 'grid',
  gap: 1.25,
  gridTemplateColumns: 'minmax(0, 1fr)',
  [pairedCards]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  // Each card fills its cell, so two cards side by side end on the same line.
  '& > li': { display: 'grid' },
} as const;

const initiativeLinkSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  p: 1.25,
  [pairedCards]: { flexDirection: 'column', alignItems: 'stretch', p: 1.5 },
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2.5,
  bgcolor: 'rgba(255,255,255,0.03)',
  transition: 'background-color 180ms ease, border-color 180ms ease, transform 180ms ease',
  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.06)',
    borderColor: alpha(brandColors.mint, 0.32),
    transform: 'translateY(-1px)',
  },
  // The tile turns gold on hover, the same colour the programme cards use for it.
  '&:hover .initiative-tile': {
    borderColor: 'transparent',
    bgcolor: 'secondary.main',
    color: brandColors.deepForest,
  },
  '&:hover .initiative-title': { color: 'common.white' },
  ...focusRingSx,
  [reducedMotion]: { '&:hover': { transform: 'none' } },
} as const;

const initiativeSummarySx = {
  display: '-webkit-box',
  mt: 0.35,
  overflow: 'hidden',
  color: 'rgba(255,255,255,0.62)',
  fontSize: '0.8rem',
  lineHeight: 1.5,
  // Even lines in a narrow card, rather than one full line and a word or two.
  textWrap: 'balance',
  // Every summary fits in two lines of the narrowest card; the clamp is only a guard.
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
} as const;

// Icon level with the first line, so an address that breaks after its "@" still reads cleanly.
const contactLinkSx = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1,
  borderRadius: 1,
  color: 'rgba(255,255,255,0.72)',
  transition: 'color 180ms ease',
  '&:hover': { color: 'common.white' },
  '& .MuiSvgIcon-root': { mt: '2px' },
  '& > span': { fontSize: '0.9rem', lineHeight: 1.5 },
  ...focusRingSx,
} as const;

const phoneLinkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  mt: 0.25,
  borderRadius: 1,
  color: 'rgba(255,255,255,0.72)',
  fontSize: '0.9rem',
  transition: 'color 180ms ease',
  '&:hover': { color: 'common.white' },
  ...focusRingSx,
} as const;

const iconSx = { fontSize: 18, color: 'primary.main' } as const;

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

/**
 * On a phone the links share rows, as many as fit, so seven short links make
 * neither a long single file nor a row that stops halfway across.
 */
const NavigateList = (): JSX.Element => (
  <Box
    component="ul"
    sx={{
      ...listSx,
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(128px, 1fr))', sm: 'minmax(0, 1fr)' },
      columnGap: 2,
      rowGap: { xs: 1, sm: 1.5, md: 1.75 },
      '& > li': { display: 'flex' },
    }}
  >
    {PRIMARY_NAV.map((link) => {
      const Icon = NAV_ICONS[link.path] ?? ChevronRightRoundedIcon;
      return (
        <li key={link.path}>
          <Link component={RouterLink} to={link.path} underline="none" sx={navigateLinkSx}>
            <Icon aria-hidden />
            {link.label}
          </Link>
        </li>
      );
    })}
  </Box>
);

/**
 * One programme as a single link: its mark, its name, and a short summary,
 * so the column says what each initiative is instead of only naming it. The
 * name labels the link and the summary describes it, so a screen reader
 * announces the name first.
 */
const InitiativeLink = ({ pillar }: { pillar: PillarDefinition }): JSX.Element => {
  const id = useId();
  const Icon = programIcon(pillar.key);
  // A line written for this space; the full description only for a programme without one.
  const summary = findProgram(pillar.key)?.summary ?? pillar.description;
  return (
    <Link
      component={RouterLink}
      to={pillar.path}
      underline="none"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      sx={initiativeLinkSx}
    >
      <Box
        className="initiative-tile"
        sx={{
          display: 'grid',
          width: 38,
          height: 38,
          flexShrink: 0,
          placeItems: 'center',
          border: `1px solid ${alpha(brandColors.mint, 0.22)}`,
          borderRadius: 2,
          bgcolor: alpha(brandColors.mint, 0.1),
          color: 'primary.main',
          transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
        }}
      >
        <Icon aria-hidden sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box
          component="span"
          id={`${id}-title`}
          className="initiative-title"
          sx={{
            display: 'block',
            color: 'rgba(255,255,255,0.92)',
            fontSize: '0.9rem',
            fontWeight: 650,
            lineHeight: 1.3,
            // "Innovation Hub" together on the second line rather than "Hub" alone.
            textWrap: 'balance',
            transition: 'color 180ms ease',
          }}
        >
          {pillar.title}
        </Box>
        <Box component="span" id={`${id}-text`} sx={initiativeSummarySx}>
          {summary}
        </Box>
      </Box>
    </Link>
  );
};

/** The address may break after its "@" in a narrow column, rather than mid-word. */
const breakableEmail = (email: string): ReactNode => {
  const at = email.indexOf('@');
  if (at < 1) return email;
  return (
    <>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </>
  );
};

const ContactSection = ({ email, whatsapp }: { email: string; whatsapp?: string }): JSX.Element => (
  <Box sx={{ gridArea: 'contact' }}>
    <FooterHeading>Contact</FooterHeading>
    {/* Side by side when the column is wide enough, one per line when it is not. */}
    <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1.25 }}>
      {/* Named outright: Chrome reads the break opportunity as a space inside the address. */}
      <Link
        href={`mailto:${email}`}
        aria-label={email}
        underline="none"
        sx={{ ...contactLinkSx, overflowWrap: 'anywhere' }}
      >
        <MailOutlineRoundedIcon aria-hidden sx={iconSx} />
        <span>{breakableEmail(email)}</span>
      </Link>
      {whatsapp && (
        <Link
          href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={contactLinkSx}
        >
          <WhatsAppIcon aria-hidden sx={iconSx} />
          <span>{whatsapp}</span>
        </Link>
      )}
    </Box>
  </Box>
);

/** Used only when no offices exist yet, so a fresh install still shows a location. */
const siteAddress = (site: SiteSetting | undefined): string =>
  site ? [site.addressLine1, site.city, site.country].filter(Boolean).join(', ') : '';

/**
 * One office, with the number for that office rather than one shared number.
 *
 * The organisation works across two countries, and somebody in Abuja ringing a
 * Ghanaian number is a small failure that is entirely avoidable — each office
 * carries its own phone on its own record.
 */
const OfficeBlock = ({ office }: { office: Office }): JSX.Element => (
  <Stack direction="row" spacing={1} alignItems="flex-start">
    <PlaceOutlinedIcon aria-hidden sx={{ ...iconSx, mt: 0.2 }} />
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'primary.main', fontWeight: 700, letterSpacing: 0.6 }}
      >
        {office.label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', textWrap: 'pretty' }}>
        {formatOfficeAddress(office)}
      </Typography>
      {office.phone && (
        <Link href={`tel:${office.phone.replace(/[^+\d]/g, '')}`} underline="none" sx={phoneLinkSx}>
          <CallOutlinedIcon aria-hidden sx={{ fontSize: 16, color: 'primary.main' }} />
          {office.phone}
        </Link>
      )}
    </Box>
  </Stack>
);

/*
  Offices sit under their own heading rather than trailing the email address.
  Someone looking for the Abuja number is looking for a place, and a list of
  places is where they will look for it.
*/
const OfficesSection = ({ site }: { site: SiteSetting | undefined }): JSX.Element => {
  const { data: officeData } = useOffices();
  const offices = officeData?.items ?? [];
  const fallbackAddress = siteAddress(site);

  return (
    <Box sx={{ gridArea: 'offices', mt: { xs: 4, sm: 0, md: 3.5 } }}>
      <FooterHeading>Offices</FooterHeading>
      <Stack spacing={2}>
        {offices.map((office) => (
          <OfficeBlock key={office.id} office={office} />
        ))}
        {offices.length === 0 && fallbackAddress && (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <PlaceOutlinedIcon aria-hidden sx={{ ...iconSx, mt: 0.2 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              {fallbackAddress}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

const PresenceLine = ({ site }: { site: SiteSetting | undefined }): JSX.Element => {
  const presence = site?.regionalPresence?.length ? site.regionalPresence : FALLBACK_PRESENCE;
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      sx={{ gridArea: 'presence', mt: { xs: 2, sm: 3, md: 2 } }}
    >
      {/* A line globe: the solid one outweighed the pin, mail and phone marks around it. */}
      <LanguageOutlinedIcon aria-hidden sx={{ ...iconSx, mt: 0.2 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          {presence.join(' · ')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            color: 'rgba(255,255,255,0.56)',
            lineHeight: 1.5,
            textWrap: 'balance',
          }}
        >
          {/* Kept whole, so a narrow column breaks after the comma, not after "community-". */}
          Pan-African delivery,{' '}
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
            community-rooted
          </Box>{' '}
          partnerships.
        </Typography>
      </Box>
    </Stack>
  );
};

/** Column gap of the link columns; the tablet split of the contact row uses the same. */
const COLUMN_GAP = { xs: 4, md: 5, lg: 6 } as const;

/*
  One column from 900px up: contact, then offices, then the regions. On a
  tablet it is a row of its own under Navigate and Initiatives, with contact
  and the regions beside the offices. The first track is about as wide as the
  email address, which stays on one line, and the long addresses get the rest.
*/
const reachSx = {
  display: 'grid',
  alignContent: 'start',
  columnGap: COLUMN_GAP.xs,
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'minmax(250px, 1fr) minmax(0, 2fr)',
    md: 'minmax(0, 1fr)',
  },
  // The second row takes whatever the offices need beyond the contact block,
  // so the regions sit straight under the contact details.
  gridTemplateRows: { sm: 'auto 1fr', md: 'none' },
  gridTemplateAreas: {
    xs: '"contact" "offices" "presence"',
    sm: '"contact offices" "presence offices"',
    md: '"contact" "offices" "presence"',
  },
} as const;

const ctaSx = {
  display: 'inline-flex',
  minHeight: 42,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0.75,
  // The same side padding as the header's pill, so a label never sits against the edge.
  px: 2.5,
  borderRadius: 999,
  fontSize: '0.92rem',
  // A label that wraps inside a pill reads as broken; the pill moves to the next line instead.
  whiteSpace: 'nowrap',
  ...focusRingSx,
} as const;

const legalLinkSx = {
  borderRadius: 1,
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.85rem',
  '&:hover': { color: 'common.white' },
  ...focusRingSx,
} as const;

/*
  Each item draws the bar before it, and the list is pulled left by one bar
  and its margins (1px + 16px each side), so the bar in front of whichever
  link starts a line falls outside the clip and a wrapped line never starts
  or ends with a stray separator. The bar is positioned rather than laid out,
  so each item's baseline stays its link's and the copyright can line up with it.
*/
const legalListSx = {
  ...listSx,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  rowGap: 1,
  ml: '-33px',
  '& > li': { position: 'relative', display: 'flex', pl: '33px' },
  '& > li::before': {
    position: 'absolute',
    top: '50%',
    left: '16px',
    width: '1px',
    height: 14,
    mt: '-7px',
    bgcolor: 'rgba(255,255,255,0.22)',
    content: '""',
  },
} as const;

/** Clean site footer: brand summary, useful navigation, and a focused contact path. */
export const Footer = (): JSX.Element => {
  const { data: site } = useSiteSettings();
  const email = site?.contactEmail ?? ORG.email;

  return (
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
          {/* Half each below 1200px, so the card keeps room for both buttons on one line. */}
          <Grid size={{ xs: 12, md: 6, lg: 7 }}>
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
              sx={{
                mt: 1.5,
                maxWidth: 480,
                color: 'rgba(255,255,255,0.64)',
                lineHeight: 1.7,
                // No last word left alone on its line when the column is narrow.
                textWrap: 'pretty',
              }}
            >
              We connect skills, opportunity, and partnerships so young people, women, and
              communities can lead lasting change.
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2.5 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.58)', fontWeight: 650 }}>
                Follow
              </Typography>
              <SocialLinks color="inherit" />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 5 }}>
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
              <Typography
                variant="h6"
                // Two even lines in a narrow card rather than "question?" on its own.
                sx={{ mt: 0.75, color: 'common.white', fontWeight: 700, textWrap: 'balance' }}
              >
                Have an idea, partnership, or question?
              </Typography>
              <Typography
                sx={{
                  mt: 1,
                  color: 'rgba(255,255,255,0.66)',
                  lineHeight: 1.65,
                  textWrap: 'pretty',
                }}
              >
                Tell us where you want to create impact and we&apos;ll route the conversation to the
                right team.
              </Typography>
              {/*
                Each pill as wide as its label, never stretched across the card:
                side by side while both fit, the second on a line of its own when not.
              */}
              <Stack direction="row" flexWrap="wrap" spacing={1.25} useFlexGap sx={{ mt: 2.5 }}>
                <Link
                  component={RouterLink}
                  to="/get-involved#partner"
                  underline="none"
                  sx={{
                    ...ctaSx,
                    bgcolor: 'secondary.main',
                    color: brandColors.deepForest,
                    fontWeight: 800,
                    '&:hover': { bgcolor: 'secondary.light' },
                  }}
                >
                  Partner with us
                  <ArrowForwardRoundedIcon fontSize="small" />
                </Link>
                <Link
                  href={`mailto:${email}`}
                  underline="none"
                  sx={{
                    ...ctaSx,
                    border: '1px solid rgba(255,255,255,0.16)',
                    color: 'common.white',
                    fontWeight: 750,
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

        {/*
          Three columns that finish at about the same line: the links, the
          programmes with a line each, and every way to reach the team. From
          600px up Navigate takes only the width its links need, so no blank
          opens between them and the programmes; on a tablet the programme
          cards pair up to fill the rest of that row.
        */}
        <Grid container spacing={COLUMN_GAP} sx={{ py: { xs: 4, md: 5 } }}>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <FooterHeading>Navigate</FooterHeading>
            <NavigateList />
          </Grid>

          <Grid size={{ xs: 12, sm: 'grow' }}>
            <FooterHeading>Initiatives</FooterHeading>
            <Box component="ul" sx={initiativeListSx}>
              {PILLARS.map((pillar) => (
                <li key={pillar.key}>
                  <InitiativeLink pillar={pillar} />
                </li>
              ))}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 'grow' }} sx={reachSx}>
            <ContactSection email={email} whatsapp={site?.whatsappPhone ?? site?.contactPhone} />
            <OfficesSection site={site} />
            <PresenceLine site={site} />
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
            // On the first line of links' baseline, whether or not they wrap onto a second.
            alignItems={{ xs: 'flex-start', md: 'baseline' }}
            justifyContent="space-between"
            spacing={2}
            // Gaps rather than margins, so the clipped list below keeps its own.
            useFlexGap
          >
            {/* One line beside the links; they wrap instead when the row is tight. */}
            <Typography variant="body2" sx={{ flexShrink: { md: 0 } }}>
              © {new Date().getFullYear()} {ORG.name}. All rights reserved.
            </Typography>
            {/* The clip for the separators, with 4px of room for focus rings inside it. */}
            <Box sx={{ minWidth: 0, m: '-4px', p: '4px', overflow: 'hidden' }}>
              <Box component="ul" sx={legalListSx}>
                {FOOTER_LEGAL_LINKS.map((link) => (
                  <li key={link.path}>
                    <Link component={RouterLink} to={link.path} underline="none" sx={legalLinkSx}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    component="button"
                    type="button"
                    underline="none"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('cookie-banner:open'));
                    }}
                    sx={{
                      ...legalLinkSx,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      p: 0,
                    }}
                  >
                    Manage cookies
                  </Link>
                </li>
              </Box>
            </Box>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1.5,
              // 0.42 measured 4.0:1 on the darkest part of the gradient; this clears 4.5:1.
              color: 'rgba(255,255,255,0.5)',
              textAlign: { xs: 'left', md: 'center' },
              textWrap: 'pretty',
            }}
          >
            Aligned with AU Agenda 2063 &amp; the UN Sustainable Development Goals.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

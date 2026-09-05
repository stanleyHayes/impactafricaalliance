import { ORG, brandColors, formatOfficeAddress, type SiteSetting } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { MintSurface } from '../components/MintSurface';
import { PageCta } from '../components/PageCta';
import { Seo } from '../components/Seo';
import { SocialLinks } from '../components/SocialLinks';
import { Watermark } from '../components/Watermark';
import { IMAGES } from '../content/images';
import { ContactForm } from '../features/forms/ContactForm';
import {
  useOffices,
  usePageCopy,
  useSiteSettings,
  type PageCopyDefaults,
} from '../lib/content-hooks';

/** Used only until Site Settings loads, or if a field has not been filled in yet. */
const FALLBACK_REGIONS = ['Nigeria', 'Sierra Leone'] as const;
const FALLBACK_HEAD_OFFICE = 'Atlantic Tower Airport City, Accra — Ghana';

/** `+233 50 661 9598` → `233506619598`, the form wa.me expects. */
const toWhatsAppHref = (phone: string): string => `https://wa.me/${phone.replace(/[^\d]/g, '')}`;

interface ContactDetailProps {
  icon: SvgIconComponent;
  label: string;
  children: ReactNode;
}

const ContactDetail = ({ icon: Icon, label, children }: ContactDetailProps): JSX.Element => (
  <Stack direction="row" spacing={2} alignItems="flex-start">
    <Box
      className="mint-glass"
      sx={{
        display: 'grid',
        width: 46,
        height: 46,
        flexShrink: 0,
        placeItems: 'center',
        border: 1,
        borderRadius: 2,
      }}
    >
      <Icon sx={{ fontSize: 22 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="overline"
        sx={{ color: 'rgba(14,42,34,0.58)', fontWeight: 700, letterSpacing: 1.3 }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: -0.35, fontSize: '0.95rem', lineHeight: 1.6 }}>{children}</Box>
    </Box>
  </Stack>
);

const ContactHero = ({
  copy,
  heroImage,
}: {
  copy: PageCopyDefaults;
  heroImage: string;
}): JSX.Element => {
  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        minHeight: { xs: 540, md: 620 },
        overflow: 'hidden',
        bgcolor: 'primary.dark',
        color: 'common.white',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${heroImage})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(8,31,19,0.96) 0%, rgba(8,31,19,0.88) 52%, rgba(8,31,19,0.42) 100%), linear-gradient(0deg, rgba(8,31,19,0.64), transparent 55%)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: -180, md: -80 },
          bottom: -260,
          width: { xs: 430, md: 620 },
          height: { xs: 430, md: 620 },
          border: `1px solid ${alpha(brandColors.gold, 0.18)}`,
          borderRadius: '50%',
          boxShadow: `0 0 0 52px ${alpha(brandColors.gold, 0.025)}, 0 0 0 104px ${alpha(brandColors.gold, 0.018)}`,
        }}
      />

      <Container
        sx={{
          position: 'relative',
          display: 'flex',
          minHeight: { xs: 540, md: 620 },
          alignItems: 'center',
          py: { xs: 8, md: 11 },
        }}
      >
        <Grid container spacing={5} sx={{ alignItems: 'center', width: '100%' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" alignItems="center" spacing={1.3}>
              <Box sx={{ width: 38, height: 2, bgcolor: 'secondary.main' }} />
              <Typography
                variant="overline"
                sx={{ color: 'secondary.light', fontWeight: 700, letterSpacing: 2 }}
              >
                {copy.heroEyebrow}
              </Typography>
            </Stack>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                maxWidth: 760,
                mt: 2,
                color: 'common.white',
                fontSize: { xs: '2.65rem', sm: '3.3rem', md: '4.5rem' },
                lineHeight: 1.04,
                letterSpacing: '-0.025em',
              }}
            >
              {copy.heroTitle}
            </Typography>
            <Typography
              sx={{
                maxWidth: 650,
                mt: 3,
                color: 'rgba(255,255,255,0.76)',
                fontSize: { xs: '1rem', md: '1.18rem' },
                lineHeight: 1.75,
              }}
            >
              {copy.heroSubtitle}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                maxWidth: 330,
                ml: { md: 'auto' },
                p: 3,
                border: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    display: 'grid',
                    width: 46,
                    height: 46,
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: alpha(brandColors.gold, 0.16),
                    color: 'secondary.light',
                  }}
                >
                  <ScheduleRoundedIcon />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>A human response</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>
                    Usually within 2 business days
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.14)' }} />
              <Stack direction="row" spacing={1} alignItems="center">
                <PublicRoundedIcon sx={{ color: 'secondary.light', fontSize: 19 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.84rem' }}>
                  Supporting enquiries across West Africa and beyond
                </Typography>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

interface ResolvedContact {
  email: string;
  whatsapp?: string;
  headOffice: string;
  regions: readonly string[];
}

/** Merge CMS site settings over the static defaults the site ships with. */
const resolveContact = (site: SiteSetting | undefined): ResolvedContact => {
  if (!site) {
    return { email: ORG.email, headOffice: FALLBACK_HEAD_OFFICE, regions: FALLBACK_REGIONS };
  }
  const street = [site.addressLine1, site.addressLine2, site.city].filter(Boolean).join(', ');
  return {
    email: site.contactEmail,
    whatsapp: site.whatsappPhone ?? site.contactPhone,
    headOffice: site.country ? `${street} — ${site.country}` : street,
    regions: site.regionalPresence?.length ? site.regionalPresence : FALLBACK_REGIONS,
  };
};

/** Keep direct contact methods together without making offices stretch the form column. */
const ContactChannels = (): JSX.Element => {
  const { data: site } = useSiteSettings();
  const { email, whatsapp } = resolveContact(site);

  return (
    <MintSurface
      component="section"
      aria-label="Contact details"
      sx={{
        borderRadius: 3,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(240px, 1fr))' },
        px: { xs: 2.5, md: 1 },
        py: { xs: 1, md: 0 },
        '& > *': { py: 3, px: { md: 2.5 }, minWidth: 0 },
        '& > * + *': {
          borderTop: { xs: '1px solid rgba(14,42,34,0.16)', md: 0 },
          borderLeft: { md: '1px solid rgba(14,42,34,0.16)' },
        },
        '& a': {
          fontWeight: 650,
          overflowWrap: 'anywhere',
          textDecorationColor: 'rgba(14,42,34,0.35)',
        },
      }}
    >
      <ContactDetail icon={EmailRoundedIcon} label="Email">
        <Link href={`mailto:${email}`}>{email}</Link>
      </ContactDetail>
      {whatsapp && (
        <ContactDetail icon={WhatsAppIcon} label="WhatsApp">
          <Link href={toWhatsAppHref(whatsapp)} target="_blank" rel="noopener noreferrer">
            {whatsapp}
          </Link>
        </ContactDetail>
      )}
      {site?.alternatePhone && (
        <ContactDetail
          icon={PhoneRoundedIcon}
          label={site.alternatePhoneLabel ?? 'Alternate phone'}
        >
          <Link href={`tel:${site.alternatePhone.replace(/\s/g, '')}`}>{site.alternatePhone}</Link>
        </ContactDetail>
      )}
    </MintSurface>
  );
};

const ContactLocations = (): JSX.Element => {
  const { data: site } = useSiteSettings();
  const { data: officeData } = useOffices();
  const { headOffice, regions } = resolveContact(site);
  const offices = officeData?.items ?? [];
  const locations = offices.length
    ? offices.map((office) => ({
        id: office.id,
        label: office.label,
        country: office.country,
        address: formatOfficeAddress(office),
        phone: office.phone,
        mapUrl: office.mapUrl,
      }))
    : [
        {
          id: 'head-office',
          label: 'Head office',
          country: site?.country ?? 'Ghana',
          address: headOffice,
          phone: undefined,
          mapUrl: site?.mapUrl,
        },
      ];

  return (
    <Box
      component="section"
      aria-labelledby="contact-locations-title"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        py: { xs: 5, md: 7 },
      }}
    >
      <Watermark
        variant="radar"
        position="top-right"
        size={{ xs: 220, md: 360 }}
        opacity={0.045}
        sx={{ color: 'primary.main' }}
      />
      <Container sx={{ position: 'relative' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          spacing={3}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: 1.6, color: 'text.secondary' }}
            >
              Find us
            </Typography>
            <Typography
              id="contact-locations-title"
              component="h2"
              variant="h3"
              sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.65rem' } }}
            >
              Closer to your community.
            </Typography>
          </Box>
          <Box sx={{ alignSelf: { md: 'flex-end' } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
              <PublicRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontWeight: 650 }}>
                Regional presence
              </Typography>
            </Stack>
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
              {regions.map((region) => (
                <Chip key={region} label={region} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: `repeat(${Math.min(locations.length, 2)}, minmax(0, 1fr))`,
              lg: `repeat(${Math.min(locations.length, 3)}, minmax(0, 1fr))`,
            },
            gap: 2.5,
          }}
        >
          {locations.map((location) => (
            <Box
              key={location.id}
              component="article"
              aria-label={location.label}
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                p: { xs: 2.5, md: 3.5 },
                border: 1,
                borderColor: 'divider',
                borderRadius: 3,
                bgcolor: 'background.default',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1.4 }}
                >
                  {location.country}
                </Typography>
                <PlaceRoundedIcon sx={{ color: 'primary.main', fontSize: 28 }} />
              </Stack>
              <Typography component="h3" variant="h5" sx={{ mt: 2, mb: 1 }}>
                {location.label}
              </Typography>
              <Typography
                component="address"
                sx={{
                  color: 'text.secondary',
                  fontStyle: 'normal',
                  lineHeight: 1.7,
                  maxWidth: 480,
                  flexGrow: 1,
                  overflowWrap: 'anywhere',
                }}
              >
                {location.address}
              </Typography>
              {(location.phone || location.mapUrl) && (
                <Stack
                  direction="row"
                  useFlexGap
                  flexWrap="wrap"
                  gap={2.5}
                  sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}
                >
                  {location.phone && (
                    <Link
                      href={`tel:${location.phone.replace(/\s/g, '')}`}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        fontSize: '0.9rem',
                        color: 'text.primary',
                      }}
                    >
                      <PhoneRoundedIcon sx={{ fontSize: 17 }} />
                      {location.phone}
                    </Link>
                  )}
                  {location.mapUrl && (
                    <Link
                      href={location.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Get directions to ${location.label}`}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        fontSize: '0.9rem',
                        fontWeight: 650,
                        color: 'text.primary',
                      }}
                    >
                      Get directions
                      <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
                    </Link>
                  )}
                </Stack>
              )}
            </Box>
          ))}
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2.5}
          sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}
        >
          <Stack direction="row" alignItems="center" useFlexGap flexWrap="wrap" gap={2}>
            <Typography variant="body2" color="text.secondary">
              Follow the journey
            </Typography>
            <SocialLinks color="inherit" />
          </Stack>
          <Link
            href={ORG.website}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '0.85rem',
              color: 'text.secondary',
              overflowWrap: 'anywhere',
            }}
          >
            <LanguageRoundedIcon sx={{ fontSize: 18 }} />
            impactafricaalliance.org
          </Link>
        </Stack>
      </Container>
    </Box>
  );
};

interface EnquiryPathProps {
  icon: SvgIconComponent;
  title: string;
  description: string;
  to: string;
  action: string;
}

const EnquiryPath = ({
  icon: Icon,
  title,
  description,
  to,
  action,
}: EnquiryPathProps): JSX.Element => (
  <Box
    component={RouterLink}
    to={to}
    sx={{
      display: 'flex',
      gap: 2,
      py: 2.5,
      color: 'text.primary',
      textDecoration: 'none',
      borderTop: 1,
      borderColor: 'divider',
      '& .path-arrow': { transition: 'transform 180ms ease' },
      '&:hover .path-arrow, &:focus-visible .path-arrow': { transform: 'translateX(4px)' },
      '&:focus-visible': {
        outline: '2px solid',
        outlineColor: 'primary.main',
        outlineOffset: 4,
        borderRadius: 1,
      },
      '@media (prefers-reduced-motion: reduce)': {
        '& .path-arrow': { transition: 'none', transform: 'none' },
      },
    }}
  >
    <Icon sx={{ mt: 0.25, fontSize: 23, color: 'text.secondary' }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography component="h3" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>
        {description}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.25 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {action}
        </Typography>
        <ArrowForwardRoundedIcon className="path-arrow" sx={{ fontSize: 17 }} />
      </Stack>
    </Box>
  </Box>
);

const EnquiryPaths = (): JSX.Element => (
  <Box
    component="aside"
    aria-labelledby="contact-paths-title"
    sx={{ pt: { md: 2 }, pr: { md: 2 } }}
  >
    <Typography
      variant="overline"
      sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1.6 }}
    >
      Find the right path
    </Typography>
    <Typography
      id="contact-paths-title"
      component="h2"
      variant="h3"
      sx={{ mt: 1.5, mb: 2, fontSize: { xs: '2rem', md: '2.6rem' }, lineHeight: 1.15 }}
    >
      A conversation can change things.
    </Typography>
    <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
      Ask a question, share an idea, or find your place in the Alliance.
    </Typography>
    <EnquiryPath
      icon={MarkEmailReadRoundedIcon}
      title="General enquiries"
      description="Programme questions, media, feedback, or a new idea."
      to="/contact#contact-form"
      action="Use the contact form"
    />
    <EnquiryPath
      icon={HandshakeRoundedIcon}
      title="Explore a partnership"
      description="Bring your organisation's expertise and support to our work."
      to="/get-involved#partner"
      action="Partnership enquiries"
    />
    <EnquiryPath
      icon={Diversity3RoundedIcon}
      title="Volunteer or mentor"
      description="Share your time and knowledge with the next generation."
      to="/get-involved#volunteer"
      action="Join the network"
    />
  </Box>
);

const Contact = (): JSX.Element => {
  const copy = usePageCopy('contact', {
    seoTitle: 'Contact Us',
    seoDescription:
      "Reach out to Impact Africa Alliance and let's build something impactful together.",
    heroEyebrow: 'Start a conversation',
    heroTitle: "Let's build something meaningful together.",
    heroSubtitle:
      'Whether you have a question, an idea, or an opportunity to collaborate, our team is ready to listen.',
  });

  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <ContactHero copy={copy} heroImage={copy.heroImageUrl ?? IMAGES.programs['stem-learning']} />

      <Box
        component="section"
        aria-labelledby="contact-form-title"
        sx={{ position: 'relative', bgcolor: 'background.default', py: { xs: 5, md: 8 } }}
      >
        <Container>
          <ContactChannels />
          <Grid
            container
            spacing={{ xs: 4, md: 6 }}
            sx={{ alignItems: 'flex-start', mt: { xs: 4, md: 6 } }}
          >
            <Grid size={{ xs: 12, md: 8 }}>
              <Box
                id="contact-form"
                sx={{
                  p: { xs: 2.5, sm: 4, md: 4.5 },
                  scrollMarginTop: 110,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 4,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: 1.5 }}
                >
                  Send a message
                </Typography>
                <Typography
                  id="contact-form-title"
                  component="h2"
                  variant="h3"
                  sx={{ mt: 1, fontSize: { xs: '1.85rem', md: '2.35rem' } }}
                >
                  Tell us what&apos;s on your mind.
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1.5, mb: 4, maxWidth: 610 }}>
                  Share a few details below. We&apos;ll make sure your message reaches the right
                  person.
                </Typography>
                <ContactForm />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <EnquiryPaths />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <ContactLocations />
      <PageCta copy={copy} />
    </>
  );
};

export default Contact;

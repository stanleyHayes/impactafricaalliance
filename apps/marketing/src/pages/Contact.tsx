import { ORG, brandColors, type SiteSetting } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
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
import { usePageCopy, useSiteSettings, type PageCopyDefaults } from '../lib/content-hooks';

/** Used only until Site Settings loads, or if a field has not been filled in yet. */
const FALLBACK_REGIONS = ['Nigeria', 'Sierra Leone'] as const;
const FALLBACK_HEAD_OFFICE = 'Atlantic Tower Airport City, Accra — Ghana';

/** `+233 50 661 9598` → `233506619598`, the form wa.me expects. */
const toWhatsAppHref = (phone: string): string =>
  `https://wa.me/${phone.replace(/[^\d]/g, '')}`;

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
      <Box sx={{ mt: -0.35, fontSize: '0.95rem', lineHeight: 1.6 }}>
        {children}
      </Box>
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

const ContactInformation = (): JSX.Element => {
  const { data: site } = useSiteSettings();
  const { email, whatsapp, headOffice, regions } = resolveContact(site);

  return (
    <MintSurface
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        p: { xs: 3.5, md: 5 },
        borderRadius: 4,
        '&::after': {
          position: 'absolute',
          right: -100,
          bottom: -120,
          width: 270,
          height: 270,
          border: `1px solid ${alpha(brandColors.gold, 0.16)}`,
          borderRadius: '50%',
          content: '""',
        },
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: 'rgba(14,42,34,0.58)', fontWeight: 700, letterSpacing: 1.6 }}
      >
        Contact details
      </Typography>
      <Typography
        variant="h3"
        sx={{ mt: 1, fontSize: { xs: '1.8rem', md: '2.3rem' } }}
      >
        We&apos;re closer than you think.
      </Typography>
      <Typography sx={{ maxWidth: 410, mt: 1.5, color: 'rgba(14,42,34,0.68)' }}>
        Reach our team directly or use the form and we&apos;ll route your message to the right
        person.
      </Typography>

      <Stack spacing={3.25} sx={{ position: 'relative', zIndex: 1, mt: 4.5 }}>
        {whatsapp && (
          <ContactDetail icon={WhatsAppIcon} label="WhatsApp">
            <Link
              href={toWhatsAppHref(whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontWeight: 650,
                textDecorationColor: 'rgba(14,42,34,0.35)',
                overflowWrap: 'anywhere',
              }}
            >
              {whatsapp}
            </Link>
          </ContactDetail>
        )}
        {site?.alternatePhone && (
          <ContactDetail
            icon={PhoneRoundedIcon}
            label={site.alternatePhoneLabel ?? 'Alternate phone'}
          >
            <Link
              href={`tel:${site.alternatePhone.replace(/\s/g, '')}`}
              sx={{ fontWeight: 650, textDecorationColor: 'rgba(14,42,34,0.35)' }}
            >
              {site.alternatePhone}
            </Link>
          </ContactDetail>
        )}
        <ContactDetail icon={BusinessRoundedIcon} label="Head office">
          {site?.mapUrl ? (
            <Link
              href={site.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecorationColor: 'rgba(14,42,34,0.35)' }}
            >
              {headOffice}
            </Link>
          ) : (
            headOffice
          )}
        </ContactDetail>
        <ContactDetail icon={EmailRoundedIcon} label="Email">
          <Link
            href={`mailto:${email}`}
            sx={{
              fontWeight: 650,
              textDecorationColor: 'rgba(14,42,34,0.35)',
              overflowWrap: 'anywhere',
            }}
          >
            {email}
          </Link>
        </ContactDetail>
        <ContactDetail icon={LanguageRoundedIcon} label="Website">
          <Link
            href={ORG.website}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textDecorationColor: 'rgba(14,42,34,0.35)' }}
          >
            impactafricaalliance.org
          </Link>
        </ContactDetail>
        <ContactDetail icon={ScheduleRoundedIcon} label="Response time">
          Within 2 business days
        </ContactDetail>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Stack direction="row" spacing={1.2} alignItems="center">
        <PlaceRoundedIcon sx={{ fontSize: 20 }} />
        <Typography sx={{ fontWeight: 700 }}>Regional presence</Typography>
      </Stack>
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
        {regions.map((region) => (
          <Chip key={region} label={region} size="small" />
        ))}
      </Stack>

      <Box sx={{ position: 'relative', zIndex: 1, mt: 4 }}>
        <Typography sx={{ mb: 1.2, color: 'rgba(14,42,34,0.64)', fontSize: '0.82rem' }}>
          Follow the journey
        </Typography>
        <SocialLinks color="inherit" />
      </Box>
    </MintSurface>
  );
};

interface EnquiryPathProps {
  icon: SvgIconComponent;
  eyebrow: string;
  title: string;
  description: string;
  to: string;
  action: string;
}

const EnquiryPath = ({
  icon: Icon,
  eyebrow,
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
      height: '100%',
      flexDirection: 'column',
      p: 3.5,
      border: 1,
      borderColor: 'rgba(0,30,20,0.12)',
      borderRadius: 3,
      bgcolor: 'background.paper',
      color: 'text.primary',
      textDecoration: 'none',
      transition: 'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
      '&:hover': {
        borderColor: 'rgba(0,30,20,0.32)',
        boxShadow: '0 22px 50px -38px rgba(18,66,42,0.75)',
        transform: 'translateY(-4px)',
      },
      '&:hover .path-arrow': {
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        transform: 'translateX(3px)',
      },
    }}
  >
    <Box
      sx={{
        display: 'grid',
        width: 48,
        height: 48,
        placeItems: 'center',
        borderRadius: 2,
        bgcolor: 'rgba(0,30,20,0.08)',
        color: 'text.primary',
      }}
    >
      <Icon />
    </Box>
    <Typography
      variant="overline"
      sx={{ mt: 3, color: 'text.primary', fontWeight: 700, letterSpacing: 1.3 }}
    >
      {eyebrow}
    </Typography>
    <Typography variant="h5" sx={{ mt: 0.5 }}>
      {title}
    </Typography>
    <Typography color="text.secondary" sx={{ mt: 1.25, flexGrow: 1, lineHeight: 1.7 }}>
      {description}
    </Typography>
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: 'divider' }}
    >
      <Typography sx={{ color: 'text.primary', fontSize: '0.86rem', fontWeight: 750 }}>
        {action}
      </Typography>
      <Box
        className="path-arrow"
        sx={{
          display: 'grid',
          width: 36,
          height: 36,
          placeItems: 'center',
          border: 1,
          borderColor: 'rgba(0,30,20,0.18)',
          borderRadius: '50%',
          color: 'text.primary',
          transition: 'background-color 200ms ease, color 200ms ease, transform 200ms ease',
        }}
      >
        <ArrowForwardRoundedIcon fontSize="small" />
      </Box>
    </Stack>
  </Box>
);

const EnquiryPaths = (): JSX.Element => (
  <Box
    component="section"
    aria-labelledby="contact-paths-title"
    sx={{ position: 'relative', overflow: 'hidden', bgcolor: 'background.default', py: { xs: 7, md: 10 } }}
  >
    <Watermark
      variant="radar"
      position="top-left"
      size={{ xs: 220, md: 340 }}
      opacity={0.05}
      sx={{ color: 'primary.main' }}
    />
    <Container sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ maxWidth: 720, mb: 5 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: 1.6 }}
        >
          Find the right path
        </Typography>
        <Typography
          id="contact-paths-title"
          variant="h2"
          sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.7rem' } }}
        >
          Looking for something specific?
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          Choose the route that best matches your enquiry and connect with the right part of our
          team.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <EnquiryPath
            icon={MarkEmailReadRoundedIcon}
            eyebrow="General enquiries"
            title="Ask a question"
            description="For media, programme information, feedback, and everything that does not fit another category."
            to="/contact#contact-form"
            action="Use the contact form"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <EnquiryPath
            icon={HandshakeRoundedIcon}
            eyebrow="Organizations"
            title="Explore a partnership"
            description="Collaborate through funding, technology, research, advocacy, or in-kind support."
            to="/get-involved#partner"
            action="Partnership enquiries"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <EnquiryPath
            icon={Diversity3RoundedIcon}
            eyebrow="Individuals"
            title="Volunteer or mentor"
            description="Share your knowledge and experience with Africa's next generation of changemakers."
            to="/get-involved#volunteer"
            action="Join the network"
          />
        </Grid>
      </Grid>
    </Container>
  </Box>
);

const Contact = (): JSX.Element => {
  const copy = usePageCopy('contact', {
    seoTitle: 'Contact Us',
    seoDescription: "Reach out to Impact Africa Alliance and let's build something impactful together.",
    heroEyebrow: 'Start a conversation',
    heroTitle: "Let's build something meaningful together.",
    heroSubtitle: 'Whether you have a question, an idea, or an opportunity to collaborate, our team is ready to listen.',
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
        <Grid container spacing={4} sx={{ alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <ContactInformation />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              id="contact-form"
              sx={{
                p: { xs: 3.5, sm: 4.5, md: 5 },
                border: 1,
                borderColor: 'rgba(0,30,20,0.1)',
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
        </Grid>
      </Container>
    </Box>

    <EnquiryPaths />
    <PageCta copy={copy} />
  </>
  );
};

export default Contact;

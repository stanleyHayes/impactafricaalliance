import { ORG } from '@iaa/shared';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import PlaceIcon from '@mui/icons-material/Place';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { ContactForm } from '../features/forms/ContactForm';

const InfoRow = ({
  icon,
  children,
}: {
  icon: JSX.Element;
  children: React.ReactNode;
}): JSX.Element => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    {icon}
    <Typography>{children}</Typography>
  </Stack>
);

const Contact = (): JSX.Element => (
  <>
    <Seo
      title="Contact Us"
      description="Reach out to Impact Africa Alliance — let's build something impactful together."
    />
    <PageHero
      title="Contact Us"
      subtitle="We would love to hear from you. Reach out and let's build something impactful together."
    />
    <Section>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h5" gutterBottom>
            Get in touch
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <InfoRow icon={<EmailIcon color="primary" />}>
              <Link href={`mailto:${ORG.email}`}>{ORG.email}</Link>
            </InfoRow>
            <InfoRow icon={<PlaceIcon color="primary" />}>
              Regional Offices: Ghana · Sierra Leone · Nigeria
            </InfoRow>
            <InfoRow icon={<LanguageIcon color="primary" />}>
              <Link href={ORG.website} target="_blank" rel="noopener noreferrer">
                www.impactafricaalliance.org
              </Link>
            </InfoRow>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h5" gutterBottom>
            Send Us a Message
          </Typography>
          <ContactForm />
        </Grid>
      </Grid>
    </Section>
  </>
);

export default Contact;

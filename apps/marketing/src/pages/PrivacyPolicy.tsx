import { ORG } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Markdown } from '../components/Markdown';
import { Seo } from '../components/Seo';
import { usePageCopy } from '../lib/content-hooks';

const Section = ({ title, children }: { title: string; children: ReactNode }): JSX.Element => (
  <Box component="section" sx={{ mb: 4.5 }}>
    <Typography variant="h2" sx={{ mb: 1.5, fontSize: '1.5rem' }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const Body = ({ children }: { children: ReactNode }): JSX.Element => (
  <Typography sx={{ mb: 1.5, color: 'text.secondary', lineHeight: 1.75 }}>{children}</Typography>
);

const List = ({ items }: { items: string[] }): JSX.Element => (
  <Box component="ul" sx={{ pl: 3, mb: 2, color: 'text.secondary' }}>
    {items.map((item) => (
      <Box component="li" key={item} sx={{ mb: 0.75, lineHeight: 1.75 }}>
        {item}
      </Box>
    ))}
  </Box>
);

/** Privacy Policy page aligned with Ghana Data Protection Act 2012 (Act 843). */
const PrivacyPolicy = (): JSX.Element => {
  const copy = usePageCopy('privacy-policy', {
    seoTitle: 'Privacy Policy',
    seoDescription: 'Read the Impact Africa Alliance privacy policy to understand how we collect, use, and protect your personal information.',
    heroTitle: 'Privacy Policy',
    heroSubtitle: 'Last updated: July 2026',
  });

  return (
  <>
    <Seo title={copy.seoTitle} description={copy.seoDescription} />
    <Box
      component="header"
      sx={{
        bgcolor: 'common.black',
        color: 'common.white',
        py: { xs: 7, md: 10 },
      }}
    >
      <Container>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: '2.4rem', md: '3.25rem' }, lineHeight: 1.08 }}
        >
          {copy.heroTitle}
        </Typography>
        <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.72)' }}>
          {copy.heroSubtitle}
        </Typography>
      </Container>
    </Box>

    <Container sx={{ py: { xs: 6, md: 8 } }}>
      {copy.introBody ? (
        <Markdown>{copy.introBody}</Markdown>
      ) : (
      <Stack spacing={1}>
        <Body>
          Impact Africa Alliance ({ORG.shortName}) is committed to protecting your privacy. This
          policy explains what personal data we collect, why we collect it, how we use it, and the
          rights you have under the Ghana Data Protection Act 2012 (Act 843).
        </Body>

        <Section title="1. Data controller">
          <Body>
            The data controller is Impact Africa Alliance, headquartered in Ghana. For privacy
            questions or to exercise your rights, contact our Data Protection Officer at{' '}
            <Link href={`mailto:${ORG.email}`}>{ORG.email}</Link>.
          </Body>
        </Section>

        <Section title="2. What we collect">
          <List
            items={[
              'Contact details: name, email address, phone number, organisation, and message content when you fill in a form.',
              'Donation details: donor name, email, amount, payment provider reference, and optional marketing consent.',
              'Newsletter details: name, email, source, and consent record.',
              'Technical data: IP address, browser type, device information, pages visited, and cookie preferences.',
            ]}
          />
        </Section>

        <Section title="3. Legal basis for processing">
          <Body>We process personal data on one or more of the following grounds:</Body>
          <List
            items={[
              'Consent: for newsletters, analytics cookies, and optional marketing updates.',
              'Contract: to respond to your enquiries or fulfil a donation transaction.',
              'Legal obligation: to keep donation and tax records.',
              'Legitimate interest: to understand how our website is used and to keep it secure.',
            ]}
          />
        </Section>

        <Section title="4. How we use your information">
          <List
            items={[
              'To respond to enquiries and process donations.',
              'To send newsletters and impact updates where you have opted in.',
              'To improve our website, measure reach, and comply with legal obligations.',
              'To protect the security and integrity of our services.',
            ]}
          />
        </Section>

        <Section title="5. Cookies and analytics">
          <Body>
            We use essential cookies and optional analytics cookies. Analytics cookies are only loaded
            after you provide consent through our{' '}
            <Link component={RouterLink} to="/cookie-policy">
              Cookie Policy
            </Link>
            . You can withdraw consent at any time by clearing your browser cookies or using the
            manage-cookies option in our banner.
          </Body>
        </Section>

        <Section title="6. Who we share data with">
          <Body>
            We do not sell personal data. We share it only with trusted service providers who help us
            operate the website, process payments (Stripe, Paystack), send emails, or analyse usage
            (Google Analytics). These providers are contractually required to protect your data and
            use it only for the services they provide to us.
          </Body>
        </Section>

        <Section title="7. International transfers">
          <Body>
            Some service providers are based outside Ghana. Where data is transferred internationally,
            we rely on appropriate safeguards such as standard contractual clauses or providers
            certified under recognised privacy frameworks.
          </Body>
        </Section>

        <Section title="8. Data retention">
          <Body>We keep personal data only for as long as necessary:</Body>
          <List
            items={[
              'Contact, partner, and volunteer submissions: up to 3 years after the enquiry is resolved, or until you ask us to delete it.',
              'Newsletter subscribers: until you unsubscribe, plus 90 days for record keeping.',
              'Donation records: as required by Ghana tax and charity law, with personal identifiers redacted where possible after the retention period.',
              'Analytics data: up to 26 months within Google Analytics, with IP anonymisation enabled.',
            ]}
          />
        </Section>

        <Section title="9. Your rights under Act 843">
          <Body>You have the right to:</Body>
          <List
            items={[
              'Access the personal data we hold about you.',
              'Request correction of inaccurate or incomplete data.',
              'Request deletion of your personal data in certain circumstances.',
              'Object to or restrict processing of your data.',
              'Withdraw consent at any time.',
              'Lodge a complaint with the Ghana Data Protection Commission.',
            ]}
          />
          <Body>
            To exercise any of these rights, please submit a{' '}
            <Link component={RouterLink} to="/privacy-request">
              privacy request
            </Link>{' '}
            or email us at <Link href={`mailto:${ORG.email}`}>{ORG.email}</Link>.
          </Body>
        </Section>

        <Section title="10. Security">
          <Body>
            We use encryption, access controls, regular backups, and secure development practices to
            protect personal data. Admin access to our systems requires strong passwords and
            two-factor authentication.
          </Body>
        </Section>

        <Section title="11. Children">
          <Body>
            Our website is not directed at children under 16. If we learn that we have collected data
            from a child without appropriate consent, we will delete it promptly.
          </Body>
        </Section>

        <Section title="12. Changes to this policy">
          <Body>
            We may update this policy from time to time. The latest version will always be available
            on this page, and we will update the &quot;Last updated&quot; date accordingly.
          </Body>
        </Section>

        <Section title="13. Contact us">
          <Body>
            If you have any questions about this Privacy Policy or how we handle your data, contact us
            at <Link href={`mailto:${ORG.email}`}>{ORG.email}</Link> or through our{' '}
            <Link component={RouterLink} to="/contact">
              Contact page
            </Link>
            .
          </Body>
        </Section>
      </Stack>
      )}
    </Container>
  </>
  );
};

export default PrivacyPolicy;

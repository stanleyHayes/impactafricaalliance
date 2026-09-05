import { ORG } from '@iaa/shared';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { LegalLayout } from '../components/legal/LegalLayout';
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

/** Terms of Use page. */
const TermsOfUse = (): JSX.Element => {
  const copy = usePageCopy('terms-of-use', {
    seoTitle: 'Terms of Use',
    seoDescription:
      'Read the Impact Africa Alliance terms of use governing access to and use of our website and content.',
    heroTitle: 'Terms of Use',
    heroSubtitle: 'Last updated: July 2026',
  });

  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <LegalLayout title={copy.heroTitle} subtitle={copy.heroSubtitle}>
        {copy.bodyContent ? (
          <Markdown>{copy.bodyContent}</Markdown>
        ) : (
          <Stack spacing={1}>
            <Body>
              Welcome to the Impact Africa Alliance website. By accessing or using this website, you
              agree to be bound by these Terms of Use. If you do not agree, please do not use the
              site.
            </Body>

            <Section title="1. Use of the website">
              <Body>
                You may use this website for lawful purposes only. You agree not to use the site in
                any way that could damage, disable, overburden, or impair our servers or networks,
                or interfere with any other party&apos;s use of the site.
              </Body>
            </Section>

            <Section title="2. Intellectual property">
              <Body>
                All content on this website, including text, graphics, logos, images, and software,
                is the property of Impact Africa Alliance or its licensors and is protected by
                copyright and other intellectual property laws. You may not reproduce, distribute,
                or create derivative works without our prior written permission.
              </Body>
            </Section>

            <Section title="3. User submissions">
              <Body>
                By submitting information through our contact forms, partnership enquiries, or other
                channels, you grant us permission to use that information to respond to your request
                and for related administrative purposes.
              </Body>
            </Section>

            <Section title="4. Links to third-party sites">
              <Body>
                This website may contain links to third-party websites. These links are provided for
                convenience only, and we are not responsible for the content or practices of any
                third-party site.
              </Body>
            </Section>

            <Section title="5. Disclaimer">
              <Body>
                The information on this website is provided &quot;as is&quot; without warranties of
                any kind. We make every effort to ensure accuracy, but we do not guarantee that the
                content is complete, reliable, or error-free.
              </Body>
            </Section>

            <Section title="6. Limitation of liability">
              <Body>
                To the fullest extent permitted by law, Impact Africa Alliance shall not be liable
                for any direct, indirect, incidental, or consequential damages arising from your use
                of this website.
              </Body>
            </Section>

            <Section title="7. Changes to these terms">
              <Body>
                We may update these Terms of Use from time to time. Continued use of the website
                after changes constitutes acceptance of the revised terms.
              </Body>
            </Section>

            <Section title="8. Governing law">
              <Body>
                These Terms of Use are governed by the laws of the Republic of Ghana. Any dispute
                arising from your use of this website shall be subject to the exclusive jurisdiction
                of the courts of Ghana.
              </Body>
            </Section>

            <Section title="9. Contact us">
              <Body>
                Questions about these Terms of Use should be sent to{' '}
                <Link href={`mailto:${ORG.email}`}>{ORG.email}</Link>.
              </Body>
            </Section>
          </Stack>
        )}
      </LegalLayout>
    </>
  );
};

export default TermsOfUse;

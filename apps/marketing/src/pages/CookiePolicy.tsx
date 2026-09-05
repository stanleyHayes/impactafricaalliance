import { ORG } from '@iaa/shared';
import Box from '@mui/material/Box';
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

const CookiePolicy = (): JSX.Element => {
  const copy = usePageCopy('cookie-policy', {
    seoTitle: 'Cookie Policy',
    seoDescription:
      'Learn how Impact Africa Alliance uses cookies and how you can manage your preferences.',
    heroTitle: 'Cookie Policy',
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
              {ORG.shortName} uses cookies and similar technologies to make our website work,
              understand how visitors use it, and improve the experience. This policy explains what
              we use and how you can control it.
            </Body>

            <Section title="1. What are cookies?">
              <Body>
                Cookies are small text files placed on your device by a website. They help the site
                remember your preferences and collect information about how you interact with pages.
              </Body>
            </Section>

            <Section title="2. Essential cookies">
              <Body>
                Some cookies are necessary for the website to function. These include security
                features and basic navigation. Essential cookies cannot be turned off without
                breaking core functionality.
              </Body>
            </Section>

            <Section title="3. Analytics cookies">
              <Body>
                We use Google Analytics to understand how visitors find and move through our site.
                This data is aggregated and helps us improve content and navigation. We only load
                analytics cookies after you accept them through the cookie banner.
              </Body>
            </Section>

            <Section title="4. Managing your preferences">
              <Body>
                When you first visit the site, you can choose to accept analytics cookies or use
                only essential cookies. You can also clear cookies through your browser settings at
                any time.
              </Body>
            </Section>

            <Section title="5. Changes to this policy">
              <Body>
                We may update this Cookie Policy as our website or the law changes. The latest
                version will always be available on this page.
              </Body>
            </Section>

            <Section title="6. Contact">
              <Body>
                If you have questions about cookies or this policy, contact us at{' '}
                <Box component="a" href={`mailto:${ORG.email}`} sx={{ color: 'primary.main' }}>
                  {ORG.email}
                </Box>
                .
              </Body>
            </Section>
          </Stack>
        )}
      </LegalLayout>
    </>
  );
};

export default CookiePolicy;

import Box from '@mui/material/Box';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { PageTransition } from '../PageTransition';
import { SchemaOrg } from '../SchemaOrg';

import { AnnouncementBanner } from './AnnouncementBanner';
import { CookieBanner } from './CookieBanner';
import { Footer } from './Footer';
import { Header } from './Header';
import { LiveChatButton } from './LiveChatButton';
import { NewsletterBanner } from './NewsletterBanner';
import { WelcomePopup } from './WelcomePopup';

/** App shell: announcement bar, header, routed page content, newsletter CTA, footer, SEO schema, cookie banner, welcome popup. */
export const Layout = (): JSX.Element => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname, hash]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', overflowX: 'clip' }}>
      <SchemaOrg />
      <AnnouncementBanner />
      <Header />
      <Box component="main" sx={{ flex: 1 }}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Box>
      <NewsletterBanner />
      <Footer />
      <CookieBanner />
      <WelcomePopup />
      <LiveChatButton />
    </Box>
  );
};

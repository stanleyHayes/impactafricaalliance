import Box from '@mui/material/Box';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Footer } from './Footer';
import { Header } from './Header';
import { NewsletterBanner } from './NewsletterBanner';

/** App shell: header, routed page content, newsletter CTA, footer. */
export const Layout = (): JSX.Element => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname, hash]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <NewsletterBanner />
      <Footer />
    </Box>
  );
};

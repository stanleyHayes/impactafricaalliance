import { brandColors } from '@iaa/shared';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from '../components/layout/Layout';
const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const OurWork = lazy(() => import('../pages/OurWork'));
const InitiativePage = lazy(() => import('../pages/InitiativePage'));
const Impact = lazy(() => import('../pages/Impact'));
const GetInvolved = lazy(() => import('../pages/GetInvolved'));
const Contact = lazy(() => import('../pages/Contact'));
const News = lazy(() => import('../pages/News'));
const NewsArticle = lazy(() => import('../pages/NewsArticle'));
const Resources = lazy(() => import('../pages/Resources'));
const JobApplication = lazy(() => import('../pages/JobApplication'));
const Events = lazy(() => import('../pages/Events'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const DonateComplete = lazy(() => import('../pages/DonateComplete'));
const PrivacyRequest = lazy(() => import('../pages/PrivacyRequest'));
const CookiePolicy = lazy(() => import('../pages/CookiePolicy'));
const TermsOfUse = lazy(() => import('../pages/TermsOfUse'));
const NotFound = lazy(() => import('../pages/NotFound'));

const PageFallback = (): JSX.Element => (
  <Container sx={{ py: { xs: 10, md: 14 } }}>
    <Stack alignItems="center" spacing={2.5}>
      <Box
        sx={{
          display: 'grid',
          width: 72,
          height: 72,
          placeItems: 'center',
          borderRadius: '50%',
          bgcolor: alpha(brandColors.mint, 0.1),
        }}
      >
        <CircularProgress size={34} thickness={3.5} />
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 750 }}>Loading the next page</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Bringing the latest Alliance content into view.
        </Typography>
      </Box>
    </Stack>
  </Container>
);

/** Route table for the marketing site. */
export const App = (): JSX.Element => (
  <Routes>
    <Route element={<Layout />}>
      <Route
        index
        element={
          <Suspense fallback={<PageFallback />}>
            <Home />
          </Suspense>
        }
      />
      <Route
        path="about"
        element={
          <Suspense fallback={<PageFallback />}>
            <About />
          </Suspense>
        }
      />
      <Route
        path="our-work"
        element={
          <Suspense fallback={<PageFallback />}>
            <OurWork />
          </Suspense>
        }
      />
      <Route
        path="our-work/:slug"
        element={
          <Suspense fallback={<PageFallback />}>
            <InitiativePage />
          </Suspense>
        }
      />
      <Route
        path="impact"
        element={
          <Suspense fallback={<PageFallback />}>
            <Impact />
          </Suspense>
        }
      />
      <Route
        path="get-involved"
        element={
          <Suspense fallback={<PageFallback />}>
            <GetInvolved />
          </Suspense>
        }
      />
      <Route
        path="contact"
        element={
          <Suspense fallback={<PageFallback />}>
            <Contact />
          </Suspense>
        }
      />
      <Route
        path="news"
        element={
          <Suspense fallback={<PageFallback />}>
            <News />
          </Suspense>
        }
      />
      <Route
        path="news/:slug"
        element={
          <Suspense fallback={<PageFallback />}>
            <NewsArticle />
          </Suspense>
        }
      />
      <Route
        path="resources"
        element={
          <Suspense fallback={<PageFallback />}>
            <Resources />
          </Suspense>
        }
      />
      <Route
        path="get-involved/careers/:slug/apply"
        element={
          <Suspense fallback={<PageFallback />}>
            <JobApplication />
          </Suspense>
        }
      />
      <Route
        path="events"
        element={
          <Suspense fallback={<PageFallback />}>
            <Events />
          </Suspense>
        }
      />
      <Route
        path="privacy-policy"
        element={
          <Suspense fallback={<PageFallback />}>
            <PrivacyPolicy />
          </Suspense>
        }
      />
      <Route
        path="terms-of-use"
        element={
          <Suspense fallback={<PageFallback />}>
            <TermsOfUse />
          </Suspense>
        }
      />
      <Route
        path="cookie-policy"
        element={
          <Suspense fallback={<PageFallback />}>
            <CookiePolicy />
          </Suspense>
        }
      />
      <Route
        path="donate/complete"
        element={
          <Suspense fallback={<PageFallback />}>
            <DonateComplete />
          </Suspense>
        }
      />
      <Route
        path="privacy-request"
        element={
          <Suspense fallback={<PageFallback />}>
            <PrivacyRequest />
          </Suspense>
        }
      />
      <Route
        path="*"
        element={
          <Suspense fallback={<PageFallback />}>
            <NotFound />
          </Suspense>
        }
      />
    </Route>
  </Routes>
);

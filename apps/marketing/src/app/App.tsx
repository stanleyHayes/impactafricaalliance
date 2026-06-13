import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
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
          bgcolor: 'rgba(26,92,56,0.07)',
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

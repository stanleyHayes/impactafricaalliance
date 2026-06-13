import Container from '@mui/material/Container';
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from '../components/layout/Layout';
import { CardGridSkeleton } from '../components/skeletons';

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
  <Container sx={{ py: 10 }}>
    <CardGridSkeleton count={6} />
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

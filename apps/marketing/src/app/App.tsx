import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Layout } from '../components/layout/Layout';
import { PageSkeleton } from '../components/skeletons';

const Home = lazy(() => import('../pages/Home'));
const TeamProfile = lazy(() => import('../pages/TeamProfile'));
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
const EventDetail = lazy(() => import('../pages/EventDetail'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const DonateComplete = lazy(() => import('../pages/DonateComplete'));
const PrivacyRequest = lazy(() => import('../pages/PrivacyRequest'));
const CookiePolicy = lazy(() => import('../pages/CookiePolicy'));
const TermsOfUse = lazy(() => import('../pages/TermsOfUse'));
const NotFound = lazy(() => import('../pages/NotFound'));

/** Route table for the marketing site. */
export const App = (): JSX.Element => (
  <Routes>
    <Route element={<Layout />}>
      <Route
        index
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Home />
          </Suspense>
        }
      />
      <Route
        path="about"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <About />
          </Suspense>
        }
      />
      <Route
        path="about/team/:memberId"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <TeamProfile />
          </Suspense>
        }
      />
      <Route
        path="our-work"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <OurWork />
          </Suspense>
        }
      />
      <Route
        path="our-work/:slug"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <InitiativePage />
          </Suspense>
        }
      />
      <Route
        path="impact"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Impact />
          </Suspense>
        }
      />
      <Route
        path="get-involved"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <GetInvolved />
          </Suspense>
        }
      />
      <Route
        path="contact"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Contact />
          </Suspense>
        }
      />
      <Route
        path="news"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <News />
          </Suspense>
        }
      />
      <Route
        path="news/:slug"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <NewsArticle />
          </Suspense>
        }
      />
      <Route
        path="resources"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Resources />
          </Suspense>
        }
      />
      <Route
        path="get-involved/careers/:slug/apply"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <JobApplication />
          </Suspense>
        }
      />
      <Route
        path="events"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Events />
          </Suspense>
        }
      />
      <Route
        path="events/:eventId"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <EventDetail />
          </Suspense>
        }
      />
      <Route
        path="privacy-policy"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <PrivacyPolicy />
          </Suspense>
        }
      />
      <Route
        path="terms-of-use"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <TermsOfUse />
          </Suspense>
        }
      />
      <Route
        path="cookie-policy"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <CookiePolicy />
          </Suspense>
        }
      />
      <Route
        path="donate/complete"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <DonateComplete />
          </Suspense>
        }
      />
      <Route
        path="privacy-request"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <PrivacyRequest />
          </Suspense>
        }
      />
      <Route
        path="*"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <NotFound />
          </Suspense>
        }
      />
    </Route>
  </Routes>
);

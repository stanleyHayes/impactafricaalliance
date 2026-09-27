import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
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
const ImpactStories = lazy(() => import('../pages/ImpactStories'));
const ImpactStory = lazy(() => import('../pages/ImpactStory'));
const ImpactStoryPreview = lazy(() => import('../pages/ImpactStoryPreview'));
const GetInvolved = lazy(() => import('../pages/GetInvolved'));
const Contact = lazy(() => import('../pages/Contact'));
const News = lazy(() => import('../pages/News'));
const NewsArticle = lazy(() => import('../pages/NewsArticle'));
const Resources = lazy(() => import('../pages/Resources'));
const Reviews = lazy(() => import('../pages/Reviews'));
const JobApplication = lazy(() => import('../pages/JobApplication'));
const Events = lazy(() => import('../pages/Events'));
const EventDetail = lazy(() => import('../pages/EventDetail'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const DonateComplete = lazy(() => import('../pages/DonateComplete'));
const PrivacyRequest = lazy(() => import('../pages/PrivacyRequest'));
const CookiePolicy = lazy(() => import('../pages/CookiePolicy'));
const TermsOfUse = lazy(() => import('../pages/TermsOfUse'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Apply = lazy(() => import('../pages/Apply'));
const ApplyPreview = lazy(() => import('../pages/ApplyPreview'));

/**
 * Route fallback for the applicant flow, which has no site header or footer
 * around it: a full-screen frame shaped like one question step (progress bar,
 * heading, answer, Back and Continue) so nothing jumps when the form arrives.
 */
const ApplicantFlowSkeleton = (): JSX.Element => (
  <Box
    role="status"
    aria-label="Loading application"
    sx={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      bgcolor: 'background.default',
      '@media (prefers-reduced-motion: reduce)': {
        '& .MuiSkeleton-root, & .MuiSkeleton-root::after': { animation: 'none' },
      },
    }}
  >
    <Skeleton aria-hidden="true" variant="rectangular" height={4} />
    <Container
      aria-hidden="true"
      maxWidth="sm"
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        py: { xs: 6, md: 10 },
      }}
    >
      <Skeleton width={96} height={22} />
      <Skeleton width="85%" height={64} />
      <Skeleton width="60%" height={28} />
      <Skeleton variant="rounded" height={56} sx={{ mt: 4, borderRadius: 2 }} />
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 5 }}>
        <Skeleton variant="rounded" width={96} height={44} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" width={136} height={44} sx={{ borderRadius: 999 }} />
      </Stack>
    </Container>
  </Box>
);

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
        path="reviews"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <Reviews />
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
        path="impact/stories"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ImpactStories />
          </Suspense>
        }
      />
      {/* Listed before `:slug` for the reader. React Router already ranks a
          static segment above a dynamic one, so "preview" is never taken for
          a story slug whatever the order. */}
      <Route
        path="impact/stories/preview"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ImpactStoryPreview />
          </Suspense>
        }
      />
      <Route
        path="impact/stories/:slug"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <ImpactStory />
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
    {/* The applicant flow is immersive, so it sits outside Layout: no header,
        footer, banners or popups competing with the questions (plan §5).
        Layout is also what records page views and scrolls to the top on
        navigation, so these routes do neither on their own; the applicant
        flow decides whether to record a view and handles its own scrolling.
        Unknown paths still fall through to NotFound inside Layout. */}
    <Route
      path="apply/preview"
      element={
        <Suspense fallback={<ApplicantFlowSkeleton />}>
          <ApplyPreview />
        </Suspense>
      }
    />
    <Route
      path="apply/:slug"
      element={
        <Suspense fallback={<ApplicantFlowSkeleton />}>
          <Apply />
        </Suspense>
      }
    />
  </Routes>
);

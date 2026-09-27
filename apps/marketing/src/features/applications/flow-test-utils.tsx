import type { ApplicantDraft, FormStep, PublicForm } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, type RenderResult } from '@testing-library/react';
import { LazyMotion, MotionGlobalConfig, domAnimation } from 'framer-motion';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, beforeAll, vi } from 'vitest';

import Apply from '../../pages/Apply';
import ApplyPreview from '../../pages/ApplyPreview';
import { theme } from '../../theme/theme';

/**
 * Fixtures and a renderer for the applicant flow's tests. The API module is
 * mocked by each test file; these helpers only build forms and mount pages.
 */

export const DRAFT_TOKEN = 'draftToken_0123456789abcdef';

/**
 * Run screen transitions for real (features loaded, as in the app) but let
 * them finish at once, so each screen change completes as it would in a
 * browser without the test waiting on animation frames.
 */
export const withInstantMotion = (): void => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });
  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });
};

/**
 * An in-memory `localStorage`. The test runtime's own may be missing (newer
 * Node versions put an unconfigured one in front of jsdom's), so tests that
 * read storage bring their own, as `use-event-view.test.ts` does.
 */
export const stubStorage = (): void => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, String(value)),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
  });
};

const steps: FormStep[] = [
  {
    id: 'about',
    title: 'About you',
    description: 'So we know how to reach you.',
    fields: [
      {
        id: 'full-name',
        type: 'short-text',
        label: 'Full name',
        required: true,
        options: [],
        mapsTo: 'applicant-name',
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email address',
        required: true,
        options: [],
        mapsTo: 'applicant-email',
      },
    ],
  },
  {
    id: 'session',
    title: 'Your session',
    fields: [
      {
        id: 'abstract',
        type: 'long-text',
        label: 'What is the session about?',
        required: false,
        options: [],
        validation: { maxLength: 500 },
      },
      {
        id: 'spoken-before',
        type: 'radio',
        label: 'Have you spoken before?',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        id: 'past-talks',
        type: 'url',
        label: 'Link to a past talk',
        required: true,
        options: [],
        visibility: {
          match: 'all',
          rules: [{ fieldId: 'spoken-before', operator: 'equals', value: 'yes' }],
        },
      },
    ],
  },
  {
    id: 'travel',
    title: 'Travel',
    visibility: {
      match: 'all',
      rules: [{ fieldId: 'spoken-before', operator: 'equals', value: 'yes' }],
    },
    fields: [
      {
        id: 'needs-travel',
        type: 'checkbox',
        label: 'I would need help with travel costs',
        required: false,
        options: [],
      },
    ],
  },
  {
    id: 'consent',
    title: 'Consent',
    fields: [
      {
        id: 'privacy',
        type: 'consent',
        label: 'Your consent',
        required: true,
        options: [],
        consentText: 'I agree that you may keep and use these answers.',
      },
    ],
  },
];

export const makeForm = (overrides: Partial<PublicForm> = {}): PublicForm => ({
  slug: 'speakers',
  title: 'Speaker application',
  type: 'speaker-application',
  intro: { heading: 'Speak at our summit', description: 'Tell us about yourself.' },
  steps,
  settings: { allowDrafts: true, successMessage: 'Thank you for offering to speak.' },
  version: 1,
  window: 'open',
  ...overrides,
});

/** A form with one upload question, for the upload tests. */
export const makeFileForm = (): PublicForm =>
  makeForm({
    steps: [
      {
        id: 'documents',
        title: 'Documents',
        fields: [
          {
            id: 'cv',
            type: 'file',
            label: 'Your CV',
            required: true,
            options: [],
            validation: { fileKinds: ['pdf'], maxFiles: 1, maxSizeMB: 5 },
          },
        ],
      },
    ],
  });

export const makeDraft = (overrides: Partial<ApplicantDraft> = {}): ApplicantDraft => ({
  formSlug: 'speakers',
  formVersion: 1,
  status: 'draft',
  answers: [],
  updatedAt: '2026-09-27T10:00:00.000Z',
  ...overrides,
});

/**
 * Mount the applicant routes at `path` as the app does: outside `Layout`,
 * inside the site's strict `LazyMotion` (so any `motion.*` component would
 * throw here as it would in the browser).
 */
export const renderApplyRoute = (path: string): RenderResult => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const routes = (
    <Routes>
      <Route path="/apply/preview" element={<ApplyPreview />} />
      <Route path="/apply/:slug" element={<Apply />} />
      <Route path="/" element={<p>Home page</p>} />
    </Routes>
  );
  return render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={domAnimation} strict>
          <MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>
        </LazyMotion>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

/** The heading of the screen now showing. */
export const findScreenHeading = (name: string | RegExp): Promise<HTMLElement> =>
  screen.findByRole('heading', { level: 1, name });

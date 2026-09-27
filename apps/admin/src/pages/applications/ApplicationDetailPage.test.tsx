import type { AdminApplication, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import ApplicationDetailPage from './ApplicationDetailPage';

vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const clients: QueryClient[] = [];

const application: AdminApplication = {
  id: 'app-1',
  reference: 'APP-7K2Q9M',
  formId: 'form-1',
  form: { id: 'form-1', title: 'Speaker call', slug: 'speaker-call', type: 'speaker-application' },
  formVersion: 1,
  definition: {
    formId: 'form-1',
    version: 1,
    title: 'Speaker call',
    createdAt: '2026-09-01T10:00:00.000Z',
    steps: [
      {
        id: 'about',
        title: 'About you',
        fields: [
          { id: 'name', type: 'short-text', label: 'Full name', required: true, options: [] },
          { id: 'email', type: 'email', label: 'Email', required: true, options: [] },
          { id: 'bio', type: 'long-text', label: 'Biography', required: false, options: [] },
        ],
      },
      {
        id: 'session',
        title: 'Your session',
        fields: [
          {
            id: 'format',
            type: 'radio',
            label: 'Format',
            required: true,
            options: [
              { value: 'panel', label: 'Panel discussion' },
              { value: 'workshop', label: 'Workshop' },
            ],
          },
          { id: 'cv', type: 'file', label: 'CV', required: false, options: [] },
        ],
      },
    ],
  },
  applicant: { name: 'Ama Mensah', email: 'ama@example.org' },
  // Stored out of order; the page follows the definition.
  answers: [
    { fieldId: 'format', label: 'Format', stepId: 'session', value: 'workshop' },
    { fieldId: 'email', label: 'Email', stepId: 'about', value: 'ama@example.org' },
    { fieldId: 'name', label: 'Full name', stepId: 'about', value: 'Ama Mensah' },
    {
      fieldId: 'cv',
      label: 'CV',
      stepId: 'session',
      value: [
        {
          publicId: 'iaa/applications/f/d/cv-1',
          url: 'https://res.cloudinary.com/iaa/image/authenticated/s--sig--/v1/cv.pdf',
          name: 'Ama CV.pdf',
          bytes: 2048,
        },
      ],
    },
  ],
  status: 'submitted',
  submittedAt: '2026-09-20T10:00:00.000Z',
  reviews: [],
  statusHistory: [{ from: 'draft', to: 'submitted', by: null, at: '2026-09-20T10:00:00.000Z' }],
  createdAt: '2026-09-19T10:00:00.000Z',
  updatedAt: '2026-09-20T10:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'me',
      role: 'editor',
      permissions: ['applications:read', 'applications:update'] as Permission[],
    } as unknown as PublicUser,
  } as ReturnType<typeof useAuth>);
  vi.mocked(api.get).mockResolvedValue(application);
  vi.mocked(api.patch).mockResolvedValue(application);
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
});

const setup = (): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/applications/app-1']}>
          <Routes>
            <Route path="/applications/:applicationId" element={<ApplicationDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const chooseStatus = (label: RegExp): void => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'New status' }));
  fireEvent.click(screen.getByRole('option', { name: label }));
};

describe('ApplicationDetailPage', () => {
  it('shows answers by step in the order the applicant saw them, with gaps said plainly', async () => {
    setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ama Mensah' }),
    ).toBeInTheDocument();
    const about = screen.getByRole('region', { name: 'About you' });
    const labels = within(about)
      .getAllByText(/^(Full name|Email|Biography)$/)
      .map((element) => element.textContent);
    expect(labels).toEqual(['Full name', 'Email', 'Biography']);
    expect(within(about).getByText('Not answered')).toBeInTheDocument();

    const session = screen.getByRole('region', { name: 'Your session' });
    // Choices read as their label, files as downloads.
    expect(within(session).getByText('Workshop')).toBeInTheDocument();
    expect(within(session).getByRole('link', { name: /Ama CV\.pdf/ })).toHaveAttribute(
      'href',
      'https://res.cloudinary.com/iaa/image/authenticated/s--sig--/v1/cv.pdf',
    );
    expect(screen.getByText(/Applicants never see reviews/)).toBeInTheDocument();
    // This reviewer cannot read forms, so the form is named, not linked to a page that would refuse them.
    expect(screen.queryByRole('link', { name: 'Speaker call' })).not.toBeInTheDocument();
  });

  it('removes your own review after naming whose it is', async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...application,
      reviews: [
        {
          id: 'review-1',
          reviewer: { id: 'me', name: 'Kofi Boateng', email: 'kofi@iaa.org', role: 'editor' },
          notes: 'Promising.',
          createdAt: '2026-09-21T10:00:00.000Z',
        },
        {
          id: 'review-2',
          reviewer: { id: 'other', name: 'Efua Asante', email: 'efua@iaa.org', role: 'editor' },
          notes: 'Unsure.',
          createdAt: '2026-09-21T11:00:00.000Z',
        },
      ],
    });
    vi.mocked(api.delete).mockResolvedValue(undefined);
    setup();
    await screen.findByRole('heading', { level: 1, name: 'Ama Mensah' });
    // Only your own review offers removal to someone who is not an administrator.
    expect(
      screen.queryByRole('button', { name: 'Remove the review by Efua Asante' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove the review by Kofi Boateng' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove review' }));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/admin/applications/app-1/reviews/review-1'),
    );
  });

  it('moves the application on with a note', async () => {
    setup();
    await screen.findByRole('heading', { level: 1, name: 'Ama Mensah' });
    chooseStatus(/^Under review/);
    fireEvent.change(screen.getByRole('textbox', { name: 'Note for the history' }), {
      target: { value: 'Strong idea' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Change status' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/admin/applications/app-1/status', {
        status: 'under-review',
        note: 'Strong idea',
      }),
    );
  });

  it('asks before accepting, because the applicant is not told', async () => {
    setup();
    await screen.findByRole('heading', { level: 1, name: 'Ama Mensah' });
    chooseStatus(/^Accepted/);
    fireEvent.click(screen.getByRole('button', { name: 'Change status' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/They are not emailed/)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/admin/applications/app-1/status', {
        status: 'accepted',
      }),
    );
  });

  it('adds an internal review', async () => {
    vi.mocked(api.post).mockResolvedValue(application);
    setup();
    await screen.findByRole('heading', { level: 1, name: 'Ama Mensah' });
    fireEvent.click(screen.getByRole('button', { name: 'Add review' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add review' }));
    expect(within(dialog).getByText('Write a few words on why.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /Notes/ }), {
      target: { value: 'Clear and relevant.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add review' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/applications/app-1/reviews', {
        notes: 'Clear and relevant.',
      }),
    );
  });

  it('says so when the application is not there', async () => {
    vi.mocked(api.get).mockRejectedValue(
      Object.assign(new Error('Application not found'), { status: 404 }),
    );
    setup();
    expect(await screen.findByText('Application not found')).toBeInTheDocument();
  });
});

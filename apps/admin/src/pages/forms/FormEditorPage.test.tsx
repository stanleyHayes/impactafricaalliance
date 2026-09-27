import type { FormDefinition } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import 'dayjs/locale/en-gb';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import FormEditorPage from './FormEditorPage';

vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const clients: QueryClient[] = [];

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const setup = (url: string): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route path="/forms/new" element={<FormEditorPage />} />
              <Route path="/forms/:formId/edit" element={<FormEditorPage />} />
              <Route path="/forms/:formId" element={<p>Form page</p>} />
            </Routes>
          </MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const stepHeading = (name: string) => screen.findByRole('heading', { level: 2, name });
const continueButton = () => screen.getByRole('button', { name: 'Continue' });

const savedForm: FormDefinition = {
  id: 'form-1',
  title: 'Mentor call',
  slug: 'mentor-call',
  type: 'mentor',
  description: 'For the spring cohort',
  status: 'published',
  intro: { heading: 'Mentor with us' },
  settings: { allowDrafts: true, notifyEmails: [], acknowledgeApplicant: false },
  steps: [
    {
      id: 'about',
      title: 'About you',
      fields: [{ id: 'name', type: 'short-text', label: 'Name', required: true, options: [] }],
    },
  ],
  version: 2,
  submissionCount: 4,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

describe('FormEditorPage', () => {
  it('checks each step before moving on, and Enter moves on rather than saving', async () => {
    setup('/forms/new');
    await stepHeading('Basics');
    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), { target: { value: 'Hi' } });
    fireEvent.click(continueButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Give the form a title of at least 3 characters.',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Basics' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), {
      target: { value: 'Volunteer call 2027' },
    });
    // The address follows the title until someone edits it.
    expect(screen.getByRole('textbox', { name: /^Address/ })).toHaveValue('volunteer-call-2027');

    // The public site's preview page is at /apply/preview, so no form may be.
    fireEvent.change(screen.getByRole('textbox', { name: /^Address/ }), {
      target: { value: 'preview' },
    });
    fireEvent.click(continueButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '"preview" is used by the public site for previews.',
    );
    fireEvent.change(screen.getByRole('textbox', { name: /^Address/ }), {
      target: { value: 'volunteer-call-2027' },
    });

    // Enter in a field submits the form element, which only advances here.
    fireEvent.submit(screen.getByRole('form', { name: 'New form' }));
    await stepHeading('Introduction');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('walks through every step and creates the form only from Review', async () => {
    vi.mocked(api.post).mockResolvedValue({ ...savedForm, id: 'new-form' });
    setup('/forms/new');
    await stepHeading('Basics');
    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), {
      target: { value: 'Volunteer call' },
    });
    for (const next of [
      'Introduction',
      'Questions',
      'Schedule & limits',
      'Confirmation',
      'Review',
    ]) {
      fireEvent.click(continueButton());
      await stepHeading(next);
    }
    expect(screen.getByText('Before this form can be published')).toBeInTheDocument();
    expect(screen.getByText('Add at least one question.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Create form' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toBe('/admin/forms');
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).toMatchObject({
      title: 'Volunteer call',
      slug: 'volunteer-call',
      type: 'general',
      settings: { allowDrafts: true, submissionLimit: null },
    });
    expect(await screen.findByText('Form page')).toBeInTheDocument();
  });

  it('starts from the speaker application template', async () => {
    setup('/forms/new?template=speaker-application');
    await stepHeading('Basics');
    expect(screen.getByRole('textbox', { name: /^Title/ })).toHaveValue('Speaker application');
    expect(screen.getByRole('textbox', { name: /^Address/ })).toHaveValue('speaker-application');
    fireEvent.click(continueButton());
    await stepHeading('Introduction');
    expect(screen.getByRole('textbox', { name: /^Heading/ })).toHaveValue(
      'Speak at an Impact Africa Alliance event',
    );
    fireEvent.click(continueButton());
    await stepHeading('Questions');
    expect(screen.getByText(/5 steps · 19 questions/)).toBeInTheDocument();
  });

  it('returns to the step a refusal is about, keeping what was typed', async () => {
    vi.mocked(api.post).mockRejectedValue(
      Object.assign(new Error('Another form already uses the address "volunteer-call".'), {
        status: 409,
        code: 'CONFLICT',
      }),
    );
    setup('/forms/new');
    await stepHeading('Basics');
    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), {
      target: { value: 'Volunteer call' },
    });
    for (const next of [
      'Introduction',
      'Questions',
      'Schedule & limits',
      'Confirmation',
      'Review',
    ]) {
      fireEvent.click(continueButton());
      await stepHeading(next);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create form' }));
    await stepHeading('Basics');
    expect(screen.getByRole('alert')).toHaveTextContent('already uses the address');
    expect(screen.getByRole('textbox', { name: /^Title/ })).toHaveValue('Volunteer call');
  });

  it('edits a saved form through the same steps and clears what was emptied', async () => {
    vi.mocked(api.get).mockResolvedValue(savedForm);
    vi.mocked(api.patch).mockResolvedValue(savedForm);
    setup('/forms/form-1/edit');
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit form' })).toBeInTheDocument();
    await stepHeading('Basics');
    expect(screen.getByText(/This form is live/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /^Note for the team/ }), {
      target: { value: '' },
    });
    // Every step is open to an existing form, so Review is one click away.
    fireEvent.change(screen.getByRole('combobox', { name: 'Go to step' }), {
      target: { value: '5' },
    });
    await stepHeading('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Update form' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.patch).mock.calls[0]?.[0]).toBe('/admin/forms/form-1');
    expect(vi.mocked(api.patch).mock.calls[0]?.[1]).toMatchObject({
      title: 'Mentor call',
      description: null,
      intro: { heading: 'Mentor with us' },
    });
  });

  it('reviews with the shared summary: an Edit button per step and Not set for gaps', async () => {
    vi.mocked(api.get).mockResolvedValue(savedForm);
    setup('/forms/form-1/edit');
    await stepHeading('Basics');
    fireEvent.change(screen.getByRole('combobox', { name: 'Go to step' }), {
      target: { value: '5' },
    });
    await stepHeading('Review');
    expect(screen.getByRole('region', { name: 'Basics' })).toHaveTextContent('Mentor call');
    fireEvent.click(screen.getByRole('button', { name: 'Edit basics' }));
    await stepHeading('Basics');
  });

  it('holds a live form to the publishing checks, and returns to Questions instead of saving', async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...savedForm,
      steps: [
        {
          id: 'about',
          title: 'About you',
          fields: [{ id: 'track', type: 'select', label: 'Track', required: true, options: [] }],
        },
      ],
    });
    setup('/forms/form-1/edit');
    await stepHeading('Basics');
    expect(screen.getByText(/Changing the address breaks links/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Go to step' }), {
      target: { value: '5' },
    });
    await stepHeading('Review');
    expect(screen.getByText('Fix these before saving this live form')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update form' }));
    await stepHeading('Questions');
    expect(
      screen.getByText(
        'This form is live, so its questions have to stay ready for applicants. "Track" needs at least one option to choose from.',
      ),
    ).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('says so when the form cannot be found', async () => {
    vi.mocked(api.get).mockRejectedValue(
      Object.assign(new Error('Form not found'), { status: 404 }),
    );
    setup('/forms/missing/edit');
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

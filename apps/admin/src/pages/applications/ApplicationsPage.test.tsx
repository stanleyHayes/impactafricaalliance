import type { ApplicationListItem, Paginated, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import 'dayjs/locale/en-gb';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import ApplicationsPage from './ApplicationsPage';

vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const clients: QueryClient[] = [];
const FORM_ID = '64b7f0c2a1b2c3d4e5f60718';

const item: ApplicationListItem = {
  id: 'app-1',
  reference: 'APP-7K2Q9M',
  form: { id: 'form-1', title: 'Speaker call', slug: 'speaker-call', type: 'speaker-application' },
  applicant: { name: 'Ama Mensah', email: 'ama@example.org' },
  status: 'submitted',
  submittedAt: '2026-09-20T10:00:00.000Z',
  reviewCount: 2,
  lastRecommendation: 'yes',
};

const page = (items: ApplicationListItem[]): Paginated<ApplicationListItem> => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: 1,
});

beforeEach(() => {
  // A reviewer: applications, but not the forms list.
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'me',
      role: 'editor',
      permissions: ['applications:read', 'applications:update'] as Permission[],
    } as unknown as PublicUser,
  } as ReturnType<typeof useAuth>);
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === '/admin/applications/counts') {
      return Promise.resolve({
        submitted: 3,
        'under-review': 1,
        shortlisted: 0,
        accepted: 2,
        rejected: 0,
      }) as never;
    }
    if (path.startsWith('/admin/applications/export')) {
      return Promise.resolve({ filename: 'speaker-call-applications.csv', csv: 'a,b' }) as never;
    }
    return Promise.resolve(page([item])) as never;
  });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
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
  vi.restoreAllMocks();
});

const setup = (url = '/applications'): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route path="/applications" element={<ApplicationsPage />} />
            </Routes>
          </MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const listCalls = (): string[] =>
  vi
    .mocked(api.get)
    .mock.calls.map(([path]) => path)
    .filter((path) => path.startsWith('/admin/applications?'));

describe('ApplicationsPage', () => {
  it('shows a tab per status with its count, and asks the API for that status', async () => {
    setup();
    expect(await screen.findByRole('tab', { name: 'All (6)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Submitted (3)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Not taken forward (0)' })).toBeInTheDocument();
    expect((await screen.findAllByText('Ama Mensah')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: 'Under review (1)' }));
    await waitFor(() =>
      expect(listCalls().some((path) => path.includes('status=under-review'))).toBe(true),
    );
    // The forms list needs forms:read, which this reviewer does not have.
    expect(vi.mocked(api.get).mock.calls.some(([path]) => path.startsWith('/admin/forms'))).toBe(
      false,
    );
  });

  it('exports only once a form is chosen, and saves the CSV as a file', async () => {
    setup();
    const exportButton = await screen.findByRole('button', { name: 'Export CSV' });
    expect(exportButton).toBeDisabled();
    expect(screen.getByText('Choose a form to export its applications.')).toBeInTheDocument();
    cleanup();
    vi.mocked(api.get).mockClear();

    // jsdom has no object URLs; these stand in for the browser's.
    const createObjectURL = vi.fn(() => 'blob:csv');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    setup(`/applications?formId=${FORM_ID}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Export CSV' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(`/admin/applications/export?formId=${FORM_ID}`),
    );
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    // Released once the browser has had the click, not before.
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv'));
    expect(listCalls().every((path) => path.includes(`formId=${FORM_ID}`))).toBe(true);
  });

  it('ignores filters in the address that the API would refuse', async () => {
    setup('/applications?formId=not-an-id&from=2026-02-30&to=2026-09-30');
    expect((await screen.findAllByText('Ama Mensah')).length).toBeGreaterThan(0);
    const calls = listCalls();
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((path) => path.includes('to=2026-09-30'))).toBe(true);
    expect(calls.some((path) => path.includes('formId=') || path.includes('from='))).toBe(false);
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('says what fills the list when it is empty', async () => {
    vi.mocked(api.get).mockImplementation(
      (path: string) =>
        Promise.resolve(
          path === '/admin/applications/counts'
            ? { submitted: 0, 'under-review': 0, shortlisted: 0, accepted: 0, rejected: 0 }
            : page([]),
        ) as never,
    );
    setup();
    expect(await screen.findByText('No applications here yet')).toBeInTheDocument();
    expect(screen.getByText(/Unfinished drafts never do/)).toBeInTheDocument();
  });
});

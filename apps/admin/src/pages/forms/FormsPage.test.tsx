import type { FormListItem, Paginated, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import FormsPage from './FormsPage';

vi.mock('../../lib/api-client', () => ({ api: { get: vi.fn() } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const clients: QueryClient[] = [];

const item: FormListItem = {
  id: 'form-1',
  title: 'Speaker call',
  slug: 'speaker-call',
  type: 'speaker-application',
  status: 'published',
  version: 2,
  stepCount: 5,
  fieldCount: 19,
  submissionCount: 7,
  closesAt: '2026-10-31T17:00:00.000Z',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

const page = (items: FormListItem[]): Paginated<FormListItem> => ({
  items,
  page: 1,
  pageSize: 12,
  total: items.length,
  totalPages: 1,
});

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'me',
      role: 'editor',
      permissions: ['forms:read', 'forms:create'] as Permission[],
    } as unknown as PublicUser,
  } as ReturnType<typeof useAuth>);
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
        <MemoryRouter initialEntries={['/forms']}>
          <Routes>
            <Route path="/forms" element={<FormsPage />} />
            <Route path="/forms/new" element={<p>New form page</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('FormsPage', () => {
  it('lists forms with their application counts and filters by tab', async () => {
    vi.mocked(api.get).mockResolvedValue(page([item]));
    setup();
    expect(await screen.findByText('Speaker call')).toBeInTheDocument();
    expect(screen.getByText('7 applications')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Speaker call/ })).toHaveAttribute(
      'href',
      '/forms/form-1',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Archived' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/forms?archived=true&page=1&pageSize=12'),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Draft' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/forms?status=draft&page=1&pageSize=12'),
    );
  });

  it('starts a new form blank or from the speaker template', async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    setup();
    expect(await screen.findByText('No forms')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'New form' })[0]!);
    expect(
      screen.getByRole('menuitem', { name: /Speaker application \(template\)/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /Blank form/ }));
    expect(await screen.findByText('New form page')).toBeInTheDocument();
  });
});

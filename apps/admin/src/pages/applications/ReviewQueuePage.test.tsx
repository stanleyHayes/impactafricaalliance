import type { ApplicationListItem, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import ReviewQueuePage from './ReviewQueuePage';

vi.mock('../../lib/api-client', () => ({ api: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const clients: QueryClient[] = [];

const item: ApplicationListItem = {
  id: 'app-1',
  reference: 'APP-7K2Q9M',
  form: { id: 'form-1', title: 'Speaker call', slug: 'speaker-call', type: 'speaker-application' },
  applicant: { name: 'Ama Mensah' },
  status: 'submitted',
  submittedAt: new Date().toISOString(),
  reviewCount: 0,
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'me',
      role: 'editor',
      permissions: ['applications:read', 'applications:update'] as Permission[],
    } as unknown as PublicUser,
  } as ReturnType<typeof useAuth>);
  vi.mocked(api.get).mockResolvedValue({
    items: [item],
    page: 1,
    pageSize: 12,
    total: 1,
    totalPages: 1,
  });
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
});

describe('ReviewQueuePage', () => {
  it('asks for new and in-review applications, oldest first, and can start a review', async () => {
    vi.mocked(api.patch).mockResolvedValue({ ...item, status: 'under-review' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    render(
      <QueryClientProvider client={client}>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <ReviewQueuePage />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Ama Mensah')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/admin/applications?statuses=submitted%2Cunder-review&sort=submitted&order=asc&page=1&pageSize=12',
    );
    expect(screen.getByText(/Sent just now/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/admin/applications/app-1/status', {
        status: 'under-review',
      }),
    );
  });
});

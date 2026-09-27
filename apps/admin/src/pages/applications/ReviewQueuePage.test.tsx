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

const setup = (): void => {
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
};

describe('ReviewQueuePage', () => {
  it('asks for new and in-review applications, oldest first, and can start a review', async () => {
    vi.mocked(api.patch).mockResolvedValue({ ...item, status: 'under-review' });
    setup();
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

  it('names each Open link after its applicant, and opens it in the same tab', async () => {
    setup();
    const open = await screen.findByRole('link', { name: 'Open Ama Mensah (APP-7K2Q9M)' });
    expect(open).toHaveAttribute('href', '/applications/app-1');
    expect(open).not.toHaveAttribute('target');
    // The new-tab icon is kept for links that leave the console.
    expect(open.querySelector('[data-testid="OpenInNewRoundedIcon"]')).toBeNull();
    expect(open.querySelector('[data-testid="ArrowForwardRoundedIcon"]')).not.toBeNull();
  });

  it('keeps the hidden list heading one pixel wide so the page never scrolls sideways', async () => {
    setup();
    await screen.findByText('Ama Mensah');
    // MUI reads a bare `width: 1` as 100%, which stretched the page past the viewport.
    const heading = screen.getByRole('heading', { level: 2, name: 'Waiting for a decision' });
    expect(heading).toHaveStyle({ width: '1px', height: '1px', position: 'absolute' });
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});

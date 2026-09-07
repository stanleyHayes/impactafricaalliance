import type { SocialPublication } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { PublicationStatusList } from './PublicationStatusList';

const role = vi.hoisted(() => ({ current: 'admin' }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: role.current } }) }));

const publications = vi.hoisted(() => ({ current: [] as SocialPublication[] }));
vi.mock('../../lib/social-publishing', () => ({
  useSocialPublications: () => ({ data: publications.current, isLoading: false }),
  useApprovePublication: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectPublication: () => ({ mutate: vi.fn(), isPending: false }),
  useRetryPublication: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelPublication: () => ({ mutate: vi.fn(), isPending: false }),
}));

const held = (overrides: Partial<SocialPublication> = {}): SocialPublication =>
  ({
    id: 'pub-1',
    connectionId: 'conn-1',
    destination: 'linkedin',
    status: 'pending_approval',
    caption: 'A post awaiting review',
    retryCount: 0,
    idempotencyKey: 'k',
    createdAt: '2026-09-07T10:00:00.000Z',
    updatedAt: '2026-09-07T10:00:00.000Z',
    ...overrides,
  }) as SocialPublication;

const renderList = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={new QueryClient()}>
        <PublicationStatusList />
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe('a publication waiting for approval', () => {
  it('offers an administrator Approve and Decline', () => {
    role.current = 'admin';
    publications.current = [held()];
    renderList();

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('offers an editor neither, and says what it is waiting on', () => {
    role.current = 'editor';
    publications.current = [held()];
    renderList();

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for an administrator')).toBeInTheDocument();
  });

  it('does not offer Retry, which would route around the approval', () => {
    role.current = 'editor';
    publications.current = [held()];
    renderList();

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

describe('a declined publication', () => {
  it('shows why, so the writer knows what to change', () => {
    role.current = 'editor';
    publications.current = [
      held({
        status: 'cancelled',
        rejectionReason: 'The headline overstates the numbers.',
        rejectedAt: '2026-09-07T11:00:00.000Z',
      }),
    ];
    renderList();

    expect(screen.getByText(/overstates the numbers/)).toBeInTheDocument();
  });
});

describe('a published destination', () => {
  it('is never offered Retry, which is how duplicates happen', () => {
    role.current = 'admin';
    publications.current = [
      held({ status: 'published', publishedAt: '2026-09-07T11:00:00.000Z' }),
    ];
    renderList();

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

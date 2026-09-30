import type { DashboardSummary } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSubmissions } from '../lib/admin-hooks';
import { theme } from '../theme/theme';

import Dashboard from './Dashboard';

const auth = vi.hoisted(() => ({
  user: { name: 'Ama Mensah', role: 'editor', permissions: [] as string[] },
}));

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('../components/dashboard/YourWorkPanel', () => ({ YourWorkPanel: () => null }));
vi.mock('../components/NewSubmissionsBanner', () => ({ NewSubmissionsBanner: () => null }));
vi.mock('../components/charts/BarChart', () => ({ BarChart: () => null }));
vi.mock('../components/charts/DonutChart', () => ({ DonutChart: () => null }));

const summary: DashboardSummary = {
  submissions: { total: 9, newCount: 4, byType: [], byStatus: [] },
  subscribers: { total: 120, newLast30Days: 6 },
  donations: {
    totalRaisedUsd: 5000,
    succeededCount: 12,
    pendingCount: 0,
    failedCount: 0,
    byProvider: { stripe: 5000, paystack: 0 },
    monthly: [],
  },
  content: [
    { key: 'articles', label: 'Articles', total: 10, published: 8 },
    { key: 'team', label: 'Team', total: 20, published: 20 },
    { key: 'events', label: 'Events', total: 3, published: 3 },
  ],
  events: { total: 3, upcoming: 1 },
  users: 7,
  privacyRequests: { total: 2, open: 1 },
  socialConnections: 1,
  payments: {
    stripe: { configured: true, enabled: true },
    paystack: { configured: false, enabled: false },
  } as unknown as DashboardSummary['payments'],
};

vi.mock('../lib/admin-hooks', () => ({
  useDashboardSummary: () => ({ data: summary, isLoading: false, isError: false }),
  useSubmissions: vi.fn(() => ({ data: { items: [] }, isLoading: false })),
  useUpdatePaymentSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

const visit = (role: 'admin' | 'editor', permissions: string[]): void => {
  auth.user = { name: 'Ama Mensah', role, permissions };
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </ThemeProvider>,
  );
};

beforeEach(() => {
  vi.mocked(useSubmissions).mockClear();
});

describe('the dashboard, for someone who can read only some modules', () => {
  it('shows nothing of submissions, subscribers, donations or content they cannot read', () => {
    visit('editor', ['tasks:read', 'team:read']);
    expect(screen.queryByText(/new submission/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Review submissions/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Newsletter/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Subscribers')).not.toBeInTheDocument();
    expect(screen.queryByText('Donations raised')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment providers')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent submissions')).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming events')).not.toBeInTheDocument();
    expect(screen.queryByText('Open privacy requests')).not.toBeInTheDocument();
    expect(screen.queryByText('Articles')).not.toBeInTheDocument();
    // Submissions are not even asked for.
    expect(useSubmissions).toHaveBeenCalledWith({}, false);
    expect(document.querySelector('a[href^="/submissions"]')).toBeNull();
    expect(document.querySelector('a[href="/subscribers"]')).toBeNull();
    expect(document.querySelector('a[href="/donations"]')).toBeNull();
    expect(document.querySelector('a[href="/content/articles"]')).toBeNull();
  });

  it('keeps what they can read, counting only their collections', () => {
    visit('editor', ['tasks:read', 'team:read']);
    expect(screen.getByText('Content types')).toBeInTheDocument();
    expect(screen.getByText('Content inventory')).toBeInTheDocument();
    expect(screen.getByText('20 items')).toBeInTheDocument();
    for (const link of document.querySelectorAll('a[href^="/content/"]')) {
      expect(link.getAttribute('href')).toMatch(/^\/content\/team/);
    }
  });

  it('shows submissions and subscribers to someone who can read them', () => {
    visit('editor', ['submissions:read', 'subscribers:read', 'events:read']);
    expect(screen.getByText(/You have 4 new submissions/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Review submissions/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Newsletter/ })).toBeInTheDocument();
    expect(screen.getByText('Recent submissions')).toBeInTheDocument();
    expect(screen.getByText('Upcoming events')).toBeInTheDocument();
    expect(screen.queryByText('Donations raised')).not.toBeInTheDocument();
    // Events in the inventory open the events pages, not a CMS page that does not exist.
    expect(document.querySelector('a[href="/content/events"]')).toBeNull();
    expect(document.querySelector('a[href="/events"]')).not.toBeNull();
  });

  it('shows donations and payment providers to an administrator who can read donations', () => {
    visit('admin', ['donations:read']);
    expect(screen.getByText('Donations raised')).toBeInTheDocument();
    expect(screen.getByText('Payment providers')).toBeInTheDocument();
  });
});

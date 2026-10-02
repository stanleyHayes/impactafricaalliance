import type { DashboardSummary } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
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
// The chart draws SVG; its bar labels are what a reader takes away, so render those.
vi.mock('../components/charts/BarChart', () => ({
  BarChart: ({ data }: { data: { label: string; displayValue?: string }[] }) => (
    <div data-testid="bar-chart">
      {data.flatMap((bar) => (bar.displayValue ? [bar.displayValue] : [])).join(' | ')}
    </div>
  ),
}));
vi.mock('../components/charts/DonutChart', () => ({ DonutChart: () => null }));

const summary: DashboardSummary = {
  submissions: { total: 9, newCount: 4, byType: [], byStatus: [] },
  subscribers: { total: 120, newLast30Days: 6 },
  donations: {
    raised: [{ currency: 'USD', amount: 5000 }],
    succeededCount: 12,
    pendingCount: 0,
    failedCount: 0,
    byProvider: {
      stripe: { count: 12, raised: [{ currency: 'USD', amount: 5000 }] },
      paystack: { count: 0, raised: [] },
    },
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
    stripe: {
      configured: true,
      webhookConfigured: true,
      enabled: true,
      accepting: true,
      currency: 'USD',
    },
    paystack: {
      configured: false,
      webhookConfigured: false,
      enabled: false,
      accepting: false,
      currency: 'GHS',
    },
  },
};
const dollarsOnly = summary.donations;
const dollarsOnlyPayments = summary.payments;

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
  summary.donations = dollarsOnly;
  summary.payments = dollarsOnlyPayments;
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

/** Six months ending this one, as the API buckets them. */
const months = (raised: Record<string, DashboardSummary['donations']['raised']>) =>
  ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((month) => ({
    month,
    count: raised[month]?.length ?? 0,
    raised: raised[month] ?? [],
  }));

/** The Donations panel: the card holding the "Total raised" line. */
const donationsPanel = (): HTMLElement =>
  screen.getByText(/^Total raised ·/).closest<HTMLElement>('.MuiCard-root')!;

/** A provider's line under the chart: its name, its figures and its bar. */
const providerLine = (name: 'Stripe' | 'Paystack'): HTMLElement =>
  within(donationsPanel()).getByText(name).parentElement!.parentElement!;

const statTile = (): HTMLElement => screen.getByText('Donations raised').closest('a')!;

describe('donations in cedis and dollars', () => {
  const cedisAndDollars: DashboardSummary['donations'] = {
    raised: [
      { currency: 'GHS', amount: 4250 },
      { currency: 'USD', amount: 1200 },
    ],
    succeededCount: 12,
    pendingCount: 1,
    failedCount: 0,
    byProvider: {
      stripe: { count: 9, raised: [{ currency: 'USD', amount: 1200 }] },
      paystack: { count: 3, raised: [{ currency: 'GHS', amount: 4250 }] },
    },
    monthly: months({
      '2026-09': [{ currency: 'USD', amount: 1200 }],
      '2026-10': [{ currency: 'GHS', amount: 4250 }],
    }),
  };

  it('shows each currency on the stat tile and never a combined total', () => {
    summary.donations = cedisAndDollars;
    visit('admin', ['donations:read']);
    expect(statTile()).toHaveTextContent('GH₵4,250');
    expect(statTile()).toHaveTextContent('$1,200');
    // 4,250 + 1,200 would be a sum of cedis and dollars, which means nothing.
    expect(document.body).not.toHaveTextContent('5,450');
  });

  it('gives the panel a figure per currency and a chart per currency', () => {
    summary.donations = cedisAndDollars;
    visit('admin', ['donations:read']);
    const total = within(donationsPanel()).getByRole('heading', { level: 4 });
    expect(within(total).getByText('GH₵4,250')).toBeInTheDocument();
    expect(within(total).getByText('$1,200')).toBeInTheDocument();
    expect(screen.getByText('Ghana cedis (GH₵)')).toBeInTheDocument();
    expect(screen.getByText('US dollars ($)')).toBeInTheDocument();
    const charts = screen.getAllByTestId('bar-chart');
    expect(charts.map((chart) => chart.textContent)).toEqual(['GH₵4.3K', '$1.2K']);
  });

  it('splits mixed gifts by provider as a share of the gifts, and says so', () => {
    summary.donations = cedisAndDollars;
    visit('admin', ['donations:read']);
    expect(providerLine('Stripe')).toHaveTextContent('$1,200');
    expect(providerLine('Stripe')).toHaveTextContent('9 of 12 gifts');
    expect(providerLine('Paystack')).toHaveTextContent('GH₵4,250');
    expect(providerLine('Paystack')).toHaveTextContent('3 of 12 gifts');
    expect(screen.getByRole('img', { name: 'Stripe: 75% of completed gifts' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Paystack: 25% of completed gifts' }),
    ).toBeInTheDocument();
  });

  it('keeps the share of the money when every gift is in one currency', () => {
    summary.donations = {
      ...dollarsOnly,
      raised: [{ currency: 'USD', amount: 4135 }],
      succeededCount: 8,
      byProvider: {
        stripe: { count: 5, raised: [{ currency: 'USD', amount: 3575 }] },
        paystack: { count: 3, raised: [{ currency: 'USD', amount: 560 }] },
      },
    };
    visit('admin', ['donations:read']);
    expect(providerLine('Stripe')).toHaveTextContent('$3,575');
    expect(providerLine('Stripe')).toHaveTextContent('5 gifts');
    expect(providerLine('Stripe')).not.toHaveTextContent('of 8');
    expect(
      screen.getByRole('img', { name: 'Stripe: 86% of the money raised' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Paystack: 14% of the money raised' }),
    ).toBeInTheDocument();
  });

  it('keeps the single dollar chart, unlabelled, when dollars are all there is', () => {
    summary.donations = {
      ...dollarsOnly,
      monthly: months({ '2026-10': [{ currency: 'USD', amount: 5000 }] }),
    };
    visit('admin', ['donations:read']);
    expect(screen.getAllByText('$5,000').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('bar-chart').map((chart) => chart.textContent)).toEqual(['$5K']);
    expect(screen.queryByText('US dollars ($)')).not.toBeInTheDocument();
  });

  it('rounds the tile to whole cedis and keeps the pesewas in the panel', () => {
    summary.donations = {
      ...dollarsOnly,
      raised: [{ currency: 'GHS', amount: 250_250.6 }],
      byProvider: {
        stripe: { count: 0, raised: [] },
        paystack: { count: 3, raised: [{ currency: 'GHS', amount: 250_250.6 }] },
      },
    };
    visit('admin', ['donations:read']);
    expect(statTile()).toHaveTextContent('GH₵250,251');
    const total = within(donationsPanel()).getByRole('heading', { level: 4 });
    expect(total).toHaveTextContent('GH₵250,250.60');
  });

  it('writes nothing raised yet as money, in what the site charges, with no gifts yet', () => {
    summary.donations = {
      raised: [],
      succeededCount: 0,
      pendingCount: 0,
      failedCount: 0,
      byProvider: { stripe: { count: 0, raised: [] }, paystack: { count: 0, raised: [] } },
      monthly: months({}),
    };
    summary.payments = {
      stripe: { ...dollarsOnlyPayments.stripe, enabled: false, accepting: false },
      paystack: {
        ...dollarsOnlyPayments.paystack,
        configured: true,
        enabled: true,
        accepting: true,
      },
    };
    visit('admin', ['donations:read']);
    expect(statTile()).toHaveTextContent(/^GH₵0DONATIONS RAISED/i);
    const total = within(donationsPanel()).getByRole('heading', { level: 4 });
    expect(total).toHaveTextContent('GH₵0');
    expect(providerLine('Stripe')).toHaveTextContent('No gifts yet');
    expect(providerLine('Paystack')).toHaveTextContent('No gifts yet');
    expect(within(donationsPanel()).queryByText(/0 gifts/)).not.toBeInTheDocument();
  });

  it('says what Paystack charges in once its secret key is set', () => {
    summary.payments = {
      ...dollarsOnlyPayments,
      paystack: {
        configured: true,
        webhookConfigured: true,
        enabled: true,
        accepting: true,
        currency: 'GHS',
      },
    };
    visit('admin', ['donations:read']);
    expect(screen.getByText('Secret key configured · charges in GHS')).toBeInTheDocument();
    expect(screen.queryByText(/webhook secret missing/)).not.toBeInTheDocument();
  });
});

describe('Paystack on an account shared with other apps', () => {
  const paystackWith = (overrides: Partial<DashboardSummary['payments']['paystack']>): void => {
    summary.payments = {
      ...dollarsOnlyPayments,
      paystack: {
        configured: true,
        webhookConfigured: true,
        enabled: true,
        accepting: true,
        currency: 'GHS',
        returnUrl: 'https://impactafricaalliance.org/donate/complete',
        ...overrides,
      },
    };
  };

  it('shows where Paystack sends donors back, and that its webhook is not needed', () => {
    paystackWith({});
    visit('admin', ['donations:read']);
    // The address without its scheme, to fit one line; the whole of it on hover.
    expect(
      screen.getByText('Returns donors to impactafricaalliance.org/donate/complete'),
    ).toHaveAttribute('title', 'https://impactafricaalliance.org/donate/complete');
    expect(
      screen.getByText('Confirmed on return and hourly, so no webhook is needed.'),
    ).toBeInTheDocument();
    // The panel's own footer is as it was: the new lines are the Paystack row's alone.
    expect(
      screen.getByText(/Webhooks keep working for donations already in flight\./),
    ).toBeInTheDocument();
  });

  it('says nothing of it until Paystack has its secret key', () => {
    paystackWith({ configured: false, webhookConfigured: false, enabled: false, accepting: false });
    visit('admin', ['donations:read']);
    expect(screen.getByText('Add PAYSTACK_SECRET_KEY to the API environment')).toBeInTheDocument();
    expect(screen.queryByText(/Returns donors to/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no webhook is needed/)).not.toBeInTheDocument();
  });

  it('says nothing of it for an API that does not name its return address', () => {
    paystackWith({ returnUrl: undefined });
    visit('admin', ['donations:read']);
    expect(screen.getByText('Secret key configured · charges in GHS')).toBeInTheDocument();
    expect(screen.queryByText(/Returns donors to/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no webhook is needed/)).not.toBeInTheDocument();
  });

  it('leaves the Stripe row as it was', () => {
    paystackWith({});
    visit('admin', ['donations:read']);
    const stripeRow = screen
      .getByLabelText('Enable Stripe')
      .closest<HTMLElement>('.MuiStack-root')!;
    expect(stripeRow).toHaveTextContent('API key and webhook secret configured');
    expect(stripeRow).not.toHaveTextContent(/Returns donors to|no webhook is needed/);
  });
});

describe('against an API from before currencies', () => {
  // What the API answered before this change: dollars, with no currencies anywhere.
  const dollarsOnlyApi = {
    totalRaisedUsd: 4135,
    succeededCount: 8,
    pendingCount: 2,
    failedCount: 1,
    byProvider: { stripe: 3575, paystack: 560 },
    monthly: [
      { month: '2026-09', amountUsd: 0, count: 0 },
      { month: '2026-10', amountUsd: 4135, count: 8 },
    ],
  } as unknown as DashboardSummary['donations'];

  it('reads its dollars instead of breaking the page', () => {
    summary.donations = dollarsOnlyApi;
    summary.payments = {
      stripe: { configured: true, webhookConfigured: true, enabled: true, accepting: true },
      paystack: { configured: true, webhookConfigured: false, enabled: true, accepting: true },
    } as unknown as DashboardSummary['payments'];
    visit('admin', ['donations:read']);

    expect(statTile()).toHaveTextContent('$4,135');
    const total = within(donationsPanel()).getByRole('heading', { level: 4 });
    expect(total).toHaveTextContent('$4,135');
    expect(providerLine('Stripe')).toHaveTextContent('$3,575');
    expect(providerLine('Paystack')).toHaveTextContent('$560');
    expect(
      screen.getByRole('img', { name: 'Stripe: 86% of the money raised' }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('bar-chart').map((chart) => chart.textContent)).toEqual(['$4.1K']);
    expect(screen.getByText('Secret key configured')).toBeInTheDocument();
  });
});

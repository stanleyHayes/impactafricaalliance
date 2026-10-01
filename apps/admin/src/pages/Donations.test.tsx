import type { Donation } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../theme/theme';

import Donations from './Donations';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin', permissions: ['donations:read'] } }),
}));

const gift = (overrides: Partial<Donation>): Donation => ({
  id: overrides.reference ?? 'gift',
  provider: 'paystack',
  reference: 'gift',
  amount: 100,
  currency: 'GHS',
  frequency: 'one-time',
  status: 'succeeded',
  donorEmail: 'donor@example.org',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  ...overrides,
});

const mixed: Donation[] = [
  gift({ reference: 'ghs-1', amount: 100, currency: 'GHS' }),
  gift({ reference: 'usd-1', provider: 'stripe', amount: 250, currency: 'USD' }),
  gift({ reference: 'ghs-2', amount: 50, currency: 'GHS', status: 'pending' }),
];
const listed = vi.hoisted(() => ({ items: [] as unknown[] }));

vi.mock('../lib/admin-hooks', () => ({
  useDonations: () => ({
    data: {
      items: listed.items,
      total: listed.items.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    },
    isLoading: false,
  }),
}));

const renderPage = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <Donations />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

beforeEach(() => {
  // The card view renders every row without the data grid's virtualisation.
  localStorage.setItem('iaa.admin.view.donations', 'grid');
  listed.items = mixed;
});

/** The figure of the "Total raised" card. */
const totalRaised = (): HTMLElement =>
  screen.getByText('Total raised (succeeded)').nextElementSibling as HTMLElement;

describe('the Donations page', () => {
  it('totals succeeded gifts per currency and never adds cedis to dollars', () => {
    renderPage();
    expect(within(totalRaised()).getByText('GH₵100')).toBeInTheDocument();
    expect(within(totalRaised()).getByText('$250')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('350');
  });

  it('shows each gift in the currency it was made in', () => {
    renderPage();
    const cards = screen.getAllByText(/^(GH₵|\$)\d/).filter((node) => node.tagName === 'H5');
    expect(cards.map((node) => node.textContent)).toEqual(['GH₵100', '$250', 'GH₵50']);
  });

  it('writes a total with nothing succeeded yet as money in the gifts’ currency', () => {
    listed.items = [gift({ reference: 'ghs-3', amount: 20, status: 'pending' })];
    renderPage();
    expect(totalRaised()).toHaveTextContent(/^·?GH₵0$/);
  });

  it('reads gifts listed by an API from before currencies as dollars', () => {
    listed.items = [
      {
        ...gift({ reference: 'old-1', provider: 'stripe' }),
        amount: undefined,
        currency: undefined,
        amountUsd: 250,
      },
      {
        ...gift({ reference: 'old-2', provider: 'paystack' }),
        amount: undefined,
        currency: undefined,
        amountUsd: 50,
      },
    ];
    renderPage();
    expect(within(totalRaised()).getByText('$300')).toBeInTheDocument();
    expect(screen.getByText('$250')).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();
  });
});

import type { DonationConfirmation } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet } from '../lib/api-client';
import { theme } from '../theme/theme';

import DonateComplete from './DonateComplete';

vi.mock('../lib/api-client', () => ({ apiGet: vi.fn() }));

const returnFromPaystack = (confirmation: DonationConfirmation): void => {
  vi.mocked(apiGet).mockResolvedValue(confirmation);
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/donate/complete?reference=ref-123&trxref=ref-123']}>
          <DonateComplete />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe('the page Paystack sends donors back to', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it('confirms the gift in the cedis it was made in', async () => {
    returnFromPaystack({ status: 'succeeded', amount: 100, currency: 'GHS' });
    expect(
      await screen.findByText(/We have received your donation of GH₵100\./),
    ).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith('/payments/paystack/verify/ref-123');
  });

  it('confirms an older dollar gift in dollars', async () => {
    returnFromPaystack({ status: 'succeeded', amount: 50, currency: 'USD' });
    expect(await screen.findByText(/We have received your donation of \$50\./)).toBeInTheDocument();
  });

  it('thanks the donor without a figure when the reference matched no gift', async () => {
    returnFromPaystack({ status: 'succeeded' });
    expect(await screen.findByText(/We have received your donation\. /)).toBeInTheDocument();
  });
});

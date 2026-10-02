import type { DonationConfirmation } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet } from '../lib/api-client';
import type * as ApiClient from '../lib/api-client';
import { theme } from '../theme/theme';

import DonateComplete from './DonateComplete';

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  apiGet: vi.fn(),
}));

/** Open the page at this address, with the API answering the confirmation as given. */
const visit = (address: string, answer?: DonationConfirmation | Error): void => {
  if (answer instanceof Error) {
    vi.mocked(apiGet).mockRejectedValue(answer);
  } else if (answer) {
    vi.mocked(apiGet).mockResolvedValue(answer);
  }
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={[address]}>
          <DonateComplete />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

/** The page's questions about the payment, leaving out what the rest of the page asks for. */
const verifyCalls = (): unknown[][] =>
  vi.mocked(apiGet).mock.calls.filter(([path]) => String(path).startsWith('/payments/'));

/** Paystack's callback after checkout: the reference, twice. */
const returnFromPaystack = (answer: DonationConfirmation | Error): void =>
  visit('/donate/complete?reference=ref-123&trxref=ref-123', answer);

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

  it('says a payment not yet confirmed usually will be within an hour', async () => {
    returnFromPaystack({ status: 'pending', amount: 100, currency: 'GHS' });
    expect(
      await screen.findByRole('heading', { name: 'Your payment is being confirmed' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If you paid, your donation will usually be confirmed within an hour/),
    ).toBeInTheDocument();
    expect(screen.getByText('Reference: ref-123')).toBeInTheDocument();
  });

  it('lets the donor check again, and thanks them once the payment is confirmed', async () => {
    returnFromPaystack({ status: 'pending', amount: 100, currency: 'GHS' });
    const again = await screen.findByRole('button', { name: 'Check again' });

    vi.mocked(apiGet).mockResolvedValue({ status: 'succeeded', amount: 100, currency: 'GHS' });
    fireEvent.click(again);

    expect(
      await screen.findByText(/We have received your donation of GH₵100\./),
    ).toBeInTheDocument();
    expect(verifyCalls()).toHaveLength(2);
  });

  it('keeps the failure view for a payment that failed', async () => {
    returnFromPaystack({ status: 'failed', amount: 100, currency: 'GHS' });
    expect(
      await screen.findByRole('heading', { name: 'We could not confirm your donation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/get-involved#donate',
    );
  });

  it('keeps the failure view for a reference the API does not know', async () => {
    returnFromPaystack(new ApiError(404, 'NOT_FOUND', 'Payment reference not found'));
    // The page asks twice before giving up.
    expect(
      await screen.findByRole(
        'heading',
        { name: 'We could not confirm your donation' },
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
  });

  it('says the payment is being confirmed when it could not be checked just now', async () => {
    // Paystack, or the API, out of reach for a moment: the hourly check still confirms the gift.
    returnFromPaystack(
      new ApiError(503, 'SERVICE_UNAVAILABLE', 'Paystack could not process the request'),
    );
    expect(
      await screen.findByRole(
        'heading',
        { name: 'Your payment is being confirmed' },
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/reversed by your bank/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
  });
});

describe('the page Paystack’s Cancel button sends donors to', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it('says calmly that nothing was charged, with a way back to donate', () => {
    visit('/donate/complete?reference=iaa-0b7c6d5e&cancelled=1', {
      status: 'pending',
      amount: 100,
      currency: 'GHS',
    });
    // Straight away, without waiting for the check.
    expect(screen.getByRole('heading', { name: 'You cancelled the payment' })).toBeInTheDocument();
    expect(screen.getByText(/Nothing was charged\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to donate' })).toHaveAttribute(
      'href',
      '/get-involved#donate',
    );
    expect(screen.queryByText(/could not confirm/)).not.toBeInTheDocument();
  });

  it.each([
    ['is still pending', { status: 'pending', amount: 100, currency: 'GHS' }],
    ['is none of the site’s', new ApiError(404, 'NOT_FOUND', 'Payment reference not found')],
    [
      'cannot be checked just now',
      new ApiError(503, 'SERVICE_UNAVAILABLE', 'Paystack could not process the request'),
    ],
  ] as [string, DonationConfirmation | Error][])(
    'stays calm when the quiet check finds the payment %s',
    async (_case, answer) => {
      visit('/donate/complete?reference=iaa-0b7c6d5e&cancelled=1', answer);
      // An error is asked about twice before the page gives up.
      await waitFor(() => expect(verifyCalls()).toHaveLength(answer instanceof Error ? 2 : 1), {
        timeout: 5_000,
      });
      expect(
        screen.getByRole('heading', { name: 'You cancelled the payment' }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/could not confirm/)).not.toBeInTheDocument();
    },
  );

  it('thanks the donor instead when Paystack confirms a payment after all', async () => {
    // Mobile money approved on the phone just as the donor pressed Cancel.
    visit('/donate/complete?reference=iaa-0b7c6d5e&cancelled=1', {
      status: 'succeeded',
      amount: 100,
      currency: 'GHS',
    });
    expect(
      await screen.findByText(/We have received your donation of GH₵100\./),
    ).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith('/payments/paystack/verify/iaa-0b7c6d5e');
    expect(screen.queryByText(/Nothing was charged/)).not.toBeInTheDocument();
  });
});

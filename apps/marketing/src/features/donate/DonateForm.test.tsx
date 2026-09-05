import { DONATION_TIERS, PaymentProvider } from '@iaa/shared';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateDonation, usePaymentProviders } from '../../lib/mutations';
import { renderWithProviders } from '../../test/test-utils';

import { DonateForm } from './DonateForm';

vi.mock('../../lib/mutations', () => ({
  useCreateDonation: vi.fn(),
  usePaymentProviders: vi.fn(),
}));
vi.mock('./stripe', () => ({ isStripeEnabled: () => false, getStripe: vi.fn() }));

const mutate = vi.fn();
const refetch = vi.fn();
const availability = (
  data: { stripe: boolean; paystack: boolean } | undefined,
  isError = false,
): void => {
  vi.mocked(usePaymentProviders).mockReturnValue({
    data,
    isError,
    refetch,
  } as unknown as ReturnType<typeof usePaymentProviders>);
};

describe('DonateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    availability({ stripe: false, paystack: true });
    vi.mocked(useCreateDonation).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateDonation>);
  });

  it('uses a selected impact amount and preserves donor and frequency values in checkout', async () => {
    renderWithProviders(<DonateForm />);
    const tier = DONATION_TIERS[3]!;
    await userEvent.click(screen.getByRole('button', { name: `Give $1,000: ${tier.impact}` }));
    expect(screen.getByRole('spinbutton', { name: 'Custom amount (USD)' })).toHaveValue(1000);
    await userEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'donor@example.com' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Donate $1000 via Paystack' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amountUsd: 1000,
        frequency: 'monthly',
        donorEmail: 'donor@example.com',
        provider: PaymentProvider.Paystack,
        marketingConsent: false,
      }),
      expect.any(Object),
    );
  });

  it('blocks checkout and offers contact when no provider is available', () => {
    availability({ stripe: false, paystack: false });
    renderWithProviders(<DonateForm />);
    expect(screen.getByRole('button', { name: 'Online giving unavailable' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Contact us about giving' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:'),
    );
    fireEvent.submit(screen.getByRole('form', { name: 'Make a donation' }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('uses a skeleton and disables checkout while payment methods load', () => {
    availability(undefined);
    renderWithProviders(<DonateForm />);
    expect(screen.getByLabelText('Loading payment methods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checking payment methods…' })).toBeDisabled();
  });

  it('offers retry instead of a permanent loading state after provider lookup fails', async () => {
    availability(undefined, true);
    renderWithProviders(<DonateForm />);
    expect(screen.queryByLabelText('Loading payment methods')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});

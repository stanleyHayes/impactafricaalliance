import { DONATION_TIERS, PaymentProvider, type PaymentProvidersPublic } from '@iaa/shared';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateDonation, usePaymentProviders } from '../../lib/mutations';
import { renderWithProviders } from '../../test/test-utils';

import { DonateForm } from './DonateForm';

const stripeKey = vi.hoisted(() => ({ present: false }));

vi.mock('../../lib/mutations', () => ({
  useCreateDonation: vi.fn(),
  usePaymentProviders: vi.fn(),
}));
vi.mock('./stripe', () => ({ isStripeEnabled: () => stripeKey.present, getStripe: vi.fn() }));

const mutate = vi.fn();
const refetch = vi.fn();
const currencies: PaymentProvidersPublic['currencies'] = { stripe: 'USD', paystack: 'GHS' };
const availability = (
  data: Omit<PaymentProvidersPublic, 'currencies'> | undefined,
  isError = false,
  charged = currencies,
): void => {
  vi.mocked(usePaymentProviders).mockReturnValue({
    data: data && { ...data, currencies: charged },
    isError,
    refetch,
  } as unknown as ReturnType<typeof usePaymentProviders>);
};

const PAYSTACK_LINE = 'You’ll pay in Ghana cedis (GH₵) on Paystack’s secure checkout.';
/** The one-tap amounts: the buttons whose whole label is an amount. */
const presetLabels = (): string[] =>
  screen
    .getAllByRole('button')
    .map((button) => button.textContent ?? '')
    .filter((label) => /^(GH₵|\$)[\d,.]+$/.test(label));

describe('DonateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeKey.present = false;
    availability({ stripe: false, paystack: true });
    vi.mocked(useCreateDonation).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateDonation>);
  });

  it('prices a Paystack gift in Ghana cedis and says so', async () => {
    renderWithProviders(<DonateForm />);
    expect(presetLabels()).toEqual(['GH₵50', 'GH₵100', 'GH₵200', 'GH₵500']);
    expect(screen.getByText('Choose an amount (GHS)')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Custom amount (GHS)' })).toHaveValue(100);
    expect(screen.getByText(PAYSTACK_LINE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Donate GH₵100 via Paystack' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'GH₵200' }));
    await userEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'donor@example.com' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Donate GH₵200 via Paystack' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 200,
        currency: 'GHS',
        frequency: 'monthly',
        donorEmail: 'donor@example.com',
        provider: PaymentProvider.Paystack,
        marketingConsent: false,
      }),
      expect.any(Object),
    );
  });

  it('keeps the dollar impact examples from filling in a cedi amount', () => {
    renderWithProviders(<DonateForm />);
    const tier = DONATION_TIERS[3]!;
    expect(screen.getByText(tier.impact)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: `Give $1,000: ${tier.impact}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('These examples are costed in US dollars; your gift is in Ghana cedis.'),
    ).toBeInTheDocument();
  });

  it('takes cedi gifts down to the GH₵0.10 Paystack accepts and no lower', async () => {
    renderWithProviders(<DonateForm />);
    const custom = screen.getByRole('spinbutton', { name: 'Custom amount (GHS)' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'donor@example.com' },
    });

    fireEvent.change(custom, { target: { value: '0.05' } });
    await userEvent.click(screen.getByRole('button', { name: 'Donate GH₵0.05 via Paystack' }));
    expect(await screen.findByText('Minimum donation is GH₵0.10')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.change(custom, { target: { value: '0.1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Donate GH₵0.10 via Paystack' }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0.1, currency: 'GHS' }),
      expect.any(Object),
    );
  });

  it('holds a Paystack gift in dollars to the $2 Paystack takes', async () => {
    // PAYSTACK_CURRENCY=USD: dollars through Paystack start at $2, where Stripe takes $1.
    availability({ stripe: false, paystack: true }, false, { stripe: 'USD', paystack: 'USD' });
    renderWithProviders(<DonateForm />);
    const custom = screen.getByRole('spinbutton', { name: 'Custom amount (USD)' });
    expect(custom).toHaveAttribute('min', '2');
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'donor@example.com' },
    });

    fireEvent.change(custom, { target: { value: '1.5' } });
    await userEvent.click(screen.getByRole('button', { name: 'Donate $1.50 via Paystack' }));
    expect(await screen.findByText('Minimum donation is $2')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('keeps Stripe in dollars, with its own presets and the impact examples', async () => {
    stripeKey.present = true;
    availability({ stripe: true, paystack: true });
    renderWithProviders(<DonateForm />);
    expect(presetLabels()).toEqual(['$25', '$50', '$100', '$500']);
    expect(screen.getByText('Choose an amount (USD)')).toBeInTheDocument();
    expect(screen.queryByText(PAYSTACK_LINE)).not.toBeInTheDocument();

    const tier = DONATION_TIERS[3]!;
    await userEvent.click(screen.getByRole('button', { name: `Give $1,000: ${tier.impact}` }));
    expect(screen.getByRole('spinbutton', { name: 'Custom amount (USD)' })).toHaveValue(1000);
    expect(screen.getByRole('button', { name: 'Donate $1,000 by card' })).toBeEnabled();
  });

  it('starts the amount again in cedis when the donor switches to Paystack', async () => {
    stripeKey.present = true;
    availability({ stripe: true, paystack: true });
    renderWithProviders(<DonateForm />);
    await userEvent.click(screen.getByRole('button', { name: '$500' }));
    expect(screen.getByRole('button', { name: 'Donate $500 by card' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Card / Mobile money' }));
    expect(presetLabels()).toEqual(['GH₵50', 'GH₵100', 'GH₵200', 'GH₵500']);
    expect(screen.getByRole('spinbutton', { name: 'Custom amount (GHS)' })).toHaveValue(100);
    expect(screen.getByRole('button', { name: 'Donate GH₵100 via Paystack' })).toBeInTheDocument();
    expect(screen.getByText(PAYSTACK_LINE)).toBeInTheDocument();
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

  it('shows no amounts until it knows the currency they are in', () => {
    stripeKey.present = true;
    availability(undefined);
    const { rerender } = renderWithProviders(<DonateForm />);
    // Dollars drawn first, then cedis or nothing at all, read as a form that broke.
    expect(screen.getByLabelText('Loading amounts')).toBeInTheDocument();
    expect(presetLabels()).toEqual([]);
    expect(screen.queryByText(/Choose an amount/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Custom amount/)).not.toBeInTheDocument();

    availability({ stripe: false, paystack: true });
    rerender(<DonateForm />);
    expect(screen.queryByLabelText('Loading amounts')).not.toBeInTheDocument();
    expect(presetLabels()).toEqual(['GH₵50', 'GH₵100', 'GH₵200', 'GH₵500']);
    expect(screen.getByText('Choose an amount (GHS)')).toBeInTheDocument();
  });

  it('offers retry instead of a permanent loading state after provider lookup fails', async () => {
    availability(undefined, true);
    renderWithProviders(<DonateForm />);
    expect(screen.queryByLabelText('Loading payment methods')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});

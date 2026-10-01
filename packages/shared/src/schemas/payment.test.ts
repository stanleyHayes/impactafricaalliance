import { describe, expect, it } from 'vitest';

import { DONATION_CURRENCY_RULES, donationMinimum } from '../constants/donation.js';
import { DonationCurrency, PaymentProvider } from '../enums.js';

import { createDonationSchema } from './payment.js';

const gift = (amount: number, currency: DonationCurrency) =>
  createDonationSchema.safeParse({
    provider: currency === DonationCurrency.GHS ? PaymentProvider.Paystack : PaymentProvider.Stripe,
    amount,
    currency,
    donorEmail: 'donor@example.org',
  });

const amountMessages = (result: ReturnType<typeof gift>): string[] =>
  result.success
    ? []
    : result.error.issues
        .filter((issue) => issue.path.join('.') === 'amount')
        .map((issue) => issue.message);

describe('createDonationSchema', () => {
  it('takes cedis down to the GH₵0.10 Paystack accepts', () => {
    expect(gift(0.1, DonationCurrency.GHS).success).toBe(true);
    expect(amountMessages(gift(0.05, DonationCurrency.GHS))).toEqual([
      'Minimum donation is GH₵0.10',
    ]);
  });

  it('keeps the dollar floor at $1', () => {
    expect(gift(1, DonationCurrency.USD).success).toBe(true);
    // Half a dollar is fine in cedis terms but not as a dollar gift.
    expect(amountMessages(gift(0.5, DonationCurrency.USD))).toEqual(['Minimum donation is $1']);
  });

  it('holds dollars through Paystack to the $2 Paystack accepts', () => {
    const viaPaystack = (amount: number) =>
      createDonationSchema.safeParse({
        provider: PaymentProvider.Paystack,
        amount,
        currency: DonationCurrency.USD,
        donorEmail: 'donor@example.org',
      });
    expect(amountMessages(viaPaystack(1.5))).toEqual(['Minimum donation is $2']);
    expect(viaPaystack(2).success).toBe(true);
    // The same $1.50 by card is above Stripe's floor.
    expect(gift(1.5, DonationCurrency.USD).success).toBe(true);
    expect(donationMinimum(PaymentProvider.Paystack, DonationCurrency.GHS)).toBe(0.1);
    expect(donationMinimum(PaymentProvider.Stripe, DonationCurrency.USD)).toBe(1);
  });

  it('caps each currency at its own maximum', () => {
    const cedisCap = DONATION_CURRENCY_RULES.GHS.max;
    expect(gift(cedisCap, DonationCurrency.GHS).success).toBe(true);
    expect(amountMessages(gift(cedisCap + 1, DonationCurrency.GHS))).toEqual([
      'Maximum donation is GH₵1,000,000',
    ]);
    // GH₵200,000 is a fair cedi gift and far above the dollar cap.
    expect(gift(200_000, DonationCurrency.GHS).success).toBe(true);
    expect(amountMessages(gift(200_000, DonationCurrency.USD))).toEqual([
      'Maximum donation is $100,000',
    ]);
  });

  it('refuses fractions of a pesewa or a cent', () => {
    expect(gift(10.5, DonationCurrency.GHS).success).toBe(true);
    expect(amountMessages(gift(10.505, DonationCurrency.GHS))).toEqual([
      'Use no more than two decimal places',
    ]);
  });

  it('refuses a currency it does not know', () => {
    const result = createDonationSchema.safeParse({
      provider: PaymentProvider.Paystack,
      amount: 100,
      currency: 'EUR',
      donorEmail: 'donor@example.org',
    });
    expect(result.success).toBe(false);
  });

  it('reports the amount alongside other mistakes', () => {
    const result = createDonationSchema.safeParse({
      provider: PaymentProvider.Paystack,
      amount: 0.01,
      currency: DonationCurrency.GHS,
      donorEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['amount', 'donorEmail']));
  });
});

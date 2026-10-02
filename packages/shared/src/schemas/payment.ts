import { z } from 'zod';

import { DONATION_CURRENCY_RULES, donationMinimum } from '../constants/donation.js';
import {
  DONATION_CURRENCIES,
  DONATION_FREQUENCIES,
  DONATION_STATUSES,
  PAYMENT_PROVIDERS,
  type DonationCurrency,
  type DonationFrequency,
  type DonationStatus,
  type PaymentProvider,
} from '../enums.js';
import { formatMoney, hasMinorUnits } from '../utils/money.js';

import type { Timestamped } from './common.js';

const providerEnum = z.enum(PAYMENT_PROVIDERS as [PaymentProvider, ...PaymentProvider[]]);
const frequencyEnum = z.enum(DONATION_FREQUENCIES as [DonationFrequency, ...DonationFrequency[]]);
const currencyEnum = z.enum(DONATION_CURRENCIES as [DonationCurrency, ...DonationCurrency[]]);

/**
 * Request to start a donation. The client never sends a status or provider
 * reference — those are owned by the server and the payment provider.
 *
 * `currency` is the one the donor was shown. The API refuses it unless it is
 * the one the chosen provider charges in, so nobody pays cedis they read as
 * dollars, or the other way round.
 */
export const createDonationSchema = z
  .object({
    provider: providerEnum,
    /** Major units of `currency`: GH₵100 is 100. */
    amount: z.number(),
    currency: currencyEnum,
    frequency: frequencyEnum.default('one-time'),
    donorName: z.string().min(2).max(120).trim().optional(),
    donorEmail: z.string().email().toLowerCase().trim(),
    marketingConsent: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const rules = DONATION_CURRENCY_RULES[value.currency];
    if (!rules || !Number.isFinite(value.amount)) {
      return;
    }
    const issue = (message: string): void =>
      ctx.addIssue({ code: 'custom', path: ['amount'], message });
    const minimum = donationMinimum(value.provider, value.currency);
    if (value.amount < minimum) {
      issue(`Minimum donation is ${formatMoney(minimum, value.currency)}`);
    } else if (value.amount > rules.max) {
      issue(`Maximum donation is ${formatMoney(rules.max, value.currency)}`);
    } else if (!hasMinorUnits(value.amount)) {
      issue('Use no more than two decimal places');
    }
  });
export type CreateDonationInput = z.infer<typeof createDonationSchema>;

/**
 * Provider-agnostic response that tells the client how to complete payment.
 * - Stripe: `clientSecret` for the Payment Element.
 * - Paystack: `authorizationUrl` of its hosted checkout, plus `reference`. The
 *   site only redirects there, so it never needs a Paystack public key.
 */
export interface DonationInitResponse {
  donationId: string;
  provider: PaymentProvider;
  reference: string;
  clientSecret?: string;
  authorizationUrl?: string;
}

/** An amount in one currency. Totals stay per currency: cedis are never added to dollars. */
export interface MoneyAmount {
  currency: DonationCurrency;
  amount: number;
}

export interface Donation extends Timestamped {
  provider: PaymentProvider;
  reference: string;
  /** Major units of `currency`. Records from before currencies were kept read as dollars. */
  amount: number;
  currency: DonationCurrency;
  frequency: DonationFrequency;
  status: DonationStatus;
  donorName?: string;
  donorEmail: string;
  marketingConsent?: boolean;
  /** When the API last asked Paystack about the gift; absent until it first does. */
  lastCheckedAt?: string;
}

/**
 * What the site's return page learns after Paystack sends the donor back. A reference
 * that is not one of the site's gifts gets a 404 instead.
 */
export interface DonationConfirmation {
  status: DonationStatus;
  /** Left out by an older API, which answered a reference matching no gift this way. */
  amount?: number;
  currency?: DonationCurrency;
}

export { DONATION_STATUSES };

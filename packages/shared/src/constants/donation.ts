import { DonationCurrency, PaymentProvider } from '../enums.js';

/**
 * Donation impact tiers (docs/website-content.md — Get Involved → Donate).
 * Costed in whole US dollars, as the content gives them.
 */

export interface DonationTier {
  readonly amountUsd: number;
  readonly impact: string;
}

export const DONATION_TIERS: readonly DonationTier[] = [
  { amountUsd: 25, impact: 'Provides digital learning materials for one youth participant' },
  { amountUsd: 100, impact: 'Covers a 3-month online course subscription for one learner' },
  {
    amountUsd: 500,
    impact: 'Funds one Career Launchpad employability workshop for a youth cohort',
  },
  {
    amountUsd: 1000,
    impact: 'Sponsors a woman through the full entrepreneurship and mentorship program',
  },
  { amountUsd: 5000, impact: 'Equips an entire Digital Skills Hub cohort of 20 youth' },
];

export interface DonationCurrencyRules {
  /** Written before an amount: GH₵100, $100. */
  readonly symbol: string;
  /** The currency's name in a sentence. */
  readonly name: string;
  /** Smallest gift, in major units. */
  readonly min: number;
  /** Largest gift, in major units: a sanity cap, not a gateway limit. */
  readonly max: number;
  /** One-tap amounts on the donation form. */
  readonly presets: readonly number[];
  /** The amount the form starts on. */
  readonly defaultAmount: number;
}

/**
 * Per-currency amounts. Amounts are major units (GH₵100 is 100); the API converts to pesewas or
 * cents for the gateway. GH₵0.10 is the least Paystack accepts in cedis; $1 sits above Stripe's
 * $0.50 floor. A provider can ask for more: see `donationMinimum`.
 */
export const DONATION_CURRENCY_RULES: Readonly<Record<DonationCurrency, DonationCurrencyRules>> = {
  [DonationCurrency.GHS]: {
    symbol: 'GH₵',
    name: 'Ghana cedis',
    min: 0.1,
    max: 1_000_000,
    presets: [50, 100, 200, 500],
    defaultAmount: 100,
  },
  [DonationCurrency.USD]: {
    symbol: '$',
    name: 'US dollars',
    min: 1,
    max: 100_000,
    presets: [25, 50, 100, 500],
    defaultAmount: 100,
  },
};

/**
 * Where Paystack's own floor is above a currency's: it takes dollars from $2, where Stripe takes
 * them from $1. (Its cedi floor, GH₵0.10, is the cedi minimum already.)
 */
const PAYSTACK_MINIMUMS: Partial<Record<DonationCurrency, number>> = {
  [DonationCurrency.USD]: 2,
};

/** The smallest gift a provider takes in a currency, in major units. */
export const donationMinimum = (provider: PaymentProvider, currency: DonationCurrency): number => {
  const paystackFloor =
    provider === PaymentProvider.Paystack ? (PAYSTACK_MINIMUMS[currency] ?? 0) : 0;
  return Math.max(DONATION_CURRENCY_RULES[currency].min, paystackFloor);
};

/** Stripe always charges in dollars. */
export const STRIPE_CURRENCY: DonationCurrency = DonationCurrency.USD;

/** Paystack's currency when the API does not say (PAYSTACK_CURRENCY defaults to it too). */
export const DEFAULT_PAYSTACK_CURRENCY: DonationCurrency = DonationCurrency.GHS;

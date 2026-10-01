import {
  DEFAULT_PAYSTACK_CURRENCY,
  DONATION_CURRENCIES,
  DonationCurrency,
  STRIPE_CURRENCY,
  type DashboardDonationMonth,
  type DashboardProviderDonations,
  type DashboardSummary,
  type MoneyAmount,
  type PaymentSettingsStatus,
} from '@iaa/shared';

type DonationsSummary = DashboardSummary['donations'];

/**
 * The summary as an API from before currencies sends it: dollars only, as every gift then
 * was. The console can go live before the API it talks to (Vercel usually finishes before
 * Render), so for a while it may be handed this.
 */
interface DollarsOnlySummary {
  totalRaisedUsd?: number;
  byProvider?: { stripe?: ProviderFigures; paystack?: ProviderFigures };
  monthly?: (Partial<DashboardDonationMonth> & { amountUsd?: number })[];
}

/** A provider's figures: its dollars alone before currencies, a count and totals after. */
type ProviderFigures = number | Partial<DashboardProviderDonations>;

/** Dollars as a per-currency list, the way a summary from before currencies reported them. */
const dollars = (amount: number | undefined): MoneyAmount[] =>
  amount ? [{ currency: DonationCurrency.USD, amount }] : [];

const readProvider = (value: ProviderFigures | undefined): DashboardProviderDonations =>
  typeof value === 'number'
    ? // The old summary gave each provider's dollars and no count.
      { count: 0, raised: dollars(value) }
    : { count: value?.count ?? 0, raised: value?.raised ?? [] };

/**
 * The donations summary in its current shape, whichever API sent it: figures from before
 * currencies read as dollars, and anything missing as nothing, never as a crash.
 */
export const readDonationsSummary = (summary: DonationsSummary): DonationsSummary => {
  const old = summary as unknown as DollarsOnlySummary;
  return {
    ...summary,
    raised: summary.raised ?? dollars(old.totalRaisedUsd),
    succeededCount: summary.succeededCount ?? 0,
    pendingCount: summary.pendingCount ?? 0,
    failedCount: summary.failedCount ?? 0,
    byProvider: {
      stripe: readProvider(old.byProvider?.stripe),
      paystack: readProvider(old.byProvider?.paystack),
    },
    monthly: (old.monthly ?? []).map((bucket) => ({
      month: bucket.month ?? '',
      count: bucket.count ?? 0,
      raised: bucket.raised ?? dollars(bucket.amountUsd),
    })),
  };
};

/** A listed gift in its current shape; one from an API before currencies is in dollars. */
export const readDonationRow = <T extends object>(
  row: T,
): T & { amount: number; currency: DonationCurrency } => {
  const gift = row as { amount?: number; amountUsd?: number; currency?: DonationCurrency };
  return {
    ...row,
    amount: gift.amount ?? gift.amountUsd ?? 0,
    currency: gift.currency ?? DonationCurrency.USD,
  };
};

const chargedIn = (
  provider: 'stripe' | 'paystack',
  payments: PaymentSettingsStatus | undefined,
): DonationCurrency =>
  payments?.[provider]?.currency ??
  (provider === 'stripe' ? STRIPE_CURRENCY : DEFAULT_PAYSTACK_CURRENCY);

/**
 * What "nothing raised yet" is written in: the currencies of the providers taking gifts, or
 * Paystack's when none is, cedis first. "GH₵0" reads as money where a bare "0" read as a count.
 */
export const zeroCurrencies = (payments: PaymentSettingsStatus | undefined): DonationCurrency[] => {
  const providers = (['paystack', 'stripe'] as const).filter((key) => payments?.[key]?.accepting);
  const currencies = (providers.length > 0 ? providers : (['paystack'] as const)).map((key) =>
    chargedIn(key, payments),
  );
  return DONATION_CURRENCIES.filter((currency) => currencies.includes(currency));
};

/**
 * Advance of one character of a stat figure, in ems of the tile's Outfit at weight 800 with
 * its tracking, rounded up: measured digits 0.57, comma and point 0.27-0.28, G and H 0.72-0.77,
 * and ₵ about 0.64 from the system font, since Outfit has no cedi sign.
 */
const advanceOf = (char: string): number => {
  if (char >= '0' && char <= '9') {
    return 0.6;
  }
  if (char === ',' || char === '.') {
    return 0.3;
  }
  return /[A-Z]/.test(char) ? 0.8 : 0.75;
};

/** How many ems wide a figure is set: near enough, and never short, to size it to its box. */
export const figureWidthEm = (figure: string): number =>
  [...figure].reduce((sum, char) => sum + advanceOf(char), 0);

/**
 * A font size at which the widest of these figures fits the width of the nearest container
 * (`container-type: inline-size`), and never above `max`. Short figures keep `max`.
 */
export const fittedFontSize = (figures: readonly string[], max: string): string => {
  const widest = Math.max(1, ...figures.map(figureWidthEm));
  return `min(${max}, ${(100 / widest).toFixed(2)}cqi)`;
};

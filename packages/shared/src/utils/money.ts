import { DONATION_CURRENCY_RULES } from '../constants/donation.js';
import { DONATION_CURRENCIES, type DonationCurrency } from '../enums.js';
import type { MoneyAmount } from '../schemas/payment.js';

const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const TWO_PLACES = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** Pesewas or cents: both currencies divide into a hundred. */
export const toMinorUnits = (amount: number): number => Math.round(amount * 100);

/** True when the amount is a whole number of pesewas or cents (GH₵10.50, not GH₵10.505). */
export const hasMinorUnits = (amount: number): boolean =>
  Math.abs(toMinorUnits(amount) - amount * 100) < 1e-6;

/**
 * The symbol written before an amount. A currency this code does not know (a newer API, a
 * stray record) is written as its code, and a missing one as nothing, rather than throwing.
 */
const symbolOf = (currency: DonationCurrency): string => {
  const rules = (DONATION_CURRENCY_RULES as Partial<Record<string, { symbol: string }>>)[currency];
  if (rules) {
    return rules.symbol;
  }
  return typeof currency === 'string' && currency ? `${currency} ` : '';
};

/**
 * An amount with its currency's symbol: GH₵4,250, $1,200, GH₵0.10, or GH₵4.3K compact.
 *
 * The symbol is written here rather than by Intl, which prints "GHS 4,250" or
 * "GH₵4,250" depending on the locale and the browser's ICU data. Whole amounts
 * drop the pesewas or cents; anything else shows two places, unless `whole`
 * rounds it for a headline figure that has to stay short.
 */
export const formatMoney = (
  amount: number,
  currency: DonationCurrency,
  options: { compact?: boolean; whole?: boolean } = {},
): string => {
  const magnitude = Math.abs(amount);
  let digits: string;
  if (options.compact) {
    digits = COMPACT.format(magnitude);
  } else if (options.whole || toMinorUnits(magnitude) % 100 === 0) {
    digits = WHOLE.format(magnitude);
  } else {
    digits = TWO_PLACES.format(magnitude);
  }
  return `${amount < 0 ? '-' : ''}${symbolOf(currency)}${digits}`;
};

/** Each currency's figure side by side, never summed: "GH₵4,250 · $1,200". */
export const formatMoneyList = (
  amounts: readonly MoneyAmount[],
  options: { compact?: boolean; whole?: boolean } = {},
): string => amounts.map((entry) => formatMoney(entry.amount, entry.currency, options)).join(' · ');

/** Orders currencies as DONATION_CURRENCIES does, so every list reads the same way. */
export const compareCurrencies = (a: DonationCurrency, b: DonationCurrency): number =>
  DONATION_CURRENCIES.indexOf(a) - DONATION_CURRENCIES.indexOf(b);

/**
 * Totals per currency, in the usual order, leaving out currencies with nothing in them.
 * Summed in pesewas and cents, so GH₵0.10 three times is GH₵0.30 and not 0.30000000000000004.
 */
export const sumByCurrency = (amounts: Iterable<MoneyAmount>): MoneyAmount[] => {
  const minor = new Map<DonationCurrency, number>();
  for (const { currency, amount } of amounts) {
    minor.set(currency, (minor.get(currency) ?? 0) + toMinorUnits(amount));
  }
  return [...minor.entries()]
    .filter(([, total]) => total !== 0)
    .sort(([a], [b]) => compareCurrencies(a, b))
    .map(([currency, total]) => ({ currency, amount: total / 100 }));
};

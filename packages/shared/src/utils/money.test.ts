import { describe, expect, it } from 'vitest';

import { DonationCurrency } from '../enums.js';

import {
  formatMoney,
  formatMoneyList,
  hasMinorUnits,
  sumByCurrency,
  toMinorUnits,
} from './money.js';

const { GHS, USD } = DonationCurrency;

describe('formatMoney', () => {
  it('writes cedis with the cedi sign and dollars with the dollar sign', () => {
    expect(formatMoney(4250, GHS)).toBe('GH₵4,250');
    expect(formatMoney(1200, USD)).toBe('$1,200');
  });

  it('shows pesewas and cents only when there are some', () => {
    expect(formatMoney(100, GHS)).toBe('GH₵100');
    expect(formatMoney(0.1, GHS)).toBe('GH₵0.10');
    expect(formatMoney(100.5, USD)).toBe('$100.50');
    // A float sum just off a whole number still reads as one.
    expect(formatMoney(0.1 + 0.2 + 0.7, GHS)).toBe('GH₵1');
  });

  it('abbreviates for chart labels', () => {
    expect(formatMoney(4250, GHS, { compact: true })).toBe('GH₵4.3K');
    expect(formatMoney(1200, USD, { compact: true })).toBe('$1.2K');
    expect(formatMoney(250, USD, { compact: true })).toBe('$250');
  });

  it('rounds to whole cedis or dollars for a headline figure', () => {
    expect(formatMoney(250_250.6, GHS, { whole: true })).toBe('GH₵250,251');
    expect(formatMoney(0.1, GHS, { whole: true })).toBe('GH₵0');
    expect(formatMoney(4135, USD, { whole: true })).toBe('$4,135');
  });

  it('writes a currency it does not know by its code instead of failing', () => {
    expect(formatMoney(12, 'EUR' as DonationCurrency)).toBe('EUR 12');
    expect(formatMoney(12, undefined as unknown as DonationCurrency)).toBe('12');
  });
});

describe('formatMoneyList', () => {
  it('sets each currency side by side without adding them up', () => {
    expect(
      formatMoneyList([
        { currency: GHS, amount: 4250 },
        { currency: USD, amount: 1200 },
      ]),
    ).toBe('GH₵4,250 · $1,200');
    expect(formatMoneyList([])).toBe('');
  });
});

describe('sumByCurrency', () => {
  it('keeps one total per currency, cedis first, and drops empty ones', () => {
    expect(
      sumByCurrency([
        { currency: USD, amount: 25 },
        { currency: GHS, amount: 100 },
        { currency: USD, amount: 75 },
        { currency: GHS, amount: 0 },
      ]),
    ).toEqual([
      { currency: GHS, amount: 100 },
      { currency: USD, amount: 100 },
    ]);
  });

  it('adds in pesewas so small amounts stay exact', () => {
    expect(
      sumByCurrency([
        { currency: GHS, amount: 0.1 },
        { currency: GHS, amount: 0.1 },
        { currency: GHS, amount: 0.1 },
      ]),
    ).toEqual([{ currency: GHS, amount: 0.3 }]);
  });
});

describe('minor units', () => {
  it('converts to pesewas or cents and spots a third decimal place', () => {
    expect(toMinorUnits(100)).toBe(10_000);
    expect(toMinorUnits(0.1)).toBe(10);
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(hasMinorUnits(19.99)).toBe(true);
    expect(hasMinorUnits(0.1)).toBe(true);
    expect(hasMinorUnits(10.505)).toBe(false);
  });
});

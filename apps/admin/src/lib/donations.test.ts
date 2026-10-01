import type { DashboardSummary, PaymentSettingsStatus } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import {
  figureWidthEm,
  fittedFontSize,
  readDonationRow,
  readDonationsSummary,
  zeroCurrencies,
} from './donations';

const provider = (accepting: boolean, currency: 'GHS' | 'USD') => ({
  configured: accepting,
  webhookConfigured: accepting,
  enabled: accepting,
  accepting,
  currency,
});

const payments = (stripe: boolean, paystack: boolean): PaymentSettingsStatus => ({
  stripe: provider(stripe, 'USD'),
  paystack: provider(paystack, 'GHS'),
});

describe('readDonationsSummary', () => {
  it('passes a summary in today’s shape through', () => {
    const today: DashboardSummary['donations'] = {
      raised: [{ currency: 'GHS', amount: 100 }],
      succeededCount: 1,
      pendingCount: 0,
      failedCount: 0,
      byProvider: {
        stripe: { count: 0, raised: [] },
        paystack: { count: 1, raised: [{ currency: 'GHS', amount: 100 }] },
      },
      monthly: [{ month: '2026-10', count: 1, raised: [{ currency: 'GHS', amount: 100 }] }],
    };
    expect(readDonationsSummary(today)).toEqual(today);
  });

  it('reads the dollars of a summary from before currencies', () => {
    const before = {
      totalRaisedUsd: 4135,
      succeededCount: 8,
      pendingCount: 2,
      failedCount: 1,
      byProvider: { stripe: 3575, paystack: 560 },
      monthly: [
        { month: '2026-09', amountUsd: 0, count: 0 },
        { month: '2026-10', amountUsd: 4135, count: 8 },
      ],
    } as unknown as DashboardSummary['donations'];
    expect(readDonationsSummary(before)).toEqual({
      ...before,
      raised: [{ currency: 'USD', amount: 4135 }],
      byProvider: {
        stripe: { count: 0, raised: [{ currency: 'USD', amount: 3575 }] },
        paystack: { count: 0, raised: [{ currency: 'USD', amount: 560 }] },
      },
      monthly: [
        { month: '2026-09', count: 0, raised: [] },
        { month: '2026-10', count: 8, raised: [{ currency: 'USD', amount: 4135 }] },
      ],
    });
  });

  it('reads missing parts as nothing rather than failing', () => {
    const bare = { succeededCount: 0 } as unknown as DashboardSummary['donations'];
    expect(readDonationsSummary(bare)).toMatchObject({
      raised: [],
      pendingCount: 0,
      byProvider: { stripe: { count: 0, raised: [] }, paystack: { count: 0, raised: [] } },
      monthly: [],
    });
  });
});

describe('readDonationRow', () => {
  it('reads a gift listed before currencies as dollars and leaves others alone', () => {
    expect(readDonationRow({ id: 'a', amountUsd: 250 })).toMatchObject({
      amount: 250,
      currency: 'USD',
    });
    expect(readDonationRow({ id: 'b', amount: 100, currency: 'GHS' })).toMatchObject({
      amount: 100,
      currency: 'GHS',
    });
  });
});

describe('zeroCurrencies', () => {
  it('writes nothing raised in what the providers taking gifts charge, cedis first', () => {
    expect(zeroCurrencies(payments(false, true))).toEqual(['GHS']);
    expect(zeroCurrencies(payments(true, false))).toEqual(['USD']);
    expect(zeroCurrencies(payments(true, true))).toEqual(['GHS', 'USD']);
  });

  it('falls back to Paystack’s currency when no provider takes gifts', () => {
    expect(zeroCurrencies(payments(false, false))).toEqual(['GHS']);
    expect(zeroCurrencies(undefined)).toEqual(['GHS']);
  });
});

describe('fitting a stat figure to its tile', () => {
  it('estimates a figure at or just above its measured width', () => {
    // Measured in Chromium: GH₵1,500 is 4.68em, GH₵250,250.60 7.24em, $4,135 3.14em.
    expect(figureWidthEm('GH₵1,500')).toBeGreaterThanOrEqual(4.68);
    expect(figureWidthEm('GH₵1,500')).toBeLessThan(4.68 * 1.12);
    expect(figureWidthEm('GH₵250,250.60')).toBeGreaterThanOrEqual(7.24);
    expect(figureWidthEm('$4,135')).toBeGreaterThanOrEqual(3.14);
  });

  it('keeps the full size for counts and shrinks with the widest figure', () => {
    expect(fittedFontSize(['12'], '3rem')).toBe('min(3rem, 83.33cqi)');
    expect(fittedFontSize(['GH₵25,000', '$1,200'], '1.5rem')).toBe(
      `min(1.5rem, ${(100 / figureWidthEm('GH₵25,000')).toFixed(2)}cqi)`,
    );
  });
});

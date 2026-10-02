import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaystackUnavailableError } from '../../providers/payment/paystack.gateway.js';

import {
  CHECK_AFTER_MS,
  CHECK_BATCH,
  GIVE_UP_AFTER_MS,
  checkPendingPaystackDonations,
  paystackCheckFailed,
  type PaystackCheckDeps,
} from './paystack-check.js';

type Outcome = 'succeeded' | 'failed' | 'pending';
type Gift = Awaited<ReturnType<PaystackCheckDeps['donations']['dueForPaystackCheck']>>[number];

const NOW = new Date('2026-10-01T12:00:00Z');

const gifts = (count: number): Gift[] =>
  Array.from({ length: count }, (_, index) => ({ reference: `iaa-gift-${index + 1}` }) as Gift);

/** A check over these gifts, where `answer` decides each one's outcome or throws. */
const checkWith = (due: Gift[], answer: (gift: Gift) => Promise<Outcome>, configured = true) => {
  const deps = {
    paystack: { isConfigured: vi.fn(() => configured) },
    donations: { dueForPaystackCheck: vi.fn(async () => due) },
    payments: { recheckPaystack: vi.fn(answer) },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
  return {
    deps,
    run: () => checkPendingPaystackDonations(deps as unknown as PaystackCheckDeps, NOW),
  };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('the hourly check of pending Paystack gifts', () => {
  it('asks for the gifts nothing has looked at for ten minutes, 25 at most', async () => {
    const { deps, run } = checkWith([], async () => 'pending');
    await run();
    expect(CHECK_AFTER_MS).toBe(10 * 60_000);
    expect(CHECK_BATCH).toBe(25);
    expect(deps.donations.dueForPaystackCheck).toHaveBeenCalledWith(
      new Date(NOW.getTime() - CHECK_AFTER_MS),
      // Failed gifts started since then too: a later success still lifts them.
      new Date(NOW.getTime() - GIVE_UP_AFTER_MS),
      CHECK_BATCH,
    );
  });

  it('gives up on a gift a day after it was started', async () => {
    const { deps, run } = checkWith(gifts(1), async () => 'pending');
    await run();
    expect(GIVE_UP_AFTER_MS).toBe(24 * 3_600_000);
    expect(deps.payments.recheckPaystack).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'iaa-gift-1' }),
      new Date(NOW.getTime() - GIVE_UP_AFTER_MS),
    );
  });

  it('counts what became of each gift', async () => {
    const outcomes: Outcome[] = ['succeeded', 'pending', 'failed', 'succeeded', 'pending'];
    const { run } = checkWith(
      gifts(5),
      async (gift) => outcomes[Number(gift.reference.slice(9)) - 1]!,
    );
    await expect(run()).resolves.toEqual({
      checked: 5,
      succeeded: 2,
      failed: 1,
      pending: 2,
      errors: 0,
    });
  });

  it('carries on past a gift Paystack could not answer for', async () => {
    const { deps, run } = checkWith(gifts(4), async (gift) => {
      if (gift.reference === 'iaa-gift-2') {
        throw new PaystackUnavailableError({ status: 500, reason: 'An error occurred' });
      }
      return 'succeeded';
    });
    await expect(run()).resolves.toEqual({
      checked: 4,
      succeeded: 3,
      failed: 0,
      pending: 0,
      errors: 1,
    });
    expect(deps.payments.recheckPaystack).toHaveBeenCalledTimes(4);
    expect(deps.logger.warn).toHaveBeenCalledWith(
      { err: expect.any(PaystackUnavailableError), reference: 'iaa-gift-2' },
      'A Paystack donation could not be checked',
    );
  });

  it('stops after about a minute and leaves the rest for the next run', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    // Each call to Paystack takes 25 seconds: three fit in the minute.
    const { deps, run } = checkWith(gifts(CHECK_BATCH), async () => {
      vi.setSystemTime(Date.now() + 25_000);
      return 'pending';
    });
    await expect(run()).resolves.toMatchObject({ checked: 3, pending: 3 });
    expect(deps.payments.recheckPaystack).toHaveBeenCalledTimes(3);
    expect(deps.logger.info).toHaveBeenCalledWith(
      { left: CHECK_BATCH - 3 },
      'Paystack donations left for the next run',
    );
  });

  it('asks nothing when Paystack has no key to be asked with', async () => {
    const { deps, run } = checkWith(gifts(3), async () => 'succeeded', false);
    await expect(run()).resolves.toEqual({
      checked: 0,
      succeeded: 0,
      failed: 0,
      pending: 0,
      errors: 0,
    });
    expect(deps.donations.dueForPaystackCheck).not.toHaveBeenCalled();
  });
});

describe('whether the check failed as a whole', () => {
  const runOf = (checked: number, errors: number) => ({
    checked,
    succeeded: 0,
    failed: 0,
    pending: checked - errors,
    errors,
  });

  it('fails when it could ask Paystack about none of the gifts it tried', () => {
    // A key Paystack refuses, say: every gift errs.
    expect(paystackCheckFailed(runOf(25, 25))).toBe(true);
    expect(paystackCheckFailed(runOf(1, 1))).toBe(true);
  });

  it('has not failed when some gifts were checked, or when none were due', () => {
    // One gift Paystack could not answer for is asked about again next run.
    expect(paystackCheckFailed(runOf(3, 1))).toBe(false);
    expect(paystackCheckFailed(runOf(0, 0))).toBe(false);
  });
});

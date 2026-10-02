import { createHmac } from 'node:crypto';

import { DonationStatus, PaymentProvider } from '@iaa/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotFoundError,
  ServiceUnavailableError,
  WebhookSignatureError,
} from '../../common/errors.js';
import type { AppLogger } from '../../config/logger.js';
import {
  PaystackUnavailableError,
  type PaystackGateway,
  type PaystackVerification,
} from '../../providers/payment/paystack.gateway.js';
import type { StripeGateway } from '../../providers/payment/stripe.gateway.js';

import type { DonationRepository } from './donation.repository.js';
import { PaymentService } from './payment.service.js';

const REFERENCE = 'iaa-0b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e';
const DONOR = 'ama.donor@example.org';
const DAY_MS = 24 * 3_600_000;

interface FakeGift {
  id: string;
  provider: PaymentProvider;
  reference: string;
  amount: number;
  currency: 'GHS' | 'USD';
  status: DonationStatus;
  donorEmail: string;
  createdAt: Date;
}

let gift: FakeGift | null;
let paystackAnswer: PaystackVerification | Error;
let configured: boolean;

const repository = {
  findByReference: vi.fn(async (reference: string) =>
    gift?.reference === reference ? { ...gift } : null,
  ),
  recordCheck: vi.fn(async () => ({ acknowledged: true })),
  setStatus: vi.fn(async (_reference: string, status: DonationStatus) => {
    if (gift?.status !== DonationStatus.Pending) {
      return null;
    }
    gift.status = status;
    return { ...gift };
  }),
  markSucceeded: vi.fn(async () => {
    if (!gift || gift.status === DonationStatus.Succeeded) {
      return null;
    }
    gift.status = DonationStatus.Succeeded;
    return { ...gift };
  }),
};

const paystack = {
  currency: 'GHS',
  isConfigured: vi.fn(() => configured),
  verify: vi.fn(async () => {
    if (paystackAnswer instanceof Error) {
      throw paystackAnswer;
    }
    return paystackAnswer;
  }),
  verifyWebhookSignature: vi.fn((rawBody: Buffer, signature: string | undefined) => {
    const expected = createHmac('sha512', 'sk_test_unit').update(rawBody).digest('hex');
    if (signature !== expected) {
      throw new WebhookSignatureError('Invalid Paystack signature');
    }
  }),
};

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const service = new PaymentService(
  repository as unknown as DonationRepository,
  { currency: 'USD', isConfigured: () => false } as unknown as StripeGateway,
  paystack as unknown as PaystackGateway,
  logger as unknown as AppLogger,
);

/** A pending GH₵100 Paystack gift, opened `ageMs` ago. */
const pendingGift = (ageMs = 15 * 60_000): FakeGift => ({
  id: '6650f0c2a1b2c3d4e5f60718',
  provider: PaymentProvider.Paystack,
  reference: REFERENCE,
  amount: 100,
  currency: 'GHS',
  status: DonationStatus.Pending,
  donorEmail: DONOR,
  createdAt: new Date(Date.now() - ageMs),
});

/** Paystack's record of the gift: paid in full, started by this site, unless told otherwise. */
const record = (overrides: Partial<PaystackVerification> = {}): PaystackVerification => ({
  status: 'success',
  reference: REFERENCE,
  amountMinor: 10_000,
  requestedMinor: 10_000,
  currency: 'GHS',
  source: 'impact-africa-alliance',
  ...overrides,
});

/** The gift as the hourly check is handed it. */
const asDocument = (value: FakeGift) =>
  value as unknown as Parameters<PaymentService['recheckPaystack']>[0];

/** Everything the service logged, as one string. */
const logged = (): string =>
  JSON.stringify([logger.info.mock.calls, logger.warn.mock.calls, logger.error.mock.calls]);

const signed = (payload: unknown): [Buffer, string] => {
  const body = Buffer.from(JSON.stringify(payload));
  return [body, createHmac('sha512', 'sk_test_unit').update(body).digest('hex')];
};

beforeEach(() => {
  vi.clearAllMocks();
  gift = pendingGift();
  paystackAnswer = record();
  configured = true;
});

describe('the donor’s return from Paystack', () => {
  it('answers 404 without asking Paystack for anything that is not one of this site’s gifts', async () => {
    const answers: unknown[] = [];
    // Malformed: not even looked up.
    for (const reference of ['ref 1', 'a'.repeat(101), 'pi_3NabcDEF', '../balance', '.', '..']) {
      answers.push(await service.confirmPaystackReturn(reference).catch((error: unknown) => error));
    }
    expect(repository.findByReference).not.toHaveBeenCalled();

    // Another app's payment, or nothing at all: looked up, not found.
    answers.push(
      await service.confirmPaystackReturn('other-app-ref-1').catch((error: unknown) => error),
    );
    // One of this site's card gifts is not a Paystack payment either.
    gift = { ...pendingGift(), provider: PaymentProvider.Stripe };
    answers.push(await service.confirmPaystackReturn(REFERENCE).catch((error: unknown) => error));

    expect(paystack.verify).not.toHaveBeenCalled();
    expect(repository.recordCheck).not.toHaveBeenCalled();
    for (const answer of answers) {
      expect(answer).toBeInstanceOf(NotFoundError);
      // The same words whatever the reason, so nothing is learnt about another app's payment.
      expect((answer as Error).message).toBe('Payment reference not found');
    }
  });

  it.each(['abandoned', 'ongoing', 'pending', 'processing', 'queued', 'reversed'])(
    'leaves the gift pending for the hourly check when Paystack says %s',
    async (status) => {
      paystackAnswer = record({ status });
      await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toEqual({
        status: 'pending',
        amount: 100,
        currency: 'GHS',
      });
      expect(repository.setStatus).not.toHaveBeenCalled();
      expect(repository.markSucceeded).not.toHaveBeenCalled();
    },
  );

  it('marks the gift failed only when Paystack says the payment failed', async () => {
    paystackAnswer = record({ status: 'failed' });
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toMatchObject({
      status: 'failed',
    });
    expect(repository.setStatus).toHaveBeenCalledWith(REFERENCE, DonationStatus.Failed);
  });

  it('confirms a paid gift, and one whose donor also paid Paystack’s fee', async () => {
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toEqual({
      status: 'succeeded',
      amount: 100,
      currency: 'GHS',
    });

    gift = pendingGift();
    paystackAnswer = record({ amountMinor: 10_195, requestedMinor: 10_000 });
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toMatchObject({
      status: 'succeeded',
    });
  });

  it('lifts a failed gift that Paystack now reports paid', async () => {
    gift = { ...pendingGift(), status: DonationStatus.Failed };
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toMatchObject({
      status: 'succeeded',
    });
  });

  it('asks Paystack nothing about a gift already confirmed', async () => {
    gift = { ...pendingGift(), status: DonationStatus.Succeeded };
    configured = false;
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toMatchObject({
      status: 'succeeded',
    });
    expect(paystack.verify).not.toHaveBeenCalled();
  });

  it('notes when Paystack was asked, before asking', async () => {
    paystackAnswer = new PaystackUnavailableError({ status: 502, reason: 'Bad gateway' });
    await expect(service.confirmPaystackReturn(REFERENCE)).rejects.toBeInstanceOf(
      PaystackUnavailableError,
    );
    expect(repository.recordCheck).toHaveBeenCalledWith(gift?.id, expect.any(Date));
  });

  it('answers 503 for a pending gift when Paystack is not configured', async () => {
    configured = false;
    await expect(service.confirmPaystackReturn(REFERENCE)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    expect(paystack.verify).not.toHaveBeenCalled();
  });
});

describe('what Paystack reports must be this gift’s payment', () => {
  it.each([
    ['another reference', { reference: 'iaa-someone-else' }],
    ['another reference', { reference: undefined }],
    ['another source', { source: 'another-app' }],
    ['another currency', { currency: 'USD' }],
    ['another amount', { requestedMinor: 2_000 }],
    ['another amount', { requestedMinor: undefined, amountMinor: 10_195 }],
    ['charged less than the gift', { amountMinor: 9_000 }],
  ] as [string, Partial<PaystackVerification>][])(
    'refuses a success with %s, and says so in the log',
    async (reason, overrides) => {
      paystackAnswer = record(overrides);
      await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toMatchObject({
        status: 'pending',
      });
      expect(repository.markSucceeded).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ reference: REFERENCE, reason }),
        'Paystack payment does not match its donation; not acting on it',
      );
      expect(logged()).not.toContain(DONOR);
    },
  );

  it('does not fail a gift on a failure that is not this gift’s payment', async () => {
    paystackAnswer = record({ status: 'failed', source: 'another-app' });
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toMatchObject({
      status: 'pending',
    });
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it('counts a payment whose metadata names no source, as older payments have none', async () => {
    paystackAnswer = record({ source: undefined });
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toMatchObject({
      status: 'succeeded',
    });
  });

  it('reads an older dollar gift in dollars', async () => {
    gift = { ...pendingGift(), currency: 'USD', amount: 50 };
    paystackAnswer = record({ currency: 'USD', amountMinor: 5_000, requestedMinor: undefined });
    await expect(service.confirmPaystackReturn(REFERENCE)).resolves.toEqual({
      status: 'succeeded',
      amount: 50,
      currency: 'USD',
    });
  });
});

describe('a Paystack webhook on the shared account', () => {
  it('refuses an event without the account’s signature', async () => {
    const [body] = signed({ event: 'charge.success', data: { reference: REFERENCE } });
    await expect(service.handlePaystackWebhook(body, undefined)).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
    await expect(service.handlePaystackWebhook(body, 'f'.repeat(128))).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
    expect(repository.findByReference).not.toHaveBeenCalled();
  });

  it('leaves alone, without asking Paystack, an event this site does not act on', async () => {
    for (const event of ['transfer.success', 'subscription.create', 'refund.processed', '']) {
      await service.handlePaystackWebhook(...signed({ event, data: { reference: REFERENCE } }));
    }
    await service.handlePaystackWebhook(...signed({ event: 'charge.success' }));
    await service.handlePaystackWebhook(...signed(null));
    await service.handlePaystackWebhook(...signed('charge.success'));
    const notJson = Buffer.from('charge.success for iaa-1');
    await service.handlePaystackWebhook(
      notJson,
      createHmac('sha512', 'sk_test_unit').update(notJson).digest('hex'),
    );
    expect(repository.findByReference).not.toHaveBeenCalled();
    expect(paystack.verify).not.toHaveBeenCalled();
    expect(logged()).toBe('[[],[],[]]');
  });

  it('leaves alone an event whose kind or reference is not plain text, without failing', async () => {
    // Signed, so only Paystack (or the key) could send these; still a 200, never a 500.
    await expect(
      service.handlePaystackWebhook(
        ...signed({ event: { toString: 1, valueOf: 1 }, data: { reference: 'shop-order-7781' } }),
      ),
    ).resolves.toBeUndefined();
    await service.handlePaystackWebhook(
      ...signed({ event: ['charge.success'], data: { reference: REFERENCE } }),
    );
    await service.handlePaystackWebhook(
      ...signed({ event: 'charge.success', data: { reference: [REFERENCE] } }),
    );
    await service.handlePaystackWebhook(
      ...signed({ event: 'charge.success', data: { reference: { toString: 1 } } }),
    );
    expect(repository.findByReference).not.toHaveBeenCalled();
    expect(paystack.verify).not.toHaveBeenCalled();
    expect(logged()).toBe('[[],[],[]]');
  });

  it('leaves another app’s payment alone, without asking Paystack or logging it', async () => {
    const payload = {
      event: 'charge.success',
      data: { reference: 'shop-order-1182', customer: { email: 'buyer@shop.example' } },
    };
    await service.handlePaystackWebhook(...signed(payload));
    await service.handlePaystackWebhook(
      ...signed({ event: 'charge.success', data: { reference: 'shop_order 1183' } }),
    );
    expect(paystack.verify).not.toHaveBeenCalled();
    expect(repository.recordCheck).not.toHaveBeenCalled();
    expect(logged()).toBe('[[],[],[]]');
  });

  it('checks one of this site’s gifts with Paystack, as a return does', async () => {
    paystackAnswer = record({ amountMinor: 10_195, requestedMinor: 10_000 });
    await service.handlePaystackWebhook(
      // The payload's figures are never used: Paystack's own record decides.
      ...signed({ event: 'charge.success', data: { reference: REFERENCE, amount: 1 } }),
    );
    expect(paystack.verify).toHaveBeenCalledWith(REFERENCE);
    expect(gift?.status).toBe(DonationStatus.Succeeded);

    // Confirmed once: a repeat asks Paystack nothing.
    await service.handlePaystackWebhook(
      ...signed({ event: 'charge.success', data: { reference: REFERENCE } }),
    );
    expect(paystack.verify).toHaveBeenCalledTimes(1);
  });

  it('acknowledges one of this site’s gifts that Paystack has no payment for', async () => {
    paystackAnswer = new NotFoundError('Payment reference');
    await expect(
      service.handlePaystackWebhook(
        ...signed({ event: 'charge.success', data: { reference: REFERENCE } }),
      ),
    ).resolves.toBeUndefined();
  });

  it('lets Paystack try again when it cannot be asked', async () => {
    paystackAnswer = new PaystackUnavailableError({ status: 503, reason: 'Unavailable' });
    await expect(
      service.handlePaystackWebhook(
        ...signed({ event: 'charge.success', data: { reference: REFERENCE } }),
      ),
    ).rejects.toBeInstanceOf(PaystackUnavailableError);
  });
});

describe('the hourly check of a gift', () => {
  const giveUpBefore = (): Date => new Date(Date.now() - DAY_MS);

  it('confirms a gift Paystack reports paid, and fails one it reports failed', async () => {
    await expect(service.recheckPaystack(asDocument(gift!), giveUpBefore())).resolves.toBe(
      'succeeded',
    );
    expect(gift?.status).toBe(DonationStatus.Succeeded);

    gift = pendingGift();
    paystackAnswer = record({ status: 'failed' });
    await expect(service.recheckPaystack(asDocument(gift), giveUpBefore())).resolves.toBe('failed');
    expect(gift?.status).toBe(DonationStatus.Failed);
  });

  it('leaves an unpaid gift pending for a day after it was started', async () => {
    paystackAnswer = record({ status: 'abandoned' });
    gift = pendingGift(DAY_MS - 60_000);
    await expect(service.recheckPaystack(asDocument(gift), giveUpBefore())).resolves.toBe(
      'pending',
    );
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it('lifts a gift failed earlier that Paystack now reports paid, and only then', async () => {
    gift = { ...pendingGift(), status: DonationStatus.Failed };
    await expect(service.recheckPaystack(asDocument(gift), giveUpBefore())).resolves.toBe(
      'succeeded',
    );
    expect(gift?.status).toBe(DonationStatus.Succeeded);

    for (const status of ['failed', 'abandoned', 'ongoing']) {
      gift = { ...pendingGift(), status: DonationStatus.Failed };
      paystackAnswer = record({ status });
      await expect(service.recheckPaystack(asDocument(gift), giveUpBefore()), status).resolves.toBe(
        'failed',
      );
      expect(gift?.status).toBe(DonationStatus.Failed);
    }
  });

  it('counts a gift by what it is now, when a donor’s return settled it during the check', async () => {
    // The check was handed the gift while pending; it is a day old, and Paystack says abandoned.
    const handed = pendingGift(DAY_MS + 60_000);
    paystackAnswer = record({ status: 'abandoned' });
    // Meanwhile the donor's return found it paid.
    gift = { ...handed, status: DonationStatus.Succeeded };
    await expect(service.recheckPaystack(asDocument(handed), giveUpBefore())).resolves.toBe(
      'succeeded',
    );
    expect(gift?.status).toBe(DonationStatus.Succeeded);
  });

  it.each([
    ['still unpaid', () => record({ status: 'ongoing' })],
    ['unknown to Paystack', () => new NotFoundError('Payment reference')],
    ['paid for another amount', () => record({ requestedMinor: 1_000, amountMinor: 1_000 })],
  ])('closes a gift %s a day after it was started', async (_case, answer) => {
    paystackAnswer = answer();
    gift = pendingGift(DAY_MS + 60_000);
    await expect(service.recheckPaystack(asDocument(gift), giveUpBefore())).resolves.toBe('failed');
    expect(repository.setStatus).toHaveBeenCalledWith(REFERENCE, DonationStatus.Failed);
    expect(gift?.status).toBe(DonationStatus.Failed);
  });

  it('leaves a gift it could not ask Paystack about as it is, however old', async () => {
    paystackAnswer = new PaystackUnavailableError({ status: 401, reason: 'Invalid key' });
    gift = pendingGift(3 * DAY_MS);
    await expect(service.recheckPaystack(asDocument(gift), giveUpBefore())).rejects.toBeInstanceOf(
      PaystackUnavailableError,
    );
    expect(repository.setStatus).not.toHaveBeenCalled();
    expect(repository.recordCheck).toHaveBeenCalledTimes(1);
  });
});

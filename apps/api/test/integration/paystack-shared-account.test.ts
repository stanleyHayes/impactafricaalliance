import { createHmac } from 'node:crypto';
import { Writable } from 'node:stream';

import { DonationCurrency, DonationStatus, PaymentProvider } from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createLogger } from '../../src/config/logger.js';
import { DonationModel } from '../../src/modules/payments/donation.model.js';
import { PaymentSettingModel } from '../../src/modules/payments/payment-setting.model.js';
import { startFakePaystack, type FakePaystack, type FakeTransaction } from '../fake-paystack.js';
import { createTestContext, type TestContext } from '../harness.js';

/**
 * The owner's Paystack account, keys and webhook included, is shared with his other apps. These
 * tests hold the site to that: it names its own way back on every payment, never asks Paystack
 * about a payment it did not start, ignores the other apps' webhooks, and confirms its own
 * payments without any webhook, on the donor's return and in the hourly run.
 */

const SECRET_KEY = 'sk_test_fake_key_for_the_shared_account_tests';
const RUN_SECRET = 'run-secret-for-the-shared-account-tests';
const SITE = 'https://impactafricaalliance.org';
const SAVED_ENV = [
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_API_URL',
  'PAYSTACK_CURRENCY',
  'PUBLIC_SITE_URL',
  'AUTOMATION_RUN_SECRET',
  'LOG_LEVEL',
];
const savedEnv = Object.fromEntries(SAVED_ENV.map((key) => [key, process.env[key]]));

let ctx: TestContext;
let fake: FakePaystack;

/** Everything the API logs in this file, as production writes it (JSON lines). */
let logs = '';
const logSink = new Writable({
  write(chunk: Buffer, _encoding, done) {
    logs += chunk.toString('utf8');
    done();
  },
});

const sign = (body: string, key = SECRET_KEY): string =>
  createHmac('sha512', key).update(body).digest('hex');

/** Posts a webhook as Paystack would: the raw JSON, signed unless told otherwise. */
const webhook = (payload: unknown, signature?: string | null) => {
  const body = JSON.stringify(payload);
  const req = request(ctx.app)
    .post('/api/payments/webhooks/paystack')
    .set('Content-Type', 'application/json');
  if (signature !== null) {
    req.set('x-paystack-signature', signature ?? sign(body));
  }
  return req.send(body);
};

const returnTo = (reference: string) =>
  request(ctx.app).get(`/api/payments/paystack/verify/${encodeURIComponent(reference)}`);

const runAutomations = () =>
  request(ctx.app).post('/api/automations/run').set('x-automation-secret', RUN_SECRET);

const stored = (reference: string) => DonationModel.findOne({ reference }).lean().exec();

/** The verify calls made to the fake since `from`, by reference. */
const verified = (from = 0): string[] =>
  fake.requests
    .slice(from)
    .filter((entry) => entry.path.startsWith('/transaction/verify/'))
    .map((entry) => decodeURIComponent(entry.path.slice('/transaction/verify/'.length)));

/** A GH₵100 Paystack gift, as if opened `minutesAgo` minutes ago; pending unless told otherwise. */
const openGift = async (
  reference: string,
  minutesAgo = 0,
  fields: Record<string, unknown> = {},
): Promise<string> => {
  const at = new Date(Date.now() - minutesAgo * 60_000);
  await DonationModel.collection.insertOne({
    provider: PaymentProvider.Paystack,
    reference,
    amount: 100,
    currency: DonationCurrency.GHS,
    frequency: 'one-time',
    status: DonationStatus.Pending,
    donorEmail: `${reference}@donors.example.org`,
    createdAt: at,
    updatedAt: at,
    ...fields,
  });
  return reference;
};

/** What Paystack reports for one of this site's GH₵100 gifts, unless told otherwise. */
const paystackSays = (reference: string, transaction: Partial<FakeTransaction> = {}): void =>
  fake.setTransaction(reference, {
    status: 'success',
    amount: 10_000,
    requested_amount: 10_000,
    currency: 'GHS',
    metadata: { source: 'impact-africa-alliance' },
    ...transaction,
  });

/** Let `minutes` pass for a gift: its start, and the last look at it, that much further back. */
const minutesPass = async (reference: string, minutes: number): Promise<void> => {
  const gift = await DonationModel.collection.findOne({ reference });
  const earlier = (at: Date): Date => new Date(at.getTime() - minutes * 60_000);
  await DonationModel.collection.updateOne(
    { reference },
    {
      $set: {
        createdAt: earlier(gift!.createdAt as Date),
        ...(gift?.lastCheckedAt ? { lastCheckedAt: earlier(gift.lastCheckedAt as Date) } : {}),
      },
    },
  );
};

beforeAll(async () => {
  fake = await startFakePaystack();
  process.env.PAYSTACK_SECRET_KEY = SECRET_KEY;
  process.env.PAYSTACK_API_URL = fake.url;
  delete process.env.PAYSTACK_CURRENCY;
  process.env.PUBLIC_SITE_URL = SITE;
  process.env.AUTOMATION_RUN_SECRET = RUN_SECRET;
  // Production's logger and level, so the tests see what Render's logs would hold.
  process.env.LOG_LEVEL = 'info';
  ctx = await createTestContext({ logger: createLogger('production', logSink) });
  await PaymentSettingModel.create({ key: 'payments', paystackEnabled: true });
}, 60_000);

afterAll(async () => {
  await ctx?.teardown();
  await fake?.close();
  for (const key of SAVED_ENV) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

describe('the addresses Paystack sends a donor to', () => {
  it('come from the API’s configuration alone, whatever the request carries', async () => {
    const res = await request(ctx.app)
      .post('/api/payments?callback_url=https%3A%2F%2Fevil.example%2Fback&redirect=evil.example')
      .set('Host', 'evil.example')
      .set('Origin', 'https://evil.example')
      .set('Referer', 'https://evil.example/donate')
      .set('X-Forwarded-Host', 'evil.example')
      .set('X-Forwarded-Proto', 'http')
      .set('Forwarded', 'host=evil.example;proto=http')
      .send({
        provider: PaymentProvider.Paystack,
        amount: 100,
        currency: DonationCurrency.GHS,
        donorEmail: 'hostile.request@example.org',
        callback_url: 'https://evil.example/back',
        callbackUrl: 'https://evil.example/back',
        cancel_action: 'https://evil.example/cancel',
        returnUrl: 'https://evil.example/back',
        reference: 'iaa-chosen-by-the-caller',
        metadata: { source: 'another-app', cancel_action: 'https://evil.example/cancel' },
      });
    expect(res.status).toBe(201);
    const reference = res.body.reference as string;
    expect(reference).toMatch(/^iaa-[0-9a-f-]{36}$/);

    const sent = fake.requests.filter((entry) => entry.path === '/transaction/initialize').at(-1);
    expect(sent?.body).toMatchObject({
      reference,
      callback_url: `${SITE}/donate/complete`,
      metadata: {
        source: 'impact-africa-alliance',
        donation_id: res.body.donationId,
        cancel_action: `${SITE}/donate/complete?reference=${reference}&cancelled=1`,
      },
    });
    expect(JSON.stringify(sent?.body)).not.toContain('evil.example');
    expect(JSON.stringify(sent?.body)).not.toContain('another-app');
  });
});

describe('a reference that is not one of this site’s Paystack gifts', () => {
  it('gets the same 404 from the return page, and Paystack is never asked', async () => {
    // Another app's payment, which Paystack knows well.
    paystackSays('shop-order-1182', { metadata: { source: 'shop' } });
    // One of this site's card gifts.
    await DonationModel.create({
      provider: PaymentProvider.Stripe,
      reference: 'iaa-card-gift-0001',
      amount: 25,
      currency: DonationCurrency.USD,
      donorEmail: 'card.gift@example.org',
    });
    const before = fake.requests.length;

    for (const reference of [
      'shop-order-1182',
      'iaa-00000000-0000-4000-8000-000000000000',
      'iaa-card-gift-0001',
      'shop_order 1183',
      'a'.repeat(101),
      '...',
      '==',
    ]) {
      const res = await returnTo(reference);
      expect(res.status, reference).toBe(404);
      expect(res.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'Payment reference not found' },
      });
    }
    expect(fake.requests).toHaveLength(before);
  });

  it('gives the same 404 for a reference the router cannot even read, under the same limit', async () => {
    const before = fake.requests.length;
    const logged = logs.length;
    const first = await request(ctx.app).get('/api/payments/paystack/verify/iaa-%E0%A4%A');
    const second = await request(ctx.app).get('/api/payments/paystack/verify/iaa-%E0%A4%A');
    for (const res of [first, second]) {
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'Payment reference not found' },
      });
    }
    // The return page's own limit (20 in 15 minutes) counted both.
    expect(second.headers['ratelimit-limit']).toBe('20');
    expect(Number(second.headers['ratelimit-remaining'])).toBe(
      Number(first.headers['ratelimit-remaining']) - 1,
    );
    expect(fake.requests).toHaveLength(before);
    expect(logs.slice(logged)).not.toContain('Unhandled error');
  });

  it('answers any other address it cannot read with a 400, not a server error', async () => {
    const logged = logs.length;
    const res = await request(ctx.app).get('/api/forms/%E0%A4%A');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid URL encoding' },
    });
    expect(logs.slice(logged)).not.toContain('"level":50');
  });
});

describe('webhooks from the other apps on the account', () => {
  it('acknowledges a signed event for another app’s payment, and does nothing else', async () => {
    const donations = await DonationModel.countDocuments().exec();
    const before = fake.requests.length;
    const logged = logs.length;

    const res = await webhook({
      event: 'charge.success',
      data: {
        reference: 'shop-order-1182',
        amount: 5_000,
        currency: 'GHS',
        status: 'success',
        customer: { email: 'buyer@shop.example' },
        metadata: { source: 'shop', order: 'SHOP-1182' },
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(fake.requests).toHaveLength(before);
    expect(await DonationModel.countDocuments().exec()).toBe(donations);
    expect(await stored('shop-order-1182')).toBeNull();
    // The request is logged as any other is; nothing of the event is.
    const written = logs.slice(logged);
    expect(written).toContain('/api/payments/webhooks/paystack');
    for (const detail of ['shop-order-1182', 'buyer@shop.example', 'SHOP-1182']) {
      expect(written).not.toContain(detail);
    }
  });

  it('acknowledges an event of a kind this site does not act on, even about its own gift', async () => {
    const reference = await openGift('iaa-unhandled-events-0001');
    paystackSays(reference);
    const before = fake.requests.length;
    for (const event of ['transfer.success', 'subscription.create', 'refund.processed']) {
      const res = await webhook({ event, data: { reference } });
      expect(res.status, event).toBe(200);
    }
    expect(fake.requests).toHaveLength(before);
    expect((await stored(reference))?.status).toBe(DonationStatus.Pending);
  });

  it('acknowledges a signed event of any shape, and asks Paystack nothing', async () => {
    const ours = await openGift('iaa-odd-event-0001');
    paystackSays(ours);
    const before = fake.requests.length;
    for (const payload of [
      { event: { toString: 1, valueOf: 1 }, data: { reference: 'shop-order-7781' } },
      { event: ['charge.success'], data: { reference: ours } },
      { event: 'charge.success', data: { reference: [ours] } },
      { event: 'charge.success', data: 'iaa-odd-event-0001' },
      [{ event: 'charge.success', data: { reference: ours } }],
    ]) {
      expect((await webhook(payload)).status, JSON.stringify(payload)).toBe(200);
    }
    expect(fake.requests).toHaveLength(before);
    expect((await stored(ours))?.status).toBe(DonationStatus.Pending);
  });

  it('refuses only an event that is not signed with the account’s key', async () => {
    const payload = { event: 'transfer.success', data: { reference: 'shop-payout-7' } };
    expect((await webhook(payload, null)).status).toBe(401);
    expect((await webhook(payload, sign(JSON.stringify(payload), 'sk_test_another'))).status).toBe(
      401,
    );
    expect((await webhook(payload)).status).toBe(200);
  });

  it('welcomes a webhook for one of this site’s gifts, through the same checks', async () => {
    const paid = await openGift('iaa-webhook-paid-0001');
    paystackSays(paid, { amount: 10_195 });
    expect((await webhook({ event: 'charge.success', data: { reference: paid } })).status).toBe(
      200,
    );
    expect((await stored(paid))?.status).toBe(DonationStatus.Succeeded);

    const misattributed = await openGift('iaa-webhook-other-0001');
    paystackSays(misattributed, { reference: 'iaa-webhook-other-0002' });
    expect(
      (await webhook({ event: 'charge.success', data: { reference: misattributed } })).status,
    ).toBe(200);
    expect((await stored(misattributed))?.status).toBe(DonationStatus.Pending);
  });
});

describe('Paystack’s record must be this site’s payment', () => {
  it('refuses a payment whose metadata names another source, and logs why', async () => {
    const reference = await openGift('iaa-another-source-0001');
    paystackSays(reference, { metadata: { source: 'shop' } });
    const logged = logs.length;

    const res = await returnTo(reference);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'pending', amount: 100, currency: 'GHS' });
    expect((await stored(reference))?.status).toBe(DonationStatus.Pending);

    const written = logs.slice(logged);
    expect(written).toContain('Paystack payment does not match its donation');
    expect(written).toContain('another source');
    expect(written).not.toContain(`${reference}@donors.example.org`);
  });

  it('reads metadata Paystack sends back as a JSON string', async () => {
    const ours = await openGift('iaa-string-metadata-0001');
    paystackSays(ours, { metadata: JSON.stringify({ source: 'impact-africa-alliance' }) });
    await webhook({ event: 'charge.success', data: { reference: ours } });
    expect((await stored(ours))?.status).toBe(DonationStatus.Succeeded);

    const theirs = await openGift('iaa-string-metadata-0002');
    paystackSays(theirs, { metadata: JSON.stringify({ source: 'shop' }) });
    await webhook({ event: 'charge.success', data: { reference: theirs } });
    expect((await stored(theirs))?.status).toBe(DonationStatus.Pending);
  });

  it('confirms on return a gift whose donor paid Paystack’s fee on top', async () => {
    const reference = await openGift('iaa-fee-on-top-0001');
    // GH₵100 asked for; GH₵101.95 paid with the fee passed on to the donor.
    paystackSays(reference, { amount: 10_195, requested_amount: 10_000 });
    const res = await returnTo(reference);
    expect(res.body).toEqual({ status: 'succeeded', amount: 100, currency: 'GHS' });
  });
});

describe('the hourly check, in the scheduled run', () => {
  beforeEach(async () => {
    await DonationModel.deleteMany({}).exec();
  });

  it('settles each pending Paystack gift by what Paystack says', async () => {
    paystackSays(await openGift('iaa-hourly-paid', 15));
    paystackSays(await openGift('iaa-hourly-failed', 15), { status: 'failed' });
    paystackSays(await openGift('iaa-hourly-unpaid-young', 120), { status: 'abandoned' });
    paystackSays(await openGift('iaa-hourly-unpaid-old', 25 * 60), { status: 'ongoing' });
    // Never opened on Paystack (a key changed from test to live, say): nothing was paid.
    await openGift('iaa-hourly-unknown-old', 25 * 60);
    // Still at the checkout, most likely: left alone.
    paystackSays(await openGift('iaa-hourly-too-fresh', 5), { status: 'abandoned' });
    await openGift('iaa-hourly-card', 120, { provider: PaymentProvider.Stripe });
    await openGift('iaa-hourly-done', 120, { status: DonationStatus.Succeeded });
    const before = fake.requests.length;

    const res = await runAutomations();

    expect(res.status).toBe(200);
    expect(res.body.paystackDonations).toEqual({
      checked: 5,
      succeeded: 1,
      failed: 3,
      pending: 1,
      errors: 0,
    });
    expect(new Set(verified(before))).toEqual(
      new Set([
        'iaa-hourly-paid',
        'iaa-hourly-failed',
        'iaa-hourly-unpaid-young',
        'iaa-hourly-unpaid-old',
        'iaa-hourly-unknown-old',
      ]),
    );
    const statuses = Object.fromEntries(
      (await DonationModel.find().lean().exec()).map((gift) => [gift.reference, gift.status]),
    );
    expect(statuses).toEqual({
      'iaa-hourly-paid': 'succeeded',
      'iaa-hourly-failed': 'failed',
      'iaa-hourly-unpaid-young': 'pending',
      'iaa-hourly-unpaid-old': 'failed',
      'iaa-hourly-unknown-old': 'failed',
      'iaa-hourly-too-fresh': 'pending',
      'iaa-hourly-card': 'pending',
      'iaa-hourly-done': 'succeeded',
    });
  });

  it('notes when each gift was checked, without counting that as a change to it', async () => {
    const reference = await openGift('iaa-hourly-stamped', 60);
    paystackSays(reference, { status: 'abandoned' });
    const opened = await stored(reference);

    await runAutomations();

    const after = await stored(reference);
    expect(after?.lastCheckedAt).toBeInstanceOf(Date);
    expect(after!.lastCheckedAt!.getTime()).toBeGreaterThan(Date.now() - 60_000);
    // The retention purge measures from `updatedAt`; a check does not restart its clock.
    expect(after?.updatedAt).toEqual(opened?.updatedAt);
  });

  it('checks 25 gifts a run, the longest unlooked-at first, and none again within ten minutes', async () => {
    const references = Array.from(
      { length: 30 },
      (_, index) => `iaa-hourly-batch-${String(index + 1).padStart(2, '0')}`,
    );
    for (const [index, reference] of references.entries()) {
      // The first is the oldest.
      paystackSays(await openGift(reference, 180 - index), { status: 'abandoned' });
    }

    const first = fake.requests.length;
    const one = await runAutomations();
    expect(one.body.paystackDonations).toMatchObject({ checked: 25, pending: 25 });
    expect(verified(first)).toEqual(references.slice(0, 25));

    // Run again straight away: only the five left over are due.
    const second = fake.requests.length;
    const two = await runAutomations();
    expect(two.body.paystackDonations).toMatchObject({ checked: 5, pending: 5 });
    expect(verified(second)).toEqual(references.slice(25));

    // However often it is run, a gift just asked about is not asked about again.
    const third = fake.requests.length;
    const three = await runAutomations();
    expect(three.body.paystackDonations).toMatchObject({ checked: 0 });
    expect(verified(third)).toEqual([]);
  });

  it('reaches a gift looked at before, however many new ones are waiting', async () => {
    // Started three hours ago, last asked about two hours ago, and paid since.
    const paid = await openGift('iaa-hourly-stale-paid', 180, {
      lastCheckedAt: new Date(Date.now() - 120 * 60_000),
    });
    paystackSays(paid);
    // More new gifts than a run checks, never asked about, 15 to 40 minutes old.
    for (let index = 0; index < 26; index += 1) {
      paystackSays(await openGift(`iaa-hourly-new-${index}`, 15 + index), {
        status: 'abandoned',
      });
    }

    const before = fake.requests.length;
    const res = await runAutomations();

    expect(res.body.paystackDonations).toMatchObject({ checked: 25, succeeded: 1, pending: 24 });
    expect(verified(before)[0]).toBe(paid);
    expect((await stored(paid))?.status).toBe(DonationStatus.Succeeded);
  });

  it('confirms a gift it failed once Paystack reports a later try paid', async () => {
    const reference = await openGift('iaa-hourly-declined-then-paid', 30);
    paystackSays(reference, { status: 'failed' });
    expect((await runAutomations()).body.paystackDonations).toMatchObject({
      checked: 1,
      failed: 1,
    });
    expect((await stored(reference))?.status).toBe(DonationStatus.Failed);

    // The donor tried another card on the same checkout, paid, and closed the tab.
    paystackSays(reference);
    await minutesPass(reference, 11);
    expect((await runAutomations()).body.paystackDonations).toEqual({
      checked: 1,
      succeeded: 1,
      failed: 0,
      pending: 0,
      errors: 0,
    });
    expect((await stored(reference))?.status).toBe(DonationStatus.Succeeded);
  });

  it('asks about a failed gift for a day, and only a success changes it', async () => {
    paystackSays(await openGift('iaa-hourly-failed-recent', 120, { status: 'failed' }), {
      status: 'failed',
    });
    paystackSays(await openGift('iaa-hourly-failed-yesterday', 25 * 60, { status: 'failed' }));
    const before = fake.requests.length;

    const res = await runAutomations();

    expect(res.body.paystackDonations).toEqual({
      checked: 1,
      succeeded: 0,
      failed: 1,
      pending: 0,
      errors: 0,
    });
    expect(verified(before)).toEqual(['iaa-hourly-failed-recent']);
    expect((await stored('iaa-hourly-failed-yesterday'))?.status).toBe(DonationStatus.Failed);
  });

  it('leaves a gift pending, however old, when Paystack refuses the question itself', async () => {
    // Paystack's 400 means "never heard of it" only when it says so.
    paystackSays(await openGift('iaa-hourly-bad-request', 25 * 60));
    paystackSays(await openGift('iaa-hourly-answered', 60));
    fake.failNext(400, 'Invalid request: please try again');

    const res = await runAutomations();

    expect(res.status).toBe(200);
    expect(res.body.paystackDonations).toEqual({
      checked: 2,
      succeeded: 1,
      failed: 0,
      pending: 0,
      errors: 1,
    });
    expect((await stored('iaa-hourly-bad-request'))?.status).toBe(DonationStatus.Pending);
  });

  it('shows the run as failed when Paystack refuses the key for every gift', async () => {
    for (const reference of ['iaa-hourly-key-1', 'iaa-hourly-key-2']) {
      paystackSays(await openGift(reference, 30));
    }
    // The shared key rotated for another app: every call is refused.
    fake.failNext(401, 'Invalid key', Infinity);
    try {
      const res = await runAutomations();
      expect(res.status).toBe(207);
      expect(res.body.paystackDonations).toEqual({
        checked: 2,
        succeeded: 0,
        failed: 0,
        pending: 0,
        errors: 2,
      });
    } finally {
      fake.recover();
    }
    expect((await stored('iaa-hourly-key-1'))?.status).toBe(DonationStatus.Pending);
  });

  it('checks the others when Paystack fails for one gift', async () => {
    for (const reference of ['iaa-hourly-iso-1', 'iaa-hourly-iso-2', 'iaa-hourly-iso-3']) {
      paystackSays(await openGift(reference, 60 - Number(reference.slice(-1))));
    }
    fake.failNext(500, 'An error occurred');

    const res = await runAutomations();

    expect(res.status).toBe(200);
    expect(res.body.paystackDonations).toEqual({
      checked: 3,
      succeeded: 2,
      failed: 0,
      pending: 0,
      errors: 1,
    });
    expect((await stored('iaa-hourly-iso-1'))?.status).toBe(DonationStatus.Pending);
    expect((await stored('iaa-hourly-iso-2'))?.status).toBe(DonationStatus.Succeeded);
    expect((await stored('iaa-hourly-iso-3'))?.status).toBe(DonationStatus.Succeeded);
    expect(logs).toContain('A Paystack donation could not be checked');
  });

  it('confirms a gift paid after its donor came back to an abandoned checkout', async () => {
    const opened = await request(ctx.app).post('/api/payments').send({
      provider: PaymentProvider.Paystack,
      amount: 20,
      currency: DonationCurrency.GHS,
      donorEmail: 'momo.after.return@example.org',
    });
    const reference = opened.body.reference as string;
    paystackSays(reference, { status: 'abandoned', amount: 2_000, requested_amount: 2_000 });

    // Back on the site before approving the mobile money prompt: still pending.
    expect((await returnTo(reference)).body).toEqual({
      status: 'pending',
      amount: 20,
      currency: 'GHS',
    });

    // Approved on the phone afterwards; no webhook ever comes. The run comes along later.
    paystackSays(reference, { status: 'success', amount: 2_000, requested_amount: 2_000 });
    await minutesPass(reference, 11);
    const res = await runAutomations();

    expect(res.body.paystackDonations).toMatchObject({ checked: 1, succeeded: 1 });
    expect((await stored(reference))?.status).toBe(DonationStatus.Succeeded);
  });

  it('reports the check in the run’s answer', async () => {
    const res = await runAutomations();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      reviewInvites: expect.any(Object),
      eventMessages: expect.any(Object),
      expiredDrafts: expect.any(Object),
      paystackDonations: { checked: 0, succeeded: 0, failed: 0, pending: 0, errors: 0 },
    });
  });

  it('never writes the secret key or a donor’s email into the log', () => {
    expect(logs).toContain('Scheduled automation run finished');
    expect(logs).not.toContain(SECRET_KEY);
    expect(logs).not.toContain('@donors.example.org');
    expect(logs).not.toContain('momo.after.return@example.org');
  });
});

import { createHmac } from 'node:crypto';
import { Writable } from 'node:stream';

import {
  DonationCurrency,
  DonationStatus,
  PaymentProvider,
  ROLE_TEMPLATES,
  type DashboardSummary,
  type Donation,
} from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createLogger } from '../../src/config/logger.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import { DonationModel } from '../../src/modules/payments/donation.model.js';
import { PaymentSettingModel } from '../../src/modules/payments/payment-setting.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { startFakePaystack, type FakePaystack } from '../fake-paystack.js';
import { createTestContext, type TestContext } from '../harness.js';

const SECRET_KEY = 'sk_test_fake_key_for_the_paystack_tests';
const SAVED_ENV = ['PAYSTACK_SECRET_KEY', 'PAYSTACK_API_URL', 'PAYSTACK_CURRENCY', 'LOG_LEVEL'];
const savedEnv = Object.fromEntries(SAVED_ENV.map((key) => [key, process.env[key]]));

let ctx: TestContext;
let fake: FakePaystack;
let admin: string;

/** Everything the API logs in this file, as production writes it (JSON lines). */
let logs = '';
const logSink = new Writable({
  write(chunk: Buffer, _encoding, done) {
    logs += chunk.toString('utf8');
    done();
  },
});
const logEntries = (): { msg?: string; reference?: string; err?: Record<string, unknown> }[] =>
  logs
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { msg?: string; err?: Record<string, unknown> });

const sign = (body: string, key = SECRET_KEY): string =>
  createHmac('sha512', key).update(body).digest('hex');

/** Posts a webhook as Paystack would: the raw JSON, signed unless told otherwise. */
const webhook = (payload: object, signature?: string | null) => {
  const body = JSON.stringify(payload);
  const req = request(ctx.app)
    .post('/api/payments/webhooks/paystack')
    .set('Content-Type', 'application/json');
  if (signature !== null) {
    req.set('x-paystack-signature', signature ?? sign(body));
  }
  return req.send(body);
};

const chargeSuccess = (reference: string) => ({
  event: 'charge.success',
  // Paystack's payload amount is ignored: the API re-verifies with Paystack.
  data: { reference, amount: 1, currency: 'GHS', status: 'success' },
});

const donate = (overrides: Record<string, unknown> = {}) =>
  request(ctx.app)
    .post('/api/payments')
    .send({
      provider: PaymentProvider.Paystack,
      amount: 100,
      currency: DonationCurrency.GHS,
      donorEmail: 'ama@example.org',
      ...overrides,
    });

const stored = (reference: string) => DonationModel.findOne({ reference }).lean().exec();

beforeAll(async () => {
  fake = await startFakePaystack();
  process.env.PAYSTACK_SECRET_KEY = SECRET_KEY;
  process.env.PAYSTACK_API_URL = fake.url;
  // Unset on purpose: a Ghana account charges in cedis by default.
  delete process.env.PAYSTACK_CURRENCY;
  // Production's logger and level, so the tests see what Render's logs would hold.
  process.env.LOG_LEVEL = 'info';
  ctx = await createTestContext({ logger: createLogger('production', logSink) });
  await PaymentSettingModel.create({ key: 'payments', paystackEnabled: true });

  const password = 'PaystackTests2026!';
  await UserModel.create({
    name: 'Payments admin',
    email: 'payments@iaa.org',
    role: 'admin',
    permissions: ROLE_TEMPLATES.admin,
    passwordHash: await new PasswordService().hash(password),
  });
  const login = await request(ctx.app)
    .post('/api/auth/login')
    .send({ email: 'payments@iaa.org', password });
  admin = login.body.tokens.accessToken as string;
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

describe('Paystack donations in Ghana cedis', () => {
  let reference = '';
  let smallReference = '';

  it('tells the site that Paystack takes cedis and Stripe dollars', async () => {
    const res = await request(ctx.app).get('/api/payments/providers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      stripe: false,
      paystack: true,
      currencies: { stripe: 'USD', paystack: 'GHS' },
    });
  });

  it('reports Paystack ready on the secret key alone, webhooks included', async () => {
    const res = await request(ctx.app)
      .get('/api/admin/donations/settings')
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.paystack).toEqual({
      configured: true,
      webhookConfigured: true,
      enabled: true,
      accepting: true,
      currency: 'GHS',
    });
  });

  it('initialises a GH₵100 gift as 10,000 pesewas in GHS', async () => {
    const res = await donate();
    expect(res.status).toBe(201);
    reference = res.body.reference as string;
    expect(res.body.authorizationUrl).toBe(`${fake.url}/checkout/${reference}`);

    const sent = fake.requests.find((entry) => entry.path === '/transaction/initialize');
    expect(sent?.authorization).toBe(`Bearer ${SECRET_KEY}`);
    expect(sent?.body).toEqual({
      email: 'ama@example.org',
      amount: 10_000,
      currency: 'GHS',
      reference,
      callback_url: `${ctx.config.siteUrl}/donate/complete`,
    });

    const record = await stored(reference);
    expect(record).toMatchObject({ amount: 100, currency: 'GHS', status: 'pending' });
    expect(record).not.toHaveProperty('amountUsd');
  });

  it('refuses a gift in a currency Paystack does not charge in', async () => {
    const before = fake.requests.length;
    const count = await DonationModel.countDocuments().exec();
    const res = await donate({ currency: DonationCurrency.USD });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('GHS');
    expect(fake.requests).toHaveLength(before);
    expect(await DonationModel.countDocuments().exec()).toBe(count);
  });

  it('holds cedi gifts to the GH₵0.10 Paystack accepts', async () => {
    const tooSmall = await donate({ amount: 0.05 });
    expect(tooSmall.status).toBe(400);
    expect(JSON.stringify(tooSmall.body.error)).toContain('Minimum donation is GH₵0.10');

    const smallest = await donate({ amount: 0.1, donorEmail: 'kofi@example.org' });
    expect(smallest.status).toBe(201);
    smallReference = smallest.body.reference as string;
    const sent = fake.requests.filter((entry) => entry.path === '/transaction/initialize').at(-1);
    expect(sent?.body).toMatchObject({ amount: 10, currency: 'GHS' });
  });

  it('holds dollar gifts to their own floor', async () => {
    const halfDollar = await donate({
      provider: PaymentProvider.Stripe,
      amount: 0.5,
      currency: DonationCurrency.USD,
    });
    expect(halfDollar.status).toBe(400);
    expect(JSON.stringify(halfDollar.body.error)).toContain('Minimum donation is $1');
  });

  it('accepts a charge.success signed with the secret key, and only acts on it once', async () => {
    const first = await webhook(chargeSuccess(reference));
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true });
    const confirmed = await stored(reference);
    expect(confirmed?.status).toBe(DonationStatus.Succeeded);

    // Paystack retries until it gets a 200; a repeat must change nothing.
    const again = await webhook(chargeSuccess(reference));
    expect(again.status).toBe(200);
    const after = await stored(reference);
    expect(after?.status).toBe(DonationStatus.Succeeded);
    expect(after?.updatedAt).toEqual(confirmed?.updatedAt);
  });

  it('refuses a webhook that is unsigned, signed with another key or altered', async () => {
    const payload = chargeSuccess(smallReference);
    const body = JSON.stringify(payload);

    const otherKey = await webhook(payload, sign(body, 'whsec_not_the_secret_key'));
    expect(otherKey.status).toBe(401);
    expect(otherKey.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');

    const unsigned = await webhook(payload, null);
    expect(unsigned.status).toBe(401);

    const altered = await webhook(
      { ...payload, data: { ...payload.data, amount: 999 } },
      sign(body),
    );
    expect(altered.status).toBe(401);

    expect((await stored(smallReference))?.status).toBe(DonationStatus.Pending);
  });

  it('confirms the donor’s return with Paystack and answers in the gift’s currency', async () => {
    const res = await request(ctx.app).get(
      `/api/payments/paystack/verify/${encodeURIComponent(smallReference)}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'succeeded', amount: 0.1, currency: 'GHS' });
    expect((await stored(smallReference))?.status).toBe(DonationStatus.Succeeded);
  });

  it('leaves a gift pending when Paystack reports another amount or currency', async () => {
    const res = await donate({ amount: 200, donorEmail: 'efua@example.org' });
    const pending = res.body.reference as string;

    fake.setTransaction(pending, { status: 'success', amount: 2_000, currency: 'GHS' });
    expect((await webhook(chargeSuccess(pending))).status).toBe(200);
    expect((await stored(pending))?.status).toBe(DonationStatus.Pending);

    fake.setTransaction(pending, { status: 'success', amount: 20_000, currency: 'USD' });
    expect((await webhook(chargeSuccess(pending))).status).toBe(200);
    expect((await stored(pending))?.status).toBe(DonationStatus.Pending);
  });

  it('reads a record saved before currencies as dollars, and confirms it in dollars', async () => {
    const now = new Date();
    await DonationModel.collection.insertMany([
      {
        provider: 'paystack',
        reference: 'legacy-paystack-usd',
        amountUsd: 50,
        frequency: 'one-time',
        status: 'pending',
        donorEmail: 'legacy@example.org',
        createdAt: now,
        updatedAt: now,
      },
      {
        provider: 'stripe',
        reference: 'legacy-stripe-usd',
        amountUsd: 25,
        frequency: 'monthly',
        status: 'succeeded',
        donorEmail: 'legacy.card@example.org',
        createdAt: now,
        updatedAt: now,
      },
    ]);
    fake.setTransaction('legacy-paystack-usd', {
      status: 'success',
      amount: 5_000,
      currency: 'USD',
    });
    expect((await webhook(chargeSuccess('legacy-paystack-usd'))).status).toBe(200);
    expect((await stored('legacy-paystack-usd'))?.status).toBe(DonationStatus.Succeeded);

    const list = await request(ctx.app)
      .get('/api/admin/donations?pageSize=100')
      .set('Authorization', `Bearer ${admin}`);
    expect(list.status).toBe(200);
    const byReference = new Map(
      (list.body.items as Donation[]).map((item) => [item.reference, item]),
    );
    expect(byReference.get('legacy-paystack-usd')).toMatchObject({ amount: 50, currency: 'USD' });
    expect(byReference.get('legacy-stripe-usd')).toMatchObject({ amount: 25, currency: 'USD' });
    expect(byReference.get(reference)).toMatchObject({ amount: 100, currency: 'GHS' });
    expect(byReference.get('legacy-paystack-usd')).not.toHaveProperty('amountUsd');
  });

  it('keeps cedis and dollars apart on the dashboard', async () => {
    const res = await request(ctx.app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    const donations = (res.body as DashboardSummary).donations;

    expect(donations.raised).toEqual([
      { currency: 'GHS', amount: 100.1 },
      { currency: 'USD', amount: 75 },
    ]);
    expect(donations).not.toHaveProperty('totalRaisedUsd');
    expect(donations.succeededCount).toBe(4);
    expect(donations.pendingCount).toBe(1);
    expect(donations.byProvider.paystack).toEqual({
      count: 3,
      raised: [
        { currency: 'GHS', amount: 100.1 },
        { currency: 'USD', amount: 50 },
      ],
    });
    expect(donations.byProvider.stripe).toEqual({
      count: 1,
      raised: [{ currency: 'USD', amount: 25 }],
    });
    expect(donations.monthly).toHaveLength(6);
    expect(donations.monthly.at(-1)).toMatchObject({ count: 4, raised: donations.raised });
    expect(donations.monthly[0]).toMatchObject({ count: 0, raised: [] });
  });
});

describe('when a gift is confirmed', () => {
  /** A fresh pending GH₵ gift, opened through the API as the site would. */
  const pendingGift = async (amount: number, donorEmail: string): Promise<string> => {
    const res = await donate({ amount, donorEmail });
    expect(res.status).toBe(201);
    return res.body.reference as string;
  };

  const statusChanges = (reference: string): number =>
    logEntries().filter(
      (entry) => entry.msg === 'Donation status updated' && entry.reference === reference,
    ).length;

  it('confirms a gift whose donor paid Paystack’s fee on top of it', async () => {
    const reference = await pendingGift(100, 'fees.on.top@example.org');
    // GH₵100 asked for; the donor paid GH₵101.95 with the fee passed on to them.
    fake.setTransaction(reference, {
      status: 'success',
      amount: 10_195,
      requested_amount: 10_000,
      currency: 'GHS',
    });
    expect((await webhook(chargeSuccess(reference))).status).toBe(200);
    expect(await stored(reference)).toMatchObject({ status: 'succeeded', amount: 100 });
  });

  it('still refuses a charge for another gift or one that falls short', async () => {
    const otherGift = await pendingGift(100, 'other.gift@example.org');
    fake.setTransaction(otherGift, {
      status: 'success',
      amount: 10_195,
      requested_amount: 2_000,
      currency: 'GHS',
    });
    expect((await webhook(chargeSuccess(otherGift))).status).toBe(200);
    expect((await stored(otherGift))?.status).toBe(DonationStatus.Pending);

    const short = await pendingGift(100, 'short.charge@example.org');
    fake.setTransaction(short, {
      status: 'success',
      amount: 9_000,
      requested_amount: 10_000,
      currency: 'GHS',
    });
    expect((await webhook(chargeSuccess(short))).status).toBe(200);
    expect((await stored(short))?.status).toBe(DonationStatus.Pending);
  });

  it('lifts a gift seen as abandoned on return once Paystack confirms it was paid', async () => {
    const reference = await pendingGift(20, 'momo.later@example.org');
    fake.setTransaction(reference, {
      status: 'abandoned',
      amount: 2_000,
      requested_amount: 2_000,
      currency: 'GHS',
    });
    const back = await request(ctx.app).get(`/api/payments/paystack/verify/${reference}`);
    expect(back.body).toEqual({ status: 'failed', amount: 20, currency: 'GHS' });

    // The mobile-money approval lands after the donor was sent back.
    fake.setTransaction(reference, {
      status: 'success',
      amount: 2_000,
      requested_amount: 2_000,
      currency: 'GHS',
    });
    expect((await webhook(chargeSuccess(reference))).status).toBe(200);
    expect((await stored(reference))?.status).toBe(DonationStatus.Succeeded);

    // A late failure event never takes a confirmed gift back.
    const late = await webhook({ event: 'charge.failed', data: { reference } });
    expect(late.status).toBe(200);
    expect((await stored(reference))?.status).toBe(DonationStatus.Succeeded);
  });

  it('changes a gift once however many confirmations arrive together', async () => {
    const reference = await pendingGift(75, 'six.at.once@example.org');
    const answers = await Promise.all(
      Array.from({ length: 6 }, () => webhook(chargeSuccess(reference))),
    );
    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 200, 200, 200, 200]);
    expect((await stored(reference))?.status).toBe(DonationStatus.Succeeded);
    expect(statusChanges(reference)).toBe(1);
  });
});

describe('when Paystack fails', () => {
  const failures = () =>
    logEntries().filter((entry) => entry.err?.type === 'PaystackUnavailableError');

  it('answers an unknown reference on the return page with a 404', async () => {
    const res = await request(ctx.app).get('/api/payments/paystack/verify/not-a-real-reference');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(logs).not.toContain(SECRET_KEY);
  });

  it('turns a failed initialise into a 503 and logs only what Paystack said', async () => {
    const before = await DonationModel.countDocuments().exec();
    const seen = failures().length;
    fake.failNext(500, 'An error occurred');
    const res = await donate({ donorEmail: 'kwame.outage@example.org' });

    expect(res.status).toBe(503);
    expect(res.body.error).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Paystack could not process the request',
    });
    // The half-made gift is not left behind.
    expect(await DonationModel.countDocuments().exec()).toBe(before);
    expect(failures().slice(seen)).toHaveLength(1);
    expect(failures().at(-1)?.err?.paystack).toEqual({ status: 500, reason: 'An error occurred' });
    expect(logs).not.toContain('kwame.outage@example.org');
  });

  it('turns a refused verify into a 503, so Paystack sends the webhook again', async () => {
    const reference = (await donate({ donorEmail: 'retry.later@example.org' })).body
      .reference as string;
    fake.failNext(401, 'Invalid key');
    const res = await webhook(chargeSuccess(reference));

    expect(res.status).toBe(503);
    expect(failures().at(-1)?.err?.paystack).toEqual({ status: 401, reason: 'Invalid key' });
    expect((await stored(reference))?.status).toBe(DonationStatus.Pending);
  });

  it('never writes the secret key or a request to Paystack into the log', () => {
    // The log did record this file's work: requests, status changes and the failures above.
    expect(logEntries().length).toBeGreaterThan(20);
    expect(logs).toContain('Donation status updated');
    expect(logs).not.toContain(SECRET_KEY);
    expect(logs).not.toContain('Authorization":"Bearer');
    for (const entry of logEntries()) {
      expect(entry.err ?? {}).not.toHaveProperty('config');
      expect(entry.err ?? {}).not.toHaveProperty('request');
    }
  });
});

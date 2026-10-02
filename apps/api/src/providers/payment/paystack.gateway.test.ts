import { once } from 'node:events';
import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspect } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { NotFoundError } from '../../common/errors.js';
import { loadConfig } from '../../config/env.js';

import {
  PaystackGateway,
  PaystackUnavailableError,
  isPaystackReference,
  newPaystackReference,
  paystackCancelUrl,
  paystackReturnUrl,
} from './paystack.gateway.js';

const SECRET = 'sk_test_gateway_unit_key_0123456789';
const SITE = 'https://impactafricaalliance.org';

let server: Server | undefined;
/** What the stand-in Paystack was sent: each call's path and JSON body. */
let received: { path: string; body?: Record<string, unknown> }[] = [];

const gatewayAt = (apiUrl: string): PaystackGateway =>
  new PaystackGateway(
    loadConfig({
      MONGODB_URI: 'mongodb://127.0.0.1:27017/iaa-test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-0123456789',
      SEED_ADMIN_PASSWORD: 'TestSeedAdminPass2026!',
      PUBLIC_SITE_URL: SITE,
      PAYSTACK_SECRET_KEY: SECRET,
      PAYSTACK_API_URL: apiUrl,
    } as NodeJS.ProcessEnv),
  );

/** A Paystack that answers every call with this status and body, and notes what it was sent. */
const paystackAnswering = async (status: number, body: unknown): Promise<PaystackGateway> => {
  const listener: RequestListener = (req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      received.push({
        path: req.url ?? '',
        ...(text ? { body: JSON.parse(text) as Record<string, unknown> } : {}),
      });
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });
  };
  server = createServer(listener);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return gatewayAt(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
};

/** Paystack's answer to a verify of `ref-1`, with these fields over a paid GH₵100 charge. */
const verified = (data: Record<string, unknown> = {}) => ({
  status: true,
  data: { status: 'success', reference: 'ref-1', amount: 10_000, currency: 'GHS', ...data },
});

const failureOf = async (call: Promise<unknown>): Promise<Error> => {
  try {
    await call;
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected the call to fail');
};

/** Everything a logger or a debugger could print of the error. */
const everything = (error: Error): string =>
  `${inspect(error, { depth: 20, showHidden: true })}${JSON.stringify(error)}`;

afterEach(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  received = [];
});

const charge = {
  amountMinor: 10_000,
  email: 'ama@example.org',
  reference: 'ref-1',
  donationId: '6650f0c2a1b2c3d4e5f60718',
};

describe('PaystackGateway failures', () => {
  it('turns an unknown reference into a 404 that carries nothing of the request', async () => {
    const gateway = await paystackAnswering(400, {
      status: false,
      message: 'Transaction reference not found',
    });
    const error = await failureOf(gateway.verify('not-a-real-reference'));
    expect(error).toBeInstanceOf(NotFoundError);
    expect(everything(error)).not.toContain(SECRET);
  });

  it('reads any other refusal as Paystack unavailable, never as a reference it does not know', async () => {
    const gateway = await paystackAnswering(400, {
      status: false,
      message: 'Invalid request: please try again',
    });
    const error = await failureOf(gateway.verify('iaa-123'));
    expect(error).toBeInstanceOf(PaystackUnavailableError);
    expect((error as PaystackUnavailableError).paystack).toEqual({
      status: 400,
      reason: 'Invalid request: please try again',
    });
  });

  it('keeps Paystack’s status and message, and only those, when it refuses', async () => {
    const gateway = await paystackAnswering(401, { status: false, message: 'Invalid key' });
    const error = await failureOf(gateway.initialize(charge));
    expect(error).toBeInstanceOf(PaystackUnavailableError);
    expect((error as PaystackUnavailableError).paystack).toEqual({
      status: 401,
      reason: 'Invalid key',
    });
    expect((error as PaystackUnavailableError).statusCode).toBe(503);
    expect(everything(error)).not.toContain(SECRET);
    expect(everything(error)).not.toContain('ama@example.org');
  });

  it('reports a Paystack it cannot reach by the network’s code', async () => {
    // A port that was just free: nothing listens there any more.
    const probe = createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const { port } = probe.address() as AddressInfo;
    await new Promise<void>((resolve) => probe.close(() => resolve()));

    const error = await failureOf(gatewayAt(`http://127.0.0.1:${port}`).verify('ref-1'));
    expect(error).toBeInstanceOf(PaystackUnavailableError);
    expect((error as PaystackUnavailableError).paystack).toEqual({
      status: undefined,
      reason: 'ECONNREFUSED',
    });
    expect(everything(error)).not.toContain(SECRET);
  });

  it('refuses an answer without the transaction in it', async () => {
    const gateway = await paystackAnswering(200, { status: true, message: 'OK' });
    expect(await failureOf(gateway.initialize(charge))).toBeInstanceOf(PaystackUnavailableError);
    expect(await failureOf(gateway.verify('ref-1'))).toBeInstanceOf(PaystackUnavailableError);
  });

  it('reads the amount asked for next to the amount paid', async () => {
    const gateway = await paystackAnswering(
      200,
      verified({ amount: 10_195, requested_amount: 10_000, fees: 195 }),
    );
    await expect(gateway.verify('ref-1')).resolves.toEqual({
      status: 'success',
      reference: 'ref-1',
      amountMinor: 10_195,
      requestedMinor: 10_000,
      currency: 'GHS',
    });
  });
});

describe('a payment on a Paystack account shared with other apps', () => {
  it('names its own way back and its cancel page, from PUBLIC_SITE_URL alone', async () => {
    const gateway = await paystackAnswering(200, {
      status: true,
      data: { reference: 'ref-1', authorization_url: 'https://checkout.paystack.com/abc' },
    });
    await gateway.initialize(charge);

    expect(received).toHaveLength(1);
    expect(received[0]?.path).toBe('/transaction/initialize');
    expect(received[0]?.body).toMatchObject({
      reference: 'ref-1',
      callback_url: 'https://impactafricaalliance.org/donate/complete',
      metadata: {
        cancel_action:
          'https://impactafricaalliance.org/donate/complete?reference=ref-1&cancelled=1',
      },
    });
    expect(gateway.returnUrl).toBe('https://impactafricaalliance.org/donate/complete');
  });

  it('marks the payment as this site’s, for the API and for the owner in the dashboard', async () => {
    const gateway = await paystackAnswering(200, {
      status: true,
      data: { reference: 'ref-1', authorization_url: 'https://checkout.paystack.com/abc' },
    });
    await gateway.initialize(charge);

    expect(received[0]?.body?.metadata).toEqual({
      source: 'impact-africa-alliance',
      donation_id: charge.donationId,
      cancel_action: paystackCancelUrl(SITE, 'ref-1'),
      custom_fields: [
        { display_name: 'Website', variable_name: 'website', value: 'Impact Africa Alliance' },
        { display_name: 'Donation ID', variable_name: 'donation_id', value: charge.donationId },
      ],
    });
  });

  it('builds the addresses from the site’s address however it is written', () => {
    expect(paystackReturnUrl('https://impactafricaalliance.org/')).toBe(
      'https://impactafricaalliance.org/donate/complete',
    );
    expect(paystackCancelUrl('https://impactafricaalliance.org//', 'iaa-1.2=3')).toBe(
      'https://impactafricaalliance.org/donate/complete?reference=iaa-1.2%3D3&cancelled=1',
    );
  });

  it('builds them from the site’s origin alone, as the URL parser reads it', () => {
    for (const siteUrl of [
      'https://user:pass@impactafricaalliance.org/?next=https://evil.example#frag',
      'https:impactafricaalliance.org',
      'HTTPS://ImpactAfricaAlliance.ORG/somewhere/else',
      'https://impactafricaalliance.org\\@evil.example',
    ]) {
      expect(paystackReturnUrl(siteUrl), siteUrl).toBe(
        'https://impactafricaalliance.org/donate/complete',
      );
      expect(paystackCancelUrl(siteUrl, 'iaa-1'), siteUrl).toBe(
        'https://impactafricaalliance.org/donate/complete?reference=iaa-1&cancelled=1',
      );
    }
  });

  it('starts every new reference with iaa- and uses only what Paystack accepts', () => {
    const references = Array.from({ length: 50 }, newPaystackReference);
    for (const reference of references) {
      expect(reference).toMatch(/^iaa-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
      expect(isPaystackReference(reference)).toBe(true);
    }
    expect(new Set(references).size).toBe(50);
  });

  it('accepts only letters, digits, -, . and = in a reference, up to 100 of them', () => {
    for (const reference of ['iaa-123', 'T123.45=6', 'legacy-paystack-usd', 'a'.repeat(100)]) {
      expect(isPaystackReference(reference)).toBe(true);
    }
    for (const reference of [
      '',
      'a'.repeat(101),
      'seed_don_0007',
      'pi_3NabcDEF',
      '../transaction/totals',
      'ref 1',
      'ref/1',
      'ref?x=1',
      'réf-1',
      // No letter or digit: none this site makes, and dots alone change the verify address.
      '.',
      '..',
      '...',
      '=',
      '--',
    ]) {
      expect(isPaystackReference(reference), reference).toBe(false);
    }
  });

  it('never asks Paystack about a reference this site could not have made', async () => {
    const gateway = await paystackAnswering(200, verified());
    for (const reference of ['../balance', 'a'.repeat(101), 'pi_3NabcDEF', '.', '..', '...']) {
      expect(await failureOf(gateway.verify(reference)), reference).toBeInstanceOf(NotFoundError);
    }
    expect(received).toEqual([]);
  });

  it('reads who started a payment from metadata sent as an object or as a JSON string', async () => {
    const object = await paystackAnswering(
      200,
      verified({ metadata: { source: 'impact-africa-alliance', donation_id: 'abc' } }),
    );
    expect((await object.verify('ref-1')).source).toBe('impact-africa-alliance');

    server?.closeAllConnections();
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    const text = await paystackAnswering(
      200,
      verified({ metadata: JSON.stringify({ source: 'another-app' }) }),
    );
    expect((await text.verify('ref-1')).source).toBe('another-app');
  });

  it('reads no source where the metadata names none', async () => {
    for (const metadata of [undefined, null, '', 'not json', '[1,2]', { referrer: 'x' }]) {
      server?.closeAllConnections();
      await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
      const gateway = await paystackAnswering(200, verified({ metadata }));
      expect(await gateway.verify('ref-1')).not.toHaveProperty('source');
    }
  });
});

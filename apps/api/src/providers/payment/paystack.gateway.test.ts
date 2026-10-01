import { once } from 'node:events';
import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspect } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { NotFoundError } from '../../common/errors.js';
import { loadConfig } from '../../config/env.js';

import { PaystackGateway, PaystackUnavailableError } from './paystack.gateway.js';

const SECRET = 'sk_test_gateway_unit_key_0123456789';

let server: Server | undefined;

const gatewayAt = (apiUrl: string): PaystackGateway =>
  new PaystackGateway(
    loadConfig({
      MONGODB_URI: 'mongodb://127.0.0.1:27017/iaa-test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-0123456789',
      SEED_ADMIN_PASSWORD: 'TestSeedAdminPass2026!',
      PAYSTACK_SECRET_KEY: SECRET,
      PAYSTACK_API_URL: apiUrl,
    } as NodeJS.ProcessEnv),
  );

/** A Paystack that answers every call with this status and body. */
const paystackAnswering = async (status: number, body: unknown): Promise<PaystackGateway> => {
  const listener: RequestListener = (_req, res) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  server = createServer(listener);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return gatewayAt(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
};

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
});

const charge = { amountMinor: 10_000, email: 'ama@example.org', reference: 'ref-1' };

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
    const gateway = await paystackAnswering(200, {
      status: true,
      data: {
        status: 'success',
        reference: 'ref-1',
        amount: 10_195,
        requested_amount: 10_000,
        currency: 'GHS',
      },
    });
    await expect(gateway.verify('ref-1')).resolves.toEqual({
      status: 'success',
      amountMinor: 10_195,
      requestedMinor: 10_000,
      currency: 'GHS',
    });
  });
});

import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';

import axios, { type AxiosError } from 'axios';
import express from 'express';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createLogger, withoutRequestDetails } from './logger.js';

const BEARER = 'LEAKCHECK-bearer-123';
const CLIENT_SECRET = 'LEAKCHECK-client-secret-456';
const QUERY_TOKEN = 'LEAKCHECK-query-token-789';
const SECRETS = [BEARER, CLIENT_SECRET, QUERY_TOKEN];

/** A provider that refuses every call the way Paystack refuses an unknown reference. */
let provider: Server;
let providerUrl: string;

beforeAll(async () => {
  provider = createServer((_req, res) => {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: false, message: 'Transaction reference not found' }));
  });
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');
  providerUrl = `http://127.0.0.1:${(provider.address() as AddressInfo).port}`;
});

afterAll(() => {
  provider.close();
});

const failedCall = async (baseURL: string): Promise<AxiosError> => {
  const client = axios.create({ baseURL, headers: { Authorization: `Bearer ${BEARER}` } });
  try {
    await client.post(`/transaction/verify/abc?access_token=${QUERY_TOKEN}`, {
      client_secret: CLIENT_SECRET,
    });
  } catch (error) {
    return error as AxiosError;
  }
  throw new Error('the call was expected to fail');
};

const capture = (): { lines: string[]; stream: Writable } => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(chunk.toString('utf8'));
      done();
    },
  });
  return { lines, stream };
};

const expectNoSecrets = (output: string): void => {
  for (const secret of SECRETS) {
    expect(output).not.toContain(secret);
  }
};

describe('logging a failed call to an outside API', () => {
  it('keeps the bearer token, the request body and the query string out of the log', async () => {
    const error = await failedCall(providerUrl);
    const { lines, stream } = capture();
    createLogger('production', stream).error({ err: error }, 'Unhandled error');

    const output = lines.join('');
    expectNoSecrets(output);
    const logged = JSON.parse(output) as { err: Record<string, unknown> };
    expect(logged.err.type).toBe('AxiosError');
    expect(logged.err.message).toBe('Request failed with status code 400');
    expect(logged.err.http).toEqual({
      method: 'POST',
      url: `${providerUrl}/transaction/verify/abc`,
      status: 400,
      providerMessage: 'Transaction reference not found',
    });
  });

  it('cleans an error logged under any key, or passed on its own', async () => {
    const error = await failedCall(providerUrl);
    const { lines, stream } = capture();
    const logger = createLogger('production', stream);
    logger.warn({ error, reference: 'abc' }, 'Paystack refused');
    logger.error(error);

    expect(lines).toHaveLength(2);
    expectNoSecrets(lines.join(''));
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ reference: 'abc' });
  });

  it('cleans a call that never reached the provider', async () => {
    const closed = createServer();
    closed.listen(0, '127.0.0.1');
    await once(closed, 'listening');
    const url = `http://127.0.0.1:${(closed.address() as AddressInfo).port}`;
    closed.close();
    await once(closed, 'close');

    const error = await failedCall(url);
    const { lines, stream } = capture();
    createLogger('production', stream).error({ err: error }, 'Unhandled error');

    const output = lines.join('');
    expectNoSecrets(output);
    expect(output).toContain('ECONNREFUSED');
  });

  it('cleans the request log too, whose error serializer is its own', async () => {
    const error = await failedCall(providerUrl);
    const { lines, stream } = capture();
    const app = express();
    app.use(pinoHttp({ logger: createLogger('production', stream) }));
    app.get('/', (_req, res) => {
      (res as unknown as { err: Error }).err = error;
      res.status(500).end();
    });

    await request(app).get('/').expect(500);

    const output = lines.join('');
    expect(output).toContain('AxiosError');
    expectNoSecrets(output);
  });

  it('leaves the caller’s error as it was', async () => {
    const error = await failedCall(providerUrl);
    createLogger('production', capture().stream).error({ err: error }, 'Unhandled error');

    expect(error.config?.headers.Authorization).toBe(`Bearer ${BEARER}`);
    expect(error.response?.status).toBe(400);
  });

  it('cleans every failure in an AggregateError, and lists them once', async () => {
    const aggregate = new AggregateError(
      [await failedCall(providerUrl), await failedCall(providerUrl)],
      'Every attempt failed',
    );
    const { lines, stream } = capture();
    createLogger('production', stream).error({ err: aggregate }, 'Retry gave up');

    const output = lines.join('');
    expectNoSecrets(output);
    const logged = JSON.parse(output) as {
      err: { aggregateErrors: Record<string, unknown>[]; errors?: unknown };
    };
    expect(logged.err.aggregateErrors).toHaveLength(2);
    expect(logged.err.aggregateErrors[0]).toMatchObject({ type: 'AxiosError', status: 400 });
    expect(logged.err.errors).toBeUndefined();
  });

  it('logs an ordinary error and a non-error as before', () => {
    const { lines, stream } = capture();
    const logger = createLogger('production', stream);
    logger.error({ err: Object.assign(new Error('Boom'), { reference: 'abc' }) }, 'failed');
    logger.warn({ err: 'just a string' }, 'odd');

    const [first, second] = lines.map((line) => JSON.parse(line) as { err: unknown });
    expect(first?.err).toMatchObject({ type: 'Error', message: 'Boom', reference: 'abc' });
    expect(second?.err).toBe('just a string');
  });

  it('passes other errors through untouched', () => {
    const plain = new Error('nothing to hide');
    expect(withoutRequestDetails(plain)).toBe(plain);
  });
});

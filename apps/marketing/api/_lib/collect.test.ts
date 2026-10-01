import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * The function reads its key when the module loads, as a cold start does, so
 * each test loads a fresh copy after setting the environment.
 */
const coldStart = async (key: string | undefined): Promise<Handler> => {
  vi.resetModules();
  vi.stubEnv('ANALYTICS_INGEST_SECRET', key);
  return (await import('../collect')).default as Handler;
};

const view = (method = 'POST'): IncomingMessage =>
  Object.assign(Readable.from([Buffer.from('{"path":"/about"}')]), {
    method,
    headers: { 'user-agent': 'Test', 'x-vercel-ip-country': 'GH', 'x-vercel-ip-city': 'Accra' },
  }) as unknown as IncomingMessage;

const response = (): ServerResponse & { statusCode: number } =>
  ({ statusCode: 200, end: vi.fn() }) as unknown as ServerResponse & { statusCode: number };

/** The headers of the n-th view forwarded to the API. */
const forwarded = (fetchMock: ReturnType<typeof vi.fn>, n = 0): Record<string, string> =>
  (fetchMock.mock.calls[n]?.[1] as RequestInit).headers as Record<string, string>;

let fetchMock: ReturnType<typeof vi.fn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  vi.stubGlobal('fetch', fetchMock);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('collect without the ingest key', () => {
  it('warns once per cold start and still forwards every view', async () => {
    const handler = await coldStart(undefined);
    const first = response();
    await handler(view(), first);
    await handler(view(), response());

    expect(first.statusCode).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(forwarded(fetchMock)['x-iaa-ingest-key']).toBe('');
    expect(forwarded(fetchMock)['x-iaa-country']).toBe('GH');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('ANALYTICS_INGEST_SECRET is not set');
  });

  it('warns again after the next cold start', async () => {
    const first = await coldStart(undefined);
    await first(view(), response());
    const second = await coldStart(undefined);
    await second(view(), response());
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('treats a blank value as missing', async () => {
    const handler = await coldStart('   ');
    await handler(view(), response());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('says nothing for a request that is not a page view', async () => {
    const res = response();
    const handler = await coldStart(undefined);
    await handler(view('GET'), res);
    expect(res.statusCode).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('collect with the ingest key', () => {
  it('forwards the key with the view and does not warn', async () => {
    const handler = await coldStart('a-shared-key-of-sixteen-plus');
    await handler(view(), response());
    expect(forwarded(fetchMock)['x-iaa-ingest-key']).toBe('a-shared-key-of-sixteen-plus');
    expect(warn).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, isNetworkError, type ApiError } from './api-client';
import { tokenStore } from './token-store';

const ok = (body: unknown = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** How the browser reports a refused or dropped connection. */
const refused = (): Error => new TypeError('Failed to fetch');

const aborted = (): DOMException => new DOMException('The operation was aborted.', 'AbortError');

/** Runs the request while letting every pending backoff elapse instantly. */
const withoutWaiting = async <T>(work: () => Promise<T>): Promise<T> => {
  // Watched from the very first tick: the rejection can land while the timers
  // below are being flushed, and one nobody is holding is reported as an
  // unhandled rejection even though the test goes on to assert on it.
  const settled = work().then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  // Each retry schedules its wait only after the previous attempt rejects, so
  // the timers have to be flushed repeatedly rather than all at once.
  for (let index = 0; index < 10; index += 1) {
    await vi.advanceTimersByTimeAsync(20_000);
  }
  const outcome = await settled;
  if (outcome.ok) {
    return outcome.value;
  }
  throw outcome.error;
};

beforeEach(() => {
  vi.useFakeTimers();
  tokenStore.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('a server that is waking up', () => {
  it('retries an idempotent request until it answers', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(refused())
      .mockRejectedValueOnce(refused())
      .mockResolvedValueOnce(ok({ name: 'Patrick Awuah Jr.' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await withoutWaiting(() => api.patch('/admin/team/abc', { isActive: false }));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ name: 'Patrick Awuah Jr.' });
  });

  it('gives up with a message that explains itself', async () => {
    const fetchMock = vi.fn().mockRejectedValue(refused());
    vi.stubGlobal('fetch', fetchMock);

    const failure = withoutWaiting(() => api.patch('/admin/team/abc', { isActive: false })).catch(
      (error: unknown) => error,
    );
    const error = await failure;

    expect(isNetworkError(error)).toBe(true);
    expect((error as ApiError).message).toContain('starting up');
    // One first attempt plus the three backoffs.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('never repeats a POST, which could create a second record', async () => {
    const fetchMock = vi.fn().mockRejectedValue(refused());
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      withoutWaiting(() => api.post('/admin/team', { name: 'New person' })),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a timeout, which only stacks another wait', async () => {
    const fetchMock = vi.fn().mockRejectedValue(aborted());
    vi.stubGlobal('fetch', fetchMock);

    const error = await withoutWaiting(() => api.get('/admin/team')).catch(
      (cause: unknown) => cause,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((error as ApiError).code).toBe('TIMEOUT');
  });

  it('passes a real HTTP error through untouched', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed' } }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
    );

    const error = await withoutWaiting(() => api.patch('/admin/team/abc', { photo: '' })).catch(
      (cause: unknown) => cause,
    );

    expect(isNetworkError(error)).toBe(false);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toBe('Validation failed');
  });
});

describe('an API that is left alone long enough to fall asleep', () => {
  /**
   * The client remembers when the API last answered, so each of these tests
   * needs its own copy of the module — otherwise one test's clock leaves the
   * next one thinking the server was heard from moments ago.
   */
  type Client = { api: typeof api; startKeepAlive: () => () => void };

  const freshClient = async (): Promise<Client> => {
    vi.resetModules();
    return import('./api-client');
  };

  const healthCalls = (mock: ReturnType<typeof vi.fn>): unknown[] =>
    mock.mock.calls.filter((call) => String(call[0]).endsWith('/health'));

  it('pings while the console is open so the instance stays up', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { startKeepAlive } = await freshClient();

    const stop = startKeepAlive();
    await vi.advanceTimersByTimeAsync(21 * 60_000);
    stop();

    expect(healthCalls(fetchMock).length).toBeGreaterThan(0);
  });

  it('stops pinging once the console is closed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { startKeepAlive } = await freshClient();

    startKeepAlive()();
    await vi.advanceTimersByTimeAsync(60 * 60_000);

    expect(healthCalls(fetchMock)).toHaveLength(0);
  });

  it('wakes it with a throwaway GET before sending a create', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ id: 'aiche' }));
    vi.stubGlobal('fetch', fetchMock);
    const client = await freshClient();
    // Six minutes of silence: long enough that the instance may have slept.
    vi.setSystemTime(Date.now() + 6 * 60_000);

    await client.api.post('/admin/team', { name: 'Aïché Goumané' });

    // The health check first, then the write exactly once. A create cannot be
    // retried, so it must only ever meet a server that is already up.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/health');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('sends the create straight away when the API answered a moment ago', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ id: 'aiche' }));
    vi.stubGlobal('fetch', fetchMock);
    const client = await freshClient();

    await client.api.post('/admin/team', { name: 'Aïché Goumané' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('keeps knocking while the instance boots, then sends the write', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(refused())
      .mockRejectedValueOnce(refused())
      .mockResolvedValue(ok({ id: 'aiche' }));
    vi.stubGlobal('fetch', fetchMock);
    const client = await freshClient();
    vi.setSystemTime(Date.now() + 6 * 60_000);

    const result = await withoutWaiting(() =>
      client.api.post('/admin/team', { name: 'Aïché Goumané' }),
    );

    expect(result).toEqual({ id: 'aiche' });
    expect(healthCalls(fetchMock)).toHaveLength(3);
    expect(fetchMock.mock.calls.at(-1)?.[1]).toMatchObject({ method: 'POST' });
  });
});

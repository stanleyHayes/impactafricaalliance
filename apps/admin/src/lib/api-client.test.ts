import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  api,
  isNetworkError,
  onSessionRefreshed,
  setSessionExpiredHandler,
  type ApiError,
} from './api-client';
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

describe('permissions that changed since the token was minted', () => {
  const reply = (status: number, body: unknown = {}): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const forbidden = (): Response =>
    reply(403, { error: { code: 'FORBIDDEN', message: 'Missing required permission' } });

  const expired = (): Response =>
    reply(401, { error: { code: 'UNAUTHORIZED', message: 'Token expired' } });

  /** What the refresh endpoint answers: a new pair minted from the account. */
  const refreshedTo = (accessToken: string): Response =>
    reply(200, { user: { id: 'u1' }, tokens: { accessToken, refreshToken: `${accessToken}-r` } });

  type Answer = (path: string, bearer: string | undefined, method: string) => Response;

  /** Stubs fetch with a function of the path, bearer token and method it is sent. */
  const serve = (answer: Answer): ReturnType<typeof vi.fn> => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const path = new URL(url).pathname.replace(/^\/api/, '');
      return answer(path, headers.Authorization, init?.method ?? 'GET');
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  /** Every request the client sent, as path and the token it carried. */
  const sent = (mock: ReturnType<typeof vi.fn>): Array<{ path: string; token?: string }> =>
    mock.mock.calls.map(([url, init]) => {
      const headers = ((init as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
      const path = new URL(String(url)).pathname.replace(/^\/api/, '');
      return headers.Authorization ? { path, token: headers.Authorization } : { path };
    });

  const refreshes = (mock: ReturnType<typeof vi.fn>): number =>
    sent(mock).filter((call) => call.path === '/auth/refresh').length;

  beforeEach(() => {
    tokenStore.set({ accessToken: 'stale', refreshToken: 'stale-r' });
  });

  afterEach(() => {
    setSessionExpiredHandler(null);
  });

  it('refreshes once on a 403 and resends, so a module granted a moment ago works', async () => {
    const fetchMock = serve((path, bearer) => {
      if (path === '/auth/refresh') {
        return refreshedTo('fresh');
      }
      return bearer === 'Bearer fresh' ? reply(200, { items: ['Accra office'] }) : forbidden();
    });

    const result = await api.get('/admin/offices');

    expect(result).toEqual({ items: ['Accra office'] });
    expect(sent(fetchMock)).toEqual([
      { path: '/admin/offices', token: 'Bearer stale' },
      { path: '/auth/refresh' },
      { path: '/admin/offices', token: 'Bearer fresh' },
    ]);
    expect(tokenStore.access).toBe('fresh');
  });

  it('lets a 403 that survives the refresh through as it is', async () => {
    const fetchMock = serve((path) =>
      path === '/auth/refresh' ? refreshedTo('fresh') : forbidden(),
    );

    const error = await api.get('/admin/offices').catch((cause: unknown) => cause);

    expect((error as ApiError).status).toBe(403);
    expect((error as ApiError).message).toBe('Missing required permission');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refreshes(fetchMock)).toBe(1);
  });

  it('resends a refused POST once, because a refusal means it never ran', async () => {
    const fetchMock = serve((path, bearer) => {
      if (path === '/auth/refresh') {
        return refreshedTo('fresh');
      }
      return bearer === 'Bearer fresh' ? reply(201, { id: 'kumasi' }) : forbidden();
    });

    const result = await api.post('/admin/offices', { city: 'Kumasi' });

    expect(result).toEqual({ id: 'kumasi' });
    const creates = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/admin/offices'));
    expect(creates).toHaveLength(2);
    expect(creates.every(([, init]) => (init as RequestInit).method === 'POST')).toBe(true);
  });

  it('never refreshes twice for one request', async () => {
    // Expired first, then refused with the fresh token: the refresh has
    // already happened, so the refusal is the real answer.
    const fetchMock = serve((path, bearer) => {
      if (path === '/auth/refresh') {
        return refreshedTo('fresh');
      }
      return bearer === 'Bearer fresh' ? forbidden() : expired();
    });

    const error = await api.get('/admin/offices').catch((cause: unknown) => cause);

    expect((error as ApiError).status).toBe(403);
    expect(refreshes(fetchMock)).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('never answers a refusal from the refresh endpoint with another refresh', async () => {
    const fetchMock = serve(() => forbidden());

    const error = await api
      .post('/auth/refresh', { refreshToken: 'stale-r' })
      .catch((cause: unknown) => cause);

    expect((error as ApiError).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves a request made without the session alone', async () => {
    const fetchMock = serve(() => forbidden());

    const error = await api
      .post('/auth/login', { email: 'a@b.org' }, { auth: false })
      .catch((cause: unknown) => cause);

    expect((error as ApiError).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one refresh between requests refused together', async () => {
    const fetchMock = serve((path, bearer) => {
      if (path === '/auth/refresh') {
        return refreshedTo('fresh');
      }
      return bearer === 'Bearer fresh' ? reply(200, { path }) : forbidden();
    });

    const results = await Promise.all([api.get('/admin/offices'), api.get('/admin/projects')]);

    expect(results).toEqual([{ path: '/admin/offices' }, { path: '/admin/projects' }]);
    expect(refreshes(fetchMock)).toBe(1);
  });

  it('resends with a token another request already refreshed, without refreshing again', async () => {
    const fetchMock = serve((path, bearer) => {
      if (bearer === 'Bearer stale') {
        // Another request's refresh lands while this one is being refused.
        tokenStore.set({ accessToken: 'fresh', refreshToken: 'fresh-r' });
        return forbidden();
      }
      return reply(200, { path });
    });

    const result = await api.get('/admin/offices');

    expect(result).toEqual({ path: '/admin/offices' });
    expect(refreshes(fetchMock)).toBe(0);
    expect(sent(fetchMock).at(-1)).toEqual({ path: '/admin/offices', token: 'Bearer fresh' });
  });

  it('ends the session when the refresh token is refused during a 403', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    serve((path) => (path === '/auth/refresh' ? expired() : forbidden()));

    const error = await api.get('/admin/offices').catch((cause: unknown) => cause);

    expect((error as ApiError).status).toBe(403);
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(tokenStore.access).toBeNull();
  });

  it('keeps the session when the refresh cannot get an answer', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/auth/refresh')) {
        throw refused();
      }
      return forbidden();
    });
    vi.stubGlobal('fetch', fetchMock);

    const unreachable = await api.get('/admin/offices').catch((cause: unknown) => cause);
    serve((path) => (path === '/auth/refresh' ? reply(503) : forbidden()));
    const unavailable = await api.get('/admin/offices').catch((cause: unknown) => cause);

    // The refusal stays the answer, and nobody is signed out over a hiccup.
    expect((unreachable as ApiError).status).toBe(403);
    expect((unavailable as ApiError).status).toBe(403);
    expect(onExpired).not.toHaveBeenCalled();
    expect(tokenStore.access).toBe('stale');
  });

  it('tells listeners once per refresh, until they stop listening', async () => {
    const listener = vi.fn();
    const stop = onSessionRefreshed(listener);
    let issued = 0;
    serve((path, bearer) => {
      if (path === '/auth/refresh') {
        issued += 1;
        return refreshedTo(`fresh-${issued}`);
      }
      return bearer?.startsWith('Bearer fresh') ? reply(200) : forbidden();
    });

    await Promise.all([api.get('/admin/offices'), api.get('/admin/projects')]);
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    tokenStore.set({ accessToken: 'stale', refreshToken: 'stale-r' });
    await api.get('/admin/offices');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('still resends when a listener throws', async () => {
    const stop = onSessionRefreshed(() => {
      throw new Error('listener broke');
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    serve((path, bearer) => {
      if (path === '/auth/refresh') {
        return refreshedTo('fresh');
      }
      return bearer === 'Bearer fresh' ? reply(200, { ok: true }) : forbidden();
    });

    await expect(api.get('/admin/offices')).resolves.toEqual({ ok: true });

    stop();
    consoleError.mockRestore();
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

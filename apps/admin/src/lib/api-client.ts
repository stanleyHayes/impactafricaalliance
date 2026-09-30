import type { ApiErrorBody, LoginResponse } from '@iaa/shared';

import { tokenStore } from './token-store';

/**
 * Long enough to cover a cold start. The API sleeps when idle on its current
 * plan, and the first request after that waits for the instance to come back.
 * At fifteen seconds that wait was being cut short and reported as a bare
 * "Failed to fetch" in the console, with nothing shown in the console UI.
 */
const REQUEST_TIMEOUT_MS = 45_000;

/** Safe to send twice, so a request lost to a waking server can be retried. */
const IDEMPOTENT_METHODS = new Set(['GET', 'PATCH', 'DELETE']);

/**
 * Waits before each retry of an idempotent request.
 *
 * A sleeping instance takes tens of seconds to come back, and every request
 * arriving while it does so fails *immediately* rather than hanging. Retrying
 * without waiting therefore spent all the attempts inside a few milliseconds
 * and reported failure while the server was still booting — which is exactly
 * how a visibility toggle came back as "could not reach the server" when
 * nothing was wrong with it.
 */
const RETRY_DELAYS_MS = [2_000, 6_000, 12_000];

/**
 * How long the API can go unheard-from before it may have gone to sleep. The
 * instance sleeps after roughly fifteen minutes idle on its current plan, so
 * five minutes is a safe margin.
 */
const CONTACT_STALE_MS = 5 * 60_000;

/** How long to keep knocking on a sleeping instance before giving up. */
const WAKE_BUDGET_MS = 90_000;

/** A single knock waits this long before it counts as unanswered. */
const WAKE_ATTEMPT_TIMEOUT_MS = 20_000;

/** Gap between knocks. A cold start takes tens of seconds. */
const WAKE_RETRY_MS = 3_000;

/** How often an open console pings the API so it does not fall asleep. */
const KEEP_ALIVE_MS = 10 * 60_000;

/** Requests that change something, and so must not be sent into a void. */
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** A timeout, as opposed to a refused or dropped connection. */
const isTimeout = (cause: unknown): boolean =>
  cause instanceof DOMException && cause.name === 'AbortError';

/**
 * When the API was last known to be awake.
 *
 * Seeded at load because the console fetches the signed-in user straight away,
 * so the first write of a session does not need to knock first.
 */
let lastContactAt = Date.now();

/** Any answer at all — including a rejection — proves the server is up. */
const markContact = (): void => {
  lastContactAt = Date.now();
};

const apiUrl = import.meta.env.VITE_API_URL;
if (typeof apiUrl !== 'string' || !apiUrl) {
  throw new Error('VITE_API_URL is required. Add it to apps/admin/.env');
}
const BASE_URL = apiUrl.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

/**
 * Where the client trades its refresh token for a new pair. A refusal from
 * here is never answered with another refresh, which could only loop.
 */
const REFRESH_PATH = '/auth/refresh';

/**
 * What became of an attempt to trade the refresh token for a new pair.
 *
 * - `refreshed`: a new pair is stored, carrying the account's current
 *   permissions.
 * - `rejected`: the API refused the refresh token, so the session is over and
 *   the stored pair has been cleared.
 * - `unavailable`: there was no refresh token, or the API failed to answer
 *   properly; the stored pair is left as it was.
 */
type RefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';

let refreshInFlight: Promise<RefreshOutcome> | null = null;

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

type SessionRefreshedListener = () => void;
const sessionRefreshedListeners = new Set<SessionRefreshedListener>();

/**
 * Calls `listener` each time the client stores a fresh token pair, and returns
 * the function that stops it.
 *
 * Permissions travel inside the access token, and a refresh is the moment the
 * API reads them again from the account. AuthContext listens so the console's
 * own copy of the account — which decides the navigation, routes and buttons
 * shown — catches up at the same moment instead of on the next reload. That
 * covers a module granted since sign-in as well as one taken away.
 */
export const onSessionRefreshed = (listener: SessionRefreshedListener): (() => void) => {
  sessionRefreshedListeners.add(listener);
  return () => {
    sessionRefreshedListeners.delete(listener);
  };
};

/** Tells every listener a fresh pair is stored. */
const announceRefresh = (): void => {
  for (const listener of sessionRefreshedListeners) {
    try {
      listener();
    } catch (error) {
      // A listener's failure must not undo a refresh that worked, or fail the
      // request that is about to be resent with the new token.
      console.error('Session refresh listener failed:', error);
    }
  }
};

/**
 * Registered by AuthContext so an unrecoverable 401 can end the session.
 *
 * Without this the client refreshed, failed, and rethrew — leaving someone in a
 * console that still looked signed in while every request answered
 * "Unauthorized". Uploading a photo was the usual way to discover it.
 */
export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null): void => {
  onSessionExpired = handler;
};

/**
 * A failure that never produced an HTTP response — the server was unreachable,
 * or took longer than the timeout. Status 0 marks it as such, so callers can
 * tell "we could not ask" apart from "the answer was no".
 */
const networkError = (cause: unknown): ApiError => {
  const timedOut = cause instanceof DOMException && cause.name === 'AbortError';
  return timedOut
    ? new ApiError(
        0,
        'TIMEOUT',
        'The server took too long to respond. It may be starting up — please try again in a moment.',
      )
    : new ApiError(
        0,
        'NETWORK',
        'Could not reach the server. It may be starting up after being idle — wait a moment and try again.',
      );
};

/** True when the request never got an answer, as opposed to a rejected one. */
export const isNetworkError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 0;

const buildError = async (response: Response): Promise<ApiError> => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
  } catch {
    return new ApiError(response.status, 'HTTP_ERROR', response.statusText || 'Request failed');
  }
};

const sendRequest = async (path: string, options: RequestOptions): Promise<Response> => {
  const headers: Record<string, string> = {};
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }

  const method = options.method ?? 'GET';
  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      markContact();
      return response;
    } finally {
      clearTimeout(timeout);
    }
  };

  // A connection that was refused or dropped never reached the app, so
  // repeating an idempotent request is safe — and usually succeeds, because
  // the earlier attempts are what woke the server up. A POST is never
  // repeated: it may well have arrived, and would create a second record.
  const delays = IDEMPOTENT_METHODS.has(method) ? RETRY_DELAYS_MS : [];
  let lastCause: unknown;

  for (let index = 0; index <= delays.length; index += 1) {
    if (index > 0) {
      await wait(delays[index - 1] as number);
    }
    try {
      return await attempt();
    } catch (cause) {
      lastCause = cause;
      // A timeout means the server is reachable and simply slow. Trying again
      // only stacks another wait on top of the one that just elapsed.
      if (isTimeout(cause)) {
        break;
      }
    }
  }

  throw networkError(lastCause);
};

let wakeInFlight: Promise<void> | null = null;

/**
 * Knocks on the health endpoint until the API answers, or the budget runs out.
 *
 * This is what makes a write safe to send after an idle spell. A POST is never
 * repeated — it may already have arrived, and sending it twice would create a
 * second record — so waking the instance with a throwaway GET first is the
 * only way to stop a sleeping server from swallowing one.
 */
const wakeServer = async (): Promise<void> => {
  wakeInFlight ??= (async () => {
    const deadline = Date.now() + WAKE_BUDGET_MS;
    for (;;) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WAKE_ATTEMPT_TIMEOUT_MS);
      try {
        await fetch(`${BASE_URL}/health`, { method: 'GET', signal: controller.signal });
        markContact();
        return;
      } catch {
        if (Date.now() >= deadline) {
          return;
        }
        await wait(WAKE_RETRY_MS);
      } finally {
        clearTimeout(timeout);
      }
    }
  })();
  try {
    await wakeInFlight;
  } finally {
    wakeInFlight = null;
  }
};

/**
 * Keeps the API awake for as long as the console is open, and returns the
 * function that stops it.
 *
 * Reading and typing make no requests, so an hour spent writing an article
 * lets the instance fall asleep, and the save at the end is the request left
 * waiting for it to boot. One small GET every ten minutes removes that wait.
 * Hidden tabs are skipped so a forgotten window does not ping all night.
 */
export const startKeepAlive = (): (() => void) => {
  const timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    if (Date.now() - lastContactAt < KEEP_ALIVE_MS) {
      return;
    }
    void wakeServer();
  }, KEEP_ALIVE_MS);
  return () => clearInterval(timer);
};

/**
 * Trades the refresh token for a new pair, sharing one request between every
 * caller that asks while it is out.
 *
 * The API reads the account afresh to mint the new access token, so this is
 * also how permissions granted or removed since sign-in reach the client.
 */
const tryRefresh = async (): Promise<RefreshOutcome> => {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) {
    return 'unavailable';
  }
  refreshInFlight ??= (async (): Promise<RefreshOutcome> => {
    const response = await sendRequest(REFRESH_PATH, {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    if (response.status >= 500) {
      // The API could not answer, which says nothing about the refresh token.
      // Signing someone out over a server hiccup would lose their work.
      return 'unavailable';
    }
    if (!response.ok) {
      tokenStore.clear();
      return 'rejected';
    }
    const data = (await response.json()) as LoginResponse;
    tokenStore.set(data.tokens);
    announceRefresh();
    return 'refreshed';
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
};

/** Signs the person out wherever the discovery happens. */
const endSession = (): void => {
  tokenStore.clear();
  onSessionExpired?.();
};

/**
 * True when another request's refresh has already replaced the token this
 * one carried. Resending with the new token is then enough; refreshing again
 * would only rotate the pair a second time for nothing.
 */
const tokenReplacedSince = (sentWith: string | null): boolean => {
  const current = tokenStore.access;
  return current !== null && current !== sentWith;
};

/** A refused request, with what is needed to resend it once. */
interface Refusal {
  path: string;
  options: RequestOptions;
  /** The refusal itself, handed back untouched when it cannot be recovered. */
  response: Response;
  /** The access token the refused request carried. */
  sentWith: string | null;
}

/**
 * Answers a 401: the access token has expired. Refresh and resend once, or
 * end the session.
 */
const recoverFromExpiry = async ({
  path,
  options,
  response,
  sentWith,
}: Refusal): Promise<Response> => {
  if (tokenReplacedSince(sentWith)) {
    return sendRequest(path, options);
  }
  if ((await tryRefresh()) === 'refreshed') {
    return sendRequest(path, options);
  }
  // The refresh token is gone or rejected: the session is genuinely over.
  // End it rather than showing "Unauthorized" on every subsequent action.
  endSession();
  return response;
};

/**
 * Answers a 403: the token may carry permissions from before an administrator
 * changed them.
 *
 * Permissions live in the access token for its whole fifteen minutes, so a
 * module granted a moment ago was refused until the token happened to expire,
 * however often the person tried. One refresh mints a token from the account
 * as it is now, and one resend then tells a stale token apart from a genuine
 * refusal. If the resend is refused too, that answer is the real one and is
 * returned as it is — never refreshed again, so nothing can loop.
 *
 * The resend is allowed for every method, POST included. A dropped connection
 * may hide a POST that arrived, which is why a failed connection never repeats
 * one; a 403 is the API saying it did not run the request at all. Its
 * permission and role checks come before any change is written, so sending it
 * again cannot create a second record.
 */
const recoverFromRefusal = async ({
  path,
  options,
  response,
  sentWith,
}: Refusal): Promise<Response> => {
  if (tokenReplacedSince(sentWith)) {
    return sendRequest(path, options);
  }
  // A refresh that cannot reach the API leaves the refusal as the answer, the
  // same as before this recovery existed.
  const outcome = await tryRefresh().catch((): RefreshOutcome => 'unavailable');
  if (outcome === 'refreshed') {
    return sendRequest(path, options);
  }
  if (outcome === 'rejected') {
    endSession();
  }
  return response;
};

/**
 * Sends the request and recovers, at most once, from a refusal the stored
 * token may be to blame for. The resend is never inspected again, so a single
 * call makes at most one refresh.
 */
const sendWithRecovery = async (path: string, options: RequestOptions): Promise<Response> => {
  const sentWith = tokenStore.access;
  const response = await sendRequest(path, options);
  if (options.auth === false || path.split('?')[0] === REFRESH_PATH) {
    return response;
  }
  if (response.status === 401) {
    return recoverFromExpiry({ path, options, response, sentWith });
  }
  if (response.status === 403) {
    return recoverFromRefusal({ path, options, response, sentWith });
  }
  return response;
};

/**
 * Authenticated fetch. A 401 is answered with one token refresh and resend; a
 * 403 with one refresh and resend too, in case permissions changed since the
 * token was minted.
 */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  // A write sent to a sleeping instance is simply lost, and a POST cannot be
  // repeated to recover it. Knock first whenever the API has not been heard
  // from lately, so the write goes to a server already known to be up.
  if (
    MUTATION_METHODS.has(options.method ?? 'GET') &&
    Date.now() - lastContactAt > CONTACT_STALE_MS
  ) {
    await wakeServer();
  }

  const response = await sendWithRecovery(path, options);

  if (!response.ok) {
    throw await buildError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};

export const api = {
  get: <T>(path: string): Promise<T> => apiRequest<T>(path),
  post: <T>(
    path: string,
    body: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> => apiRequest<T>(path, { method: 'POST', body, ...options }),
  patch: <T>(
    path: string,
    body: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> => apiRequest<T>(path, { method: 'PATCH', body, ...options }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> =>
    apiRequest<T>(path, { method: 'DELETE', ...options }),
};

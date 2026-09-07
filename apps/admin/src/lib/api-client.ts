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

let refreshInFlight: Promise<boolean> | null = null;

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

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
        'Could not reach the server. Check your connection and try again.',
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
      return await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attempt();
  } catch (cause) {
    // A network-level failure means the request never reached the app, so
    // repeating an idempotent one is safe — and usually succeeds, because the
    // first attempt is what woke the server up. A POST is never repeated: it
    // could have been received and would create a second record.
    if (IDEMPOTENT_METHODS.has(method)) {
      try {
        return await attempt();
      } catch (retryCause) {
        throw networkError(retryCause);
      }
    }
    throw networkError(cause);
  }
};

const tryRefresh = async (): Promise<boolean> => {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) {
    return false;
  }
  refreshInFlight ??= (async () => {
    const response = await sendRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    if (!response.ok) {
      tokenStore.clear();
      return false;
    }
    const data = (await response.json()) as LoginResponse;
    tokenStore.set(data.tokens);
    return true;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
};

/** Authenticated fetch with one transparent token-refresh retry on 401. */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  let response = await sendRequest(path, options);

  if (response.status === 401 && options.auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await sendRequest(path, options);
    } else {
      // The refresh token is gone or rejected: the session is genuinely over.
      // End it rather than showing "Unauthorized" on every subsequent action.
      tokenStore.clear();
      onSessionExpired?.();
    }
  }

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

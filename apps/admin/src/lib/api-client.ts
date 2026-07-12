import type { ApiErrorBody, LoginResponse } from '@iaa/shared';

import { tokenStore } from './token-store';

const REQUEST_TIMEOUT_MS = 15_000;

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
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
  post: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> =>
    apiRequest<T>(path, { method: 'POST', body, ...options }),
  patch: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> =>
    apiRequest<T>(path, { method: 'PATCH', body, ...options }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> =>
    apiRequest<T>(path, { method: 'DELETE', ...options }),
};

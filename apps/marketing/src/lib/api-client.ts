import type { ApiErrorBody, Paginated } from '@iaa/shared';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

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
  signal?: AbortSignal;
  /**
   * Extra headers for this request, such as an applicant's draft token or a
   * preview token. Tokens travel as headers rather than query strings because
   * a query string reaches analytics and server logs.
   */
  headers?: Record<string, string>;
}

/**
 * Extra settings a helper call can carry beyond its path and body.
 *
 * A separate bag rather than more positional parameters, so every existing
 * `apiGet(path, signal)` and `apiPost(path, body)` call keeps compiling.
 */
export interface ApiCallOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const parseError = async (response: Response): Promise<ApiError> => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
  } catch {
    return new ApiError(response.status, 'HTTP_ERROR', response.statusText || 'Request failed');
  }
};

/**
 * The caller's headers plus the JSON content type when there is a body.
 *
 * The content type is written last so a caller cannot relabel the body: it is
 * always serialised as JSON. With neither a body nor extra headers the result
 * is `undefined`, which is exactly what plain reads sent before headers could
 * be added.
 */
const requestHeaders = (options: RequestOptions): Record<string, string> | undefined => {
  const headers: Record<string, string> = {
    ...options.headers,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  };
  return Object.keys(headers).length > 0 ? headers : undefined;
};

/** Thin typed wrapper over fetch. Throws `ApiError` for non-2xx responses. */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: requestHeaders(options),
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal ?? null,
  });

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};

/**
 * Read a resource. The positional `signal` is kept for existing callers; when
 * both it and `options.signal` are given, the positional one wins.
 */
export const apiGet = <T>(
  path: string,
  signal?: AbortSignal,
  options: ApiCallOptions = {},
): Promise<T> =>
  apiRequest<T>(path, { headers: options.headers, signal: signal ?? options.signal });

export const apiPost = <T>(path: string, body: unknown, options: ApiCallOptions = {}): Promise<T> =>
  apiRequest<T>(path, { method: 'POST', body, ...options });

/**
 * Partially update a resource. Used by the applicant autosave, which sends
 * its draft token in `options.headers`.
 */
export const apiPatch = <T>(
  path: string,
  body: unknown,
  options: ApiCallOptions = {},
): Promise<T> => apiRequest<T>(path, { method: 'PATCH', body, ...options });

export type { Paginated };

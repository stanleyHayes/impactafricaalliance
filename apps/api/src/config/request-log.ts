import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import type { AppLogger } from './logger.js';

/**
 * What the request log keeps of each request and response.
 *
 * pino-http logs every request header by default, and two of ours are
 * passwords: the scheduler's `x-automation-secret` and the website's
 * `x-iaa-ingest-key`. Every hourly run and every page view wrote one into the
 * log. Headers are now kept only when they are on the list below, so a header
 * added later stays out until someone decides it is safe to log.
 *
 * Credentials in the address are blanked the same way: the value of a
 * sensitive query parameter (an OAuth `code` and `state`, a token, an email
 * address), and the review link's token, which is a path segment.
 */

/** Request headers that help trace a request and carry nothing secret. */
const LOGGED_REQUEST_HEADERS = new Set([
  'host',
  'user-agent',
  'content-type',
  'content-length',
  'referer',
  'origin',
  'x-forwarded-for',
  'x-forwarded-proto',
  'cf-ipcountry',
  'cf-ray',
  'rndr-id',
  'x-request-start',
  'x-vercel-id',
]);

/** Response headers worth keeping. `set-cookie` is never one of them. */
const LOGGED_RESPONSE_HEADERS = new Set([
  'content-type',
  'content-length',
  'location',
  'retry-after',
]);

/** Query parameters whose values are credentials or personal details. */
const SENSITIVE_PARAMETER =
  /token|secret|password|signature|email|session|^code$|^state$|^key$|api[-_]?key/i;

/** Address segments that are themselves a credential. */
const CREDENTIAL_SEGMENTS = [/^(\/api\/reviews\/link\/)[^/?#]+/];

const REDACTED = '[redacted]';

const decodedName = (name: string): string => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

/** The address with every credential in it blanked. */
export const addressForLog = (address: unknown): unknown => {
  if (typeof address !== 'string') {
    return address;
  }
  const queryStart = address.indexOf('?');
  const path = queryStart === -1 ? address : address.slice(0, queryStart);
  const query = queryStart === -1 ? '' : address.slice(queryStart + 1);
  const safePath = CREDENTIAL_SEGMENTS.reduce(
    (current, segment) => current.replace(segment, `$1${REDACTED}`),
    path,
  );
  if (!query) {
    return safePath;
  }
  const safeQuery = query
    .split('&')
    .map((pair) => {
      const separator = pair.indexOf('=');
      if (separator === -1) {
        return pair;
      }
      const name = pair.slice(0, separator);
      return SENSITIVE_PARAMETER.test(decodedName(name)) ? `${name}=${REDACTED}` : pair;
    })
    .join('&');
  return `${safePath}?${safeQuery}`;
};

const keepHeaders = (
  headers: unknown,
  allowed: ReadonlySet<string>,
): Record<string, unknown> | undefined => {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>)
      .filter(([name]) => allowed.has(name.toLowerCase()))
      .map(([name, value]) => [
        name,
        name.toLowerCase() === 'location' ? addressForLog(value) : value,
      ]),
  );
};

interface SerializedRequest {
  id?: unknown;
  method?: unknown;
  url?: unknown;
  headers?: unknown;
  remoteAddress?: unknown;
  remotePort?: unknown;
}

interface SerializedResponse {
  statusCode?: unknown;
  headers?: unknown;
}

/**
 * The parsed `query` and `params` are left out: the address already shows
 * them, and blanking them twice is twice the chance of missing one.
 */
export const requestForLog = (req: SerializedRequest): Record<string, unknown> => ({
  id: req.id,
  method: req.method,
  url: addressForLog(req.url),
  headers: keepHeaders(req.headers, LOGGED_REQUEST_HEADERS),
  remoteAddress: req.remoteAddress,
  remotePort: req.remotePort,
});

export const responseForLog = (res: SerializedResponse): Record<string, unknown> => ({
  statusCode: res.statusCode,
  headers: keepHeaders(res.headers, LOGGED_RESPONSE_HEADERS),
});

/** The request logger the app mounts. */
export const requestLogger = (logger: AppLogger): RequestHandler =>
  pinoHttp({ logger, serializers: { req: requestForLog, res: responseForLog } });

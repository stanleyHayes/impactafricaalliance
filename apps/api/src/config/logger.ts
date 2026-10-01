import { pino, type DestinationStream, type Logger } from 'pino';

export type AppLogger = Logger;

/**
 * What an HTTP client attaches to the error it throws. Axios puts the whole
 * failed request there: its headers, carrying the bearer token a payment or
 * social API was called with, and its body, carrying an OAuth client secret.
 * Pino's error serializer copies every enumerable property, so logging such an
 * error as-is writes the credential into the log.
 */
const REQUEST_DETAILS = ['config', 'request', 'response'] as const;

type ErrorRecord = Error & Record<string, unknown>;

/** The address without its query string, which some APIs use for a token. */
const withoutQuery = (url: string, base: unknown): string => {
  try {
    const parsed = new URL(url, typeof base === 'string' ? base : undefined);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/)[0] ?? '';
  }
};

/** The provider's own explanation, e.g. Paystack's "Transaction reference not found". */
const providerMessage = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const body = data as { message?: unknown; error?: { message?: unknown } };
  const message = typeof body.message === 'string' ? body.message : body.error?.message;
  return typeof message === 'string' ? message.slice(0, 200) : undefined;
};

/** Enough to explain the failure: the method, the host and path, the status and the provider's message. */
const describeRequest = (error: ErrorRecord): Record<string, unknown> | undefined => {
  const config = error.config as { method?: unknown; url?: unknown; baseURL?: unknown } | undefined;
  const response = error.response as { status?: unknown; data?: unknown } | undefined;
  const summary: Record<string, unknown> = {};
  if (typeof config?.method === 'string') {
    summary.method = config.method.toUpperCase();
  }
  if (typeof config?.url === 'string') {
    summary.url = withoutQuery(config.url, config.baseURL);
  }
  if (typeof response?.status === 'number') {
    summary.status = response.status;
  }
  const message = providerMessage(response?.data);
  if (message) {
    summary.providerMessage = message;
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
};

const hasRequestDetails = (error: ErrorRecord): boolean =>
  REQUEST_DETAILS.some((key) => error[key] !== undefined) || Array.isArray(error.errors);

/**
 * A copy of an error without the request it carries. The copy keeps the
 * error's class, message, stack, cause and its other own properties, so it is
 * logged exactly as before, minus the credentials. Errors that carry no
 * request come back unchanged.
 */
export const withoutRequestDetails = (error: Error, depth = 0): Error => {
  const source = error as ErrorRecord;
  if (depth > 3 || !hasRequestDetails(source)) {
    return error;
  }
  const copy = Object.create(Object.getPrototypeOf(error) as object) as ErrorRecord;
  for (const key of ['message', 'stack'] as const) {
    Object.defineProperty(copy, key, { value: source[key], writable: true, configurable: true });
  }
  if (source.cause instanceof Error) {
    Object.defineProperty(copy, 'cause', {
      value: withoutRequestDetails(source.cause, depth + 1),
      writable: true,
      configurable: true,
    });
  }
  for (const key of Object.keys(source)) {
    if (!(REQUEST_DETAILS as readonly string[]).includes(key)) {
      copy[key] = source[key];
    }
  }
  if (Array.isArray(source.errors)) {
    // Not enumerable, as on an AggregateError itself: the serializer logs them once,
    // as `aggregateErrors`, and would otherwise print the list a second time.
    Object.defineProperty(copy, 'errors', {
      value: source.errors.map((inner: unknown) =>
        inner instanceof Error ? withoutRequestDetails(inner, depth + 1) : inner,
      ),
      writable: true,
      configurable: true,
    });
  }
  const http = describeRequest(source);
  if (http) {
    copy.http = http;
  }
  return copy;
};

/**
 * Runs on every log call, before any serializer: each error in the logged
 * object, under whatever key, loses the request it carries. The caller's own
 * object is never changed.
 */
const withoutCredentials = (object: Record<string, unknown>): Record<string, unknown> => {
  let cleaned: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(object)) {
    if (value instanceof Error) {
      const safe = withoutRequestDetails(value);
      if (safe !== value) {
        cleaned ??= { ...object };
        cleaned[key] = safe;
      }
    }
  }
  return cleaned ?? object;
};

/**
 * Build the root pino logger. Pretty in dev, structured JSON in production.
 * `destination` is for tests that read what was logged.
 */
export const createLogger = (env: string, destination?: DestinationStream): AppLogger => {
  const isProduction = env === 'production';
  const options = {
    level: process.env.LOG_LEVEL ?? (env === 'test' ? 'silent' : 'info'),
    base: undefined,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.secret'],
      remove: true,
    },
    formatters: { log: withoutCredentials },
    transport:
      isProduction || destination
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
  };
  return destination ? pino(options, destination) : pino(options);
};

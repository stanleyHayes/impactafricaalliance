/**
 * Deciding whether a failed publication is worth trying again.
 *
 * The distinction matters in both directions. Retrying a rate limit or a
 * provider outage is what makes publishing reliable; retrying a rejected
 * caption or a revoked token just burns quota and buries the one thing the
 * administrator actually needs to see.
 */

export type FailureKind = 'transient' | 'permanent' | 'auth';

/** Give up after this many tries, so a persistent fault stops eventually. */
export const MAX_ATTEMPTS = 5;

const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 60 * 60 * 1000;

/**
 * Classify a provider failure.
 *
 * A missing status means the request never got an answer — a network fault or
 * a timeout — which is the most retryable case there is.
 */
export const classifyFailure = (status?: number): FailureKind => {
  if (status === undefined) {
    return 'transient';
  }
  // The credential is the problem: no amount of retrying fixes it, and the
  // administrator has to reconnect the account.
  if (status === 401 || status === 403) {
    return 'auth';
  }
  // Rate limited. Explicitly retryable even though it sits among the 4xx.
  if (status === 429) {
    return 'transient';
  }
  // The request itself is wrong — a caption the provider rejected, a deleted
  // Page, media it refused. Sending it again produces the same answer.
  if (status >= 400 && status < 500) {
    return 'permanent';
  }
  return 'transient';
};

export const isRetryable = (kind: FailureKind, attempt: number): boolean =>
  kind === 'transient' && attempt < MAX_ATTEMPTS;

/**
 * Exponential backoff with jitter.
 *
 * The jitter matters because destinations are queued together: without it,
 * every publication that failed in the same outage would come back at exactly
 * the same moment and reproduce it.
 */
export const backoffMs = (attempt: number, random: () => number = Math.random): number => {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1), MAX_DELAY_MS);
  const jitter = exponential * 0.25 * random();
  return Math.round(exponential + jitter);
};

export const nextAttemptAt = (attempt: number, now: Date, random?: () => number): Date =>
  new Date(now.getTime() + backoffMs(attempt, random));

/**
 * Strip anything secret out of a provider error before it is stored.
 *
 * Provider error bodies echo request context, and that is exactly where tokens
 * and Authorization headers surface. Publication logs are read by people and
 * kept for audit, so they must never carry one.
 */
export const sanitizeProviderError = (message: string): string =>
  message
    .replace(/(access_token|refresh_token|client_secret|api_key|apikey)=[^&\s"']+/gi, '$1=[redacted]')
    .replace(/(Bearer)\s+[A-Za-z0-9._~+/-]+=*/gi, '$1 [redacted]')
    .replace(/"(access_token|refresh_token|client_secret)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"')
    .slice(0, 500);

import type { FormAnswer, FormWindowState } from '@iaa/shared';

import { ApiError } from '../../lib/api-client';

/**
 * What went wrong with a call, in the terms the applicant flow acts on.
 *
 * - `not-found`: the form is not public, or the draft token is bad or expired.
 * - `conflict`: the form is not taking answers (not open, closed, or full).
 * - `validation`: the API refused an answer; details say which.
 * - `rate-limited`: too many tries in a short while; wait, then try again.
 * - `retryable`: no answer, or a server fault. The API sleeps on a free plan
 *   and can take about a minute to wake, so these are worth trying again.
 * - `other`: anything else; trying again will not help.
 */
export type FailureKind =
  'not-found' | 'conflict' | 'validation' | 'rate-limited' | 'retryable' | 'other';

const STATUS_KINDS: Record<number, FailureKind> = {
  400: 'validation',
  404: 'not-found',
  408: 'retryable',
  409: 'conflict',
  429: 'rate-limited',
};

export const failureKind = (error: unknown): FailureKind => {
  if (!(error instanceof ApiError)) {
    // fetch rejects with a TypeError when the server cannot be reached at all,
    // which is what a sleeping API looks like from the browser.
    return error instanceof TypeError ? 'retryable' : 'other';
  }
  if (error.status === 0 || error.status >= 500) {
    return 'retryable';
  }
  return STATUS_KINDS[error.status] ?? 'other';
};

/**
 * The draft's token no longer reaches a draft. The API gives the same 404
 * whether the application was already sent (from another device, or by an
 * earlier try whose answer never arrived) or the draft expired, so the flow
 * cannot tell which. Carrying on quietly with a new draft could send the same
 * application twice; the person is asked instead.
 */
export class DraftLostError extends Error {
  constructor(message = 'This application can no longer be saved.') {
    super(message);
    this.name = 'DraftLostError';
  }
}

/** Worth trying the same call again after a pause. */
export const isTransient = (error: unknown): boolean => {
  const kind = failureKind(error);
  return kind === 'retryable' || kind === 'rate-limited';
};

/** Screens shown instead of the form when it is not taking answers. */
export type UnavailablePhase = 'not-yet-open' | 'closed' | 'limit-reached';

const UNAVAILABLE_PHASES: readonly string[] = ['not-yet-open', 'closed', 'limit-reached'];
const LIMIT_WORDS = /limit|maximum|full|capacity|no more/i;
const NOT_OPEN_WORDS = /not (yet )?open|opens/i;

/** The reason a 409 gives in `details.reason`, when it is one of the screens. */
const reasonFrom = (error: unknown): UnavailablePhase | null => {
  const details = error instanceof ApiError ? error.details : undefined;
  const reason =
    typeof details === 'object' && details !== null
      ? (details as { reason?: unknown }).reason
      : undefined;
  return typeof reason === 'string' && UNAVAILABLE_PHASES.includes(reason)
    ? (reason as UnavailablePhase)
    : null;
};

/**
 * Which screen a 409 means. The API names the case in `details.reason`; when
 * it does not, the form's own schedule is trusted next and the message last.
 * Anything unrecognised reads as closed, which is true either way for the
 * applicant.
 */
export const unavailablePhase = (error: unknown, window?: FormWindowState): UnavailablePhase => {
  const reason = reasonFrom(error);
  if (reason) {
    return reason;
  }
  if (window === 'not-yet-open' || window === 'closed') {
    return window;
  }
  const message = error instanceof Error ? error.message : '';
  if (LIMIT_WORDS.test(message)) {
    return 'limit-reached';
  }
  return NOT_OPEN_WORDS.test(message) ? 'not-yet-open' : 'closed';
};

/** One answer the server refused, by question id. */
export interface ServerAnswerProblem {
  fieldId: string;
  message: string;
}

interface IssueView {
  path: string;
  message: string;
}

const isIssueView = (value: unknown): value is IssueView =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { path?: unknown }).path === 'string' &&
  typeof (value as { message?: unknown }).message === 'string';

/**
 * The question an issue path points at. The answer checks report
 * `answers.<fieldId>`; a schema check on the list itself reports
 * `answers.<index>[.value]`, which is resolved through the answers that were
 * actually sent.
 */
const fieldIdForPath = (path: string, sent: readonly FormAnswer[]): string | undefined => {
  const [root, key] = path.split('.');
  if (root !== 'answers' || !key) {
    return undefined;
  }
  return /^\d+$/.test(key) ? sent[Number(key)]?.fieldId : key;
};

/**
 * The answers a 400 refused, ready to show beside their questions. Empty when
 * the error is not a validation error or names no answer.
 */
export const answerProblemsFrom = (
  error: unknown,
  sent: readonly FormAnswer[],
): ServerAnswerProblem[] => {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) {
    return [];
  }
  return (error.details as unknown[]).filter(isIssueView).flatMap((issue) => {
    const fieldId = fieldIdForPath(issue.path, sent);
    return fieldId ? [{ fieldId, message: issue.message }] : [];
  });
};

/** Calm, plain words for a failed action, by what went wrong. */
export const FAILURE_MESSAGES: Record<FailureKind, string> = {
  'not-found': 'We could not find your application on our side. Try again in a moment.',
  conflict: 'This form is not taking applications right now.',
  validation: 'Some answers need another look before they can be sent.',
  'rate-limited':
    'There have been a lot of tries from this connection in a short time. Wait a minute, then try again. Your answers are still here.',
  retryable:
    'We could not reach our server. It may be waking up, which can take up to a minute. Your answers are still here, so try again in a moment.',
  other: 'Something went wrong on our side. Your answers are still here, so try again.',
};

export const failureMessage = (error: unknown): string => FAILURE_MESSAGES[failureKind(error)];

/**
 * Why a file did not upload. The API explains a refused file (wrong type, too
 * large) in its own words, which are the most useful thing to show; an error
 * raised in the browser already carries a sentence written for the person.
 */
export const uploadFailureMessage = (error: unknown): string => {
  const kind = failureKind(error);
  if (kind === 'rate-limited') {
    return 'There have been a lot of uploads from this connection in a short time. Wait a few minutes, then try again.';
  }
  if (kind === 'retryable') {
    return 'We could not reach our server to start the upload. It may be waking up, so try again in a moment.';
  }
  if (error instanceof ApiError && kind === 'validation') {
    // The detail says what would work ("Use one of these file types: …"),
    // which helps more than the headline alone.
    const detail = Array.isArray(error.details)
      ? (error.details as unknown[]).find(isIssueView)?.message
      : undefined;
    return detail ?? error.message;
  }
  if (!(error instanceof ApiError) && error instanceof Error && error.message) {
    return error.message;
  }
  return 'The file did not upload. Try again.';
};

/** Screens a failed Begin or Submit leads to instead of a message, if any. */
export const blockedPhaseFor = (
  error: unknown,
  window?: FormWindowState,
): 'not-found' | UnavailablePhase | null => {
  const kind = failureKind(error);
  if (kind === 'conflict') {
    return unavailablePhase(error, window);
  }
  return kind === 'not-found' ? 'not-found' : null;
};

/** Where a failed load leaves the page: not found, or an error worth retrying. */
export const loadFailurePhase = (error: unknown, preview: boolean): 'not-found' | 'error' => {
  if (failureKind(error) === 'not-found') {
    return 'not-found';
  }
  // A preview token that is refused, however the API words it, is a link
  // that no longer works; the same screen explains it.
  const refused = error instanceof ApiError && (error.status === 401 || error.status === 403);
  return preview && refused ? 'not-found' : 'error';
};

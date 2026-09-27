import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

const ONE_MINUTE_MS = 60_000;

/** Tighter limit for credential and form endpoints to deter abuse. */
export const sensitiveRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * ONE_MINUTE_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

/** Broad limit applied to the whole public API surface. */
export const globalRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

/** Tight limit for payment webhooks: they should be low-volume and signed. */
export const webhookRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: ONE_MINUTE_MS,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many webhook requests' },
  },
});

/**
 * A fifteen-minute limiter with its own counter.
 *
 * Each public application endpoint gets one of these rather than
 * `sensitiveRateLimit`, which is a single bucket shared with login and token
 * refresh: an applicant autosaving from an office connection would otherwise
 * use up the allowance and sign every colleague on that connection out.
 */
const applicantLimit = (max: number, message: string): RateLimitRequestHandler =>
  rateLimit({
    windowMs: 15 * ONE_MINUTE_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message } },
  });

/**
 * Starting, reading and autosaving an application draft. Generous because
 * autosave runs a second and a half after each pause in typing: 300 in fifteen
 * minutes is one save every three seconds, which covers a fast typist on a
 * long form and still stops a script.
 */
export const formDraftRateLimit = applicantLimit(
  300,
  'Too many saves in a short time. Wait a few minutes and try again.',
);

/** Final submission. Ten allows for retries on a poor connection, not for flooding a form. */
export const formSubmitRateLimit = applicantLimit(
  10,
  'Too many submissions from this connection. Wait a few minutes and try again.',
);

/** Signing applicant uploads: room for a few retries on each of a form's file questions. */
export const formUploadRateLimit = applicantLimit(
  40,
  'Too many uploads in a short time. Wait a few minutes and try again.',
);

/**
 * "Email me a link to finish later". Low because every call can send an email
 * to an address the caller typed.
 */
export const resumeLinkRateLimit = applicantLimit(
  5,
  'Too many link requests. Wait a few minutes and try again.',
);

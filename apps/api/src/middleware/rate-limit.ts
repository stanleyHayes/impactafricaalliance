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

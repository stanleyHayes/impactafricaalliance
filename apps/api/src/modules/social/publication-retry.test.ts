import { describe, expect, it } from 'vitest';

import {
  MAX_ATTEMPTS,
  backoffMs,
  classifyFailure,
  isRetryable,
  nextAttemptAt,
  sanitizeProviderError,
} from './publication-retry.js';

describe('classifying a provider failure', () => {
  it('treats a credential problem as needing the administrator, not a retry', () => {
    expect(classifyFailure(401)).toBe('auth');
    expect(classifyFailure(403)).toBe('auth');
    expect(isRetryable('auth', 1)).toBe(false);
  });

  it('retries a rate limit even though it is a 4xx', () => {
    expect(classifyFailure(429)).toBe('transient');
    expect(isRetryable(classifyFailure(429), 1)).toBe(true);
  });

  it('does not retry a request the provider rejected on its merits', () => {
    expect(classifyFailure(400)).toBe('permanent');
    expect(classifyFailure(422)).toBe('permanent');
    expect(isRetryable('permanent', 1)).toBe(false);
  });

  it('retries a provider outage', () => {
    expect(classifyFailure(500)).toBe('transient');
    expect(classifyFailure(503)).toBe('transient');
  });

  it('retries a request that never got an answer at all', () => {
    expect(classifyFailure(undefined)).toBe('transient');
  });

  it('gives up once the attempts are spent', () => {
    expect(isRetryable('transient', MAX_ATTEMPTS - 1)).toBe(true);
    expect(isRetryable('transient', MAX_ATTEMPTS)).toBe(false);
  });
});

describe('backoff', () => {
  it('grows with each attempt', () => {
    const noJitter = () => 0;
    expect(backoffMs(2, noJitter)).toBeGreaterThan(backoffMs(1, noJitter));
    expect(backoffMs(3, noJitter)).toBeGreaterThan(backoffMs(2, noJitter));
  });

  it('stops growing at an hour', () => {
    expect(backoffMs(20, () => 0)).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it('spreads simultaneous failures apart', () => {
    // Without jitter every destination queued in one outage returns at the
    // same instant and reproduces it.
    expect(backoffMs(1, () => 1)).toBeGreaterThan(backoffMs(1, () => 0));
  });

  it('schedules from the time given', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(nextAttemptAt(1, now, () => 0).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('sanitising a provider error', () => {
  it('redacts a token in a query string', () => {
    const clean = sanitizeProviderError('failed: https://graph.example/v1?access_token=SECRET123&id=7');
    expect(clean).not.toContain('SECRET123');
    expect(clean).toContain('[redacted]');
  });

  it('redacts a bearer header', () => {
    expect(sanitizeProviderError('Authorization: Bearer abc.def.ghi')).not.toContain('abc.def.ghi');
  });

  it('redacts a token in a JSON body', () => {
    const clean = sanitizeProviderError('{"access_token":"SECRET","error":"bad"}');
    expect(clean).not.toContain('SECRET');
    expect(clean).toContain('bad');
  });

  it('keeps the part a person needs to read', () => {
    expect(sanitizeProviderError('The caption exceeds the maximum length.')).toBe(
      'The caption exceeds the maximum length.',
    );
  });

  it('bounds what gets stored', () => {
    expect(sanitizeProviderError('x'.repeat(2000))).toHaveLength(500);
  });
});

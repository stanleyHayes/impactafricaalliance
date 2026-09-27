import { describe, expect, it } from 'vitest';

import {
  draftExpiry,
  hashDraftToken,
  isDraftTokenShape,
  MAX_DRAFT_TOKENS,
  newDraftToken,
  rotateTokenHashes,
} from './draft-token.js';

describe('draft tokens', () => {
  it('are 32 random bytes in base64url, different every time', () => {
    const first = newDraftToken();
    const second = newDraftToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(first).not.toBe(second);
  });

  it('are stored only as a SHA-256 hash, the same for the same token', () => {
    const token = newDraftToken();
    const hash = hashDraftToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashDraftToken(token));
    expect(hash).not.toContain(token);
    expect(hashDraftToken(newDraftToken())).not.toBe(hash);
  });

  it('refuses anything that could not be a token before it reaches the database', () => {
    expect(isDraftTokenShape(newDraftToken())).toBe(true);
    expect(isDraftTokenShape(undefined)).toBe(false);
    expect(isDraftTokenShape('')).toBe(false);
    expect(isDraftTokenShape('A'.repeat(42))).toBe(false);
    expect(isDraftTokenShape('A'.repeat(44))).toBe(false);
    expect(isDraftTokenShape(`${'A'.repeat(42)}=`)).toBe(false);
    expect(isDraftTokenShape({ $ne: null })).toBe(false);
  });

  it('keep the newest five hashes when a resume link adds one', () => {
    const hashes = ['a', 'b', 'c', 'd', 'e'];
    expect(rotateTokenHashes(hashes, 'f')).toEqual(['b', 'c', 'd', 'e', 'f']);
    expect(rotateTokenHashes(['a'], 'b')).toEqual(['a', 'b']);
    // A repeat moves to the end rather than being kept twice.
    expect(rotateTokenHashes(['a', 'b'], 'a')).toEqual(['b', 'a']);
    expect(rotateTokenHashes(hashes, 'g')).toHaveLength(MAX_DRAFT_TOKENS);
  });

  it('expire thirty days after the last save', () => {
    const now = new Date('2026-10-01T09:00:00.000Z');
    expect(draftExpiry(now).toISOString()).toBe('2026-10-31T09:00:00.000Z');
  });
});

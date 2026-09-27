import { APPLICATION_REFERENCE_PATTERN } from '@iaa/shared';
import { MongoServerError } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import {
  isDuplicateReferenceError,
  MAX_REFERENCE_ATTEMPTS,
  newApplicationReference,
  REFERENCE_ALPHABET,
  withUniqueReference,
} from './application-reference.js';

const duplicate = (keyPattern: Record<string, number>): MongoServerError => {
  const error = new MongoServerError({ message: 'E11000 duplicate key error' });
  error.code = 11000;
  error.keyPattern = keyPattern;
  return error;
};

describe('application references', () => {
  it('look like APP-XXXXXX and leave out characters people misread', () => {
    for (let index = 0; index < 200; index += 1) {
      const reference = newApplicationReference();
      expect(reference).toMatch(APPLICATION_REFERENCE_PATTERN);
      expect(reference.slice(4)).not.toMatch(/[01OIL]/);
    }
    expect(REFERENCE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it('are built from the picks they are given', () => {
    let next = 0;
    expect(newApplicationReference(() => next++)).toBe('APP-ABCDEF');
  });

  it('try again with a new reference when one is already taken', async () => {
    const attempt = vi
      .fn<(reference: string) => Promise<string>>()
      .mockRejectedValueOnce(duplicate({ reference: 1 }))
      .mockImplementation(async (reference) => reference);
    const picks = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
    const result = await withUniqueReference(attempt, () => picks.shift() ?? 0);
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(attempt.mock.calls[0]?.[0]).toBe('APP-AAAAAA');
    expect(result).toBe('APP-BBBBBB');
  });

  it('only retries a clash on the reference, and gives up after a few', async () => {
    const other = duplicate({ slug: 1 });
    await expect(withUniqueReference(() => Promise.reject(other))).rejects.toBe(other);
    expect(isDuplicateReferenceError(other)).toBe(false);
    expect(isDuplicateReferenceError(new Error('boom'))).toBe(false);

    const always = vi.fn().mockRejectedValue(duplicate({ reference: 1 }));
    await expect(withUniqueReference(always)).rejects.toBeInstanceOf(MongoServerError);
    expect(always).toHaveBeenCalledTimes(MAX_REFERENCE_ATTEMPTS);
  });
});

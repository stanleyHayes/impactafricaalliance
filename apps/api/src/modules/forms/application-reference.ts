import { randomInt } from 'node:crypto';

import { MongoServerError } from 'mongodb';

/**
 * Application references such as `APP-7K2Q9M`: what an applicant quotes when
 * they write in, and what staff search for.
 */

/**
 * Capital letters and digits without the pairs people misread when a
 * reference is read aloud or copied from a phone: 0 and O, 1 and I, and L.
 */
export const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const REFERENCE_LENGTH = 6;

/**
 * Attempts before giving up. With 31^6 (about 887 million) references, a
 * clash is rare and five in a row means something else is wrong.
 */
export const MAX_REFERENCE_ATTEMPTS = 5;

const DUPLICATE_KEY_CODE = 11000;

/** A random index below `max`, from a cryptographic source unless a test supplies one. */
export type PickIndex = (max: number) => number;

const securePick: PickIndex = (max) => randomInt(0, max);

/**
 * A new reference. Random rather than sequential, so a reference says nothing
 * about how many people applied and cannot be used to guess another.
 */
export const newApplicationReference = (pick: PickIndex = securePick): string => {
  let code = '';
  for (let index = 0; index < REFERENCE_LENGTH; index += 1) {
    code += REFERENCE_ALPHABET[pick(REFERENCE_ALPHABET.length)] ?? 'A';
  }
  return `APP-${code}`;
};

/** Whether an error is the unique index on `reference` refusing a repeat. */
export const isDuplicateReferenceError = (error: unknown): boolean =>
  error instanceof MongoServerError &&
  error.code === DUPLICATE_KEY_CODE &&
  Object.keys((error.keyPattern as Record<string, unknown> | undefined) ?? {}).includes(
    'reference',
  );

/**
 * Run `attempt` with fresh references until one is not already taken. The
 * unique index is the judge, not a lookup first, so two submissions at the
 * same moment cannot both claim the same reference.
 */
export const withUniqueReference = async <T>(
  attempt: (reference: string) => Promise<T>,
  pick: PickIndex = securePick,
): Promise<T> => {
  for (let tries = 1; ; tries += 1) {
    try {
      return await attempt(newApplicationReference(pick));
    } catch (error) {
      if (!isDuplicateReferenceError(error) || tries >= MAX_REFERENCE_ATTEMPTS) {
        throw error;
      }
    }
  }
};

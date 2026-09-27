import { createHash, randomBytes } from 'node:crypto';

import { DRAFT_RETENTION_DAYS } from '@iaa/shared';

/**
 * Applicant draft tokens (plan D8).
 *
 * A draft token is the only thing that reaches an applicant's unfinished
 * application: applicants have no account, and a submission id is never
 * treated as permission. The token is shown once and only its SHA-256 hash is
 * stored, following the password-reset precedent, so a copy of the database
 * cannot be used to open anyone's draft.
 */

/** 32 random bytes: far beyond guessing, and short enough for a link. */
export const DRAFT_TOKEN_BYTES = 32;

/**
 * Tokens that may reach one draft at once. Each resume link adds one, so the
 * tab the applicant already has open keeps working; the oldest drops off.
 */
export const MAX_DRAFT_TOKENS = 5;

// 32 bytes in base64url, without padding, is always 43 characters.
const DRAFT_TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A fresh token for a new draft or a resume link. */
export const newDraftToken = (): string => randomBytes(DRAFT_TOKEN_BYTES).toString('base64url');

/** What is stored, and what a presented token is looked up by. */
export const hashDraftToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/**
 * Whether a header value could be a token at all. Anything else is refused
 * before it reaches the database, so an oversized or odd header costs nothing.
 */
export const isDraftTokenShape = (value: unknown): value is string =>
  typeof value === 'string' && DRAFT_TOKEN_SHAPE.test(value);

/**
 * The hashes to keep after adding one: the newest `MAX_DRAFT_TOKENS`, with no
 * repeats. The database update applies the same rule with `$push` and
 * `$slice`; this is the rule written down where it can be tested.
 */
export const rotateTokenHashes = (current: readonly string[], added: string): string[] =>
  [...current.filter((hash) => hash !== added), added].slice(-MAX_DRAFT_TOKENS);

/** When a draft saved at `now` expires. Every save starts the count again. */
export const draftExpiry = (now: Date): Date =>
  new Date(now.getTime() + DRAFT_RETENTION_DAYS * DAY_MS);

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
 * Tokens that may reach one draft at once. Each resume link adds one beside
 * the token that asked for it, so the tab the applicant already has open keeps
 * working; the oldest of the others drops off.
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
 * The hashes to keep when a resume link is asked for: the one presented, the
 * one added, and the newest others, `MAX_DRAFT_TOKENS` in all with no repeats.
 * The presented hash is always kept. Only the open tab presents the first
 * token, so trimming purely by age would lock that tab out on the fifth
 * request and split the application in two. `tokenHashesAfterLink` is the
 * same rule as a database update; this is it written down to be tested.
 */
export const rotateTokenHashes = (
  current: readonly string[],
  presented: string,
  added: string,
): string[] =>
  [...current.filter((hash) => hash !== presented && hash !== added), presented, added].slice(
    -MAX_DRAFT_TOKENS,
  );

/**
 * `rotateTokenHashes` as an aggregation expression over the stored
 * `tokenHashes`, for an update pipeline. Worked out inside the one update, so
 * two link requests at once cannot each overwrite the other's token.
 */
export const tokenHashesAfterLink = (
  presented: string,
  added: string,
): Record<string, unknown> => ({
  $slice: [
    {
      $concatArrays: [
        {
          $filter: {
            input: '$tokenHashes',
            cond: { $not: [{ $in: ['$$this', [presented, added]] }] },
          },
        },
        [presented, added],
      ],
    },
    -MAX_DRAFT_TOKENS,
  ],
});

/** When a draft saved at `now` expires. Every save starts the count again. */
export const draftExpiry = (now: Date): Date =>
  new Date(now.getTime() + DRAFT_RETENTION_DAYS * DAY_MS);

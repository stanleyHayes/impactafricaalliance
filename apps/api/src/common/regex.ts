// Every character with a special meaning in a JavaScript or MongoDB regular expression.
const SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * Make text safe to embed in a regular expression, so it matches itself and
 * nothing else.
 *
 * Search boxes send whatever was typed. Unescaped, `.*` would match every
 * record and a pattern such as `(a+)+$` could hold the database on one query
 * for seconds. Escaped, both are only literal text.
 */
export const escapeRegex = (value: string): string => value.replace(SPECIAL_CHARACTERS, '\\$&');

/**
 * A case-insensitive "contains" pattern for a search box, for use in a
 * MongoDB filter such as `{ name: searchRegex(q) }`.
 */
export const searchRegex = (value: string): RegExp => new RegExp(escapeRegex(value.trim()), 'i');

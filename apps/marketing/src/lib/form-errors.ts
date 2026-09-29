import type { $ZodErrorMap } from 'zod/v4/core';

/**
 * Plain-English messages for the site's forms.
 *
 * Every form on the site turns the browser's own checks off (`noValidate`):
 * their bubbles cannot be styled, disappear after a moment, are worded
 * differently in every browser and are not reliably read out. The shared
 * schemas then do the checking, but where a schema gives no message of its
 * own, Zod's default is written for developers ("Too small: expected string
 * to have >=2 characters"). This fills those gaps with words a visitor can
 * act on, in British English.
 *
 * A message written in the schema always wins: Zod only asks this map when
 * the schema has none. Pass it to the resolver:
 * `zodResolver(schema, { error: friendlyFormErrors })`.
 */

const REQUIRED = 'This field is required.';

const isBlank = (input: unknown): boolean =>
  input === undefined || input === null || (typeof input === 'string' && input.trim() === '');

const sizeMessage = (
  origin: string,
  bound: number | bigint,
  side: 'min' | 'max',
): string | undefined => {
  const min = side === 'min';
  if (origin === 'string') {
    return min
      ? `Enter at least ${bound} characters.`
      : `Keep this to ${bound} characters or fewer.`;
  }
  if (origin === 'number' || origin === 'int') {
    return min ? `Enter ${bound} or more.` : `Enter ${bound} or less.`;
  }
  if (origin === 'array' || origin === 'set') {
    return min ? `Choose at least ${bound}.` : `Choose no more than ${bound}.`;
  }
  return undefined;
};

const FORMAT_MESSAGES: Readonly<Record<string, string>> = {
  email: 'Enter an email address, like name@example.com.',
  url: 'Enter a full link, starting with https://',
};

const TYPE_MESSAGES: Readonly<Record<string, string>> = {
  number: 'Enter a number.',
  int: 'Enter a whole number.',
};

export const friendlyFormErrors: $ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'too_small':
      return isBlank(issue.input) ? REQUIRED : sizeMessage(issue.origin, issue.minimum, 'min');
    case 'too_big':
      return sizeMessage(issue.origin, issue.maximum, 'max');
    case 'invalid_format':
      // An empty email box is a missing answer, not a badly written one.
      if (isBlank(issue.input)) {
        return issue.format === 'email' ? 'Enter your email address.' : REQUIRED;
      }
      return FORMAT_MESSAGES[issue.format] ?? 'Check how this is written.';
    case 'invalid_type':
      return isBlank(issue.input) ? REQUIRED : TYPE_MESSAGES[issue.expected];
    case 'invalid_value':
      return 'Choose one of the options.';
    default:
      return undefined;
  }
};

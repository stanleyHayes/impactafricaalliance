import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { friendlyFormErrors } from './form-errors';

const messageFor = (schema: z.ZodType, input: unknown): string | undefined =>
  schema.safeParse(input, { error: friendlyFormErrors }).error?.issues[0]?.message;

describe('friendly form messages', () => {
  it('calls an empty answer missing, whatever rule it broke', () => {
    expect(messageFor(z.string().min(2), '')).toBe('This field is required.');
    expect(messageFor(z.string().email(), '')).toBe('Enter your email address.');
    expect(messageFor(z.string(), undefined)).toBe('This field is required.');
  });

  it('says what length or size an answer must be', () => {
    expect(messageFor(z.string().min(10), 'Short')).toBe('Enter at least 10 characters.');
    expect(messageFor(z.string().max(5), 'Too long')).toBe('Keep this to 5 characters or fewer.');
    expect(messageFor(z.number().min(1), 0)).toBe('Enter 1 or more.');
    expect(messageFor(z.number().max(744), 800)).toBe('Enter 744 or less.');
    expect(messageFor(z.array(z.string()).min(1), [])).toBe('Choose at least 1.');
  });

  it('shows what a good email address or link looks like', () => {
    expect(messageFor(z.string().email(), 'ama@')).toBe(
      'Enter an email address, like name@example.com.',
    );
    expect(messageFor(z.string().url(), 'example')).toBe(
      'Enter a full link, starting with https://',
    );
  });

  it('asks for a number when the answer is not one', () => {
    expect(messageFor(z.number(), Number.NaN)).toBe('Enter a number.');
  });

  it('never replaces a message the schema wrote itself', () => {
    expect(messageFor(z.string().min(2, 'Please give a name to show'), '')).toBe(
      'Please give a name to show',
    );
  });
});

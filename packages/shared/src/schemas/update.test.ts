import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import * as schemas from '../index.js';

import { partialForUpdate } from './update.js';

/** Every exported PATCH schema, found by name so new resources are covered too. */
const updateSchemas = Object.entries(schemas).filter(
  (entry): entry is [string, z.ZodTypeAny] =>
    entry[0].endsWith('UpdateSchema') &&
    typeof (entry[1] as z.ZodTypeAny)?.safeParse === 'function',
);

describe('PATCH schemas', () => {
  it('covers every update schema in the package', () => {
    expect(updateSchemas.length).toBeGreaterThanOrEqual(15);
  });

  // The bug this guards: `.partial()` keeps `.default()`, so a PATCH that
  // omitted a field reset it instead of leaving it alone — quietly setting
  // articles back to draft and demoting a board member to executive.
  it.each(updateSchemas)('%s adds nothing to an empty body', (_name, schema) => {
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it.each(updateSchemas)('%s adds nothing to a body it does not know', (_name, schema) => {
    const result = schema.safeParse({ somethingUnrelated: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data as object)).toHaveLength(0);
    }
  });
});

describe('partialForUpdate', () => {
  const base = z.object({
    name: z.string().min(3),
    tier: z.enum(['board', 'executive']).default('executive'),
    order: z.number().default(0),
    note: z.string().optional(),
  });
  const update = partialForUpdate(base);

  it('keeps a value the caller did send', () => {
    expect(update.parse({ tier: 'board' })).toEqual({ tier: 'board' });
  });

  it('leaves a defaulted field absent when it was not sent', () => {
    expect(update.parse({ name: 'Ada Lovelace' })).toEqual({ name: 'Ada Lovelace' });
  });

  it('still rejects a value that fails the underlying rules', () => {
    expect(update.safeParse({ tier: 'chairman' }).success).toBe(false);
    expect(update.safeParse({ name: 'no' }).success).toBe(false);
  });
});

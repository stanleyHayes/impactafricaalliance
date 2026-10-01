import type { ResolverOptions } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { resourceResolver, schemaDefault } from './resolver';

const schema = z.object({
  name: z.string().min(1),
  photo: z.object({ url: z.string().url() }).optional(),
  order: z.number().int().default(0),
  startsAt: z.union([z.null(), z.string().datetime()]).optional(),
});

const options = {
  fields: {},
  shouldUseNativeValidation: false,
} as ResolverOptions<Record<string, unknown>>;

const resolve = (values: Record<string, unknown>) =>
  resourceResolver(schema)(values, undefined, options);

describe('resourceResolver', () => {
  it('reads an emptied field (null) as absent', async () => {
    const result = await resolve({ name: 'Ama', photo: null, order: null, startsAt: null });
    expect(result.errors).toEqual({});
    // Absent, so an edit sends the photo and the date as removals; the
    // order takes its default.
    expect(result.values).toEqual({ name: 'Ama', order: 0 });
  });

  it('still refuses an emptied field the resource needs', async () => {
    const result = await resolve({ name: null, photo: { url: 'https://example.com/a.jpg' } });
    expect(Object.keys(result.errors)).toEqual(['name']);
  });
});

describe('schemaDefault', () => {
  it('gives what the schema fills in for an empty field, and nothing otherwise', () => {
    expect(schemaDefault(schema, 'order')).toBe(0);
    expect(schemaDefault(schema, 'photo')).toBeUndefined();
    expect(schemaDefault(schema, 'name')).toBeUndefined();
    expect(schemaDefault(schema, 'unknown')).toBeUndefined();
    expect(schemaDefault(z.string(), 'order')).toBeUndefined();
  });
});

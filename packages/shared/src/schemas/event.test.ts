import { describe, expect, it } from 'vitest';

import { eventUpdateSchema } from './event.js';

describe('event patch contract', () => {
  it('does not inject create defaults into a partial edit', () => {
    expect(eventUpdateSchema.parse({ title: 'Updated event' })).toEqual({ title: 'Updated event' });
  });
  it('allows optional-field removal but rejects clearing required fields', () => {
    expect(eventUpdateSchema.parse({ image: null, endAt: null, capacity: null })).toEqual({
      image: null,
      endAt: null,
      capacity: null,
    });
    expect(eventUpdateSchema.safeParse({ title: null }).success).toBe(false);
  });
});

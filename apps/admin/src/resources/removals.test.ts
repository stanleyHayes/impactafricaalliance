import { describe, expect, it } from 'vitest';

import { withRemovals } from './removals';

const fields = ['name', 'country', 'photo', 'linkedInUrl', 'bio', 'xUrl', 'order'].map((name) => ({
  name,
}));

describe('withRemovals', () => {
  it('sends null for a field that had a value and was emptied', () => {
    const initial = {
      name: 'Ama Mensah',
      country: 'GH',
      photo: { url: 'https://example.com/ama.jpg', publicId: 'ama' },
      linkedInUrl: 'https://www.linkedin.com/in/ama',
      order: 2,
    };
    const body = { name: 'Ama Mensah', country: undefined, photo: undefined, order: 2 };
    expect(withRemovals(fields, initial, body)).toEqual({
      name: 'Ama Mensah',
      country: null,
      photo: null,
      linkedInUrl: null,
      order: 2,
    });
  });

  it('leaves out a blank that was blank already, even one the schema made null', () => {
    const initial = { name: 'Ama Mensah', bio: '', xUrl: null };
    const result = withRemovals(fields, initial, {
      name: 'Ama Mensah',
      bio: undefined,
      xUrl: null,
    });
    expect(result).toEqual({ name: 'Ama Mensah' });
    expect(Object.keys(result)).toEqual(['name']);
  });

  it('keeps values, including falsy ones, and fields it does not manage', () => {
    const initial = { name: 'Old', order: 3, publishedAt: '2026-01-01T00:00:00.000Z' };
    const body = { name: 'New', order: 0, publishedAt: '2026-01-01T00:00:00.000Z' };
    expect(withRemovals(fields, initial, body)).toEqual(body);
  });
});

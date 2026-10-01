import { describe, expect, it } from 'vitest';

import { mediaDetailsChanges } from './media-library';

describe('media details changes', () => {
  it('sends an emptied description as null, so the old one is removed', () => {
    const body = mediaDetailsChanges(
      { altText: 'A smiling programme lead' },
      { altText: '   ', folder: 'team', tags: ['portrait'] },
    );
    expect(JSON.parse(JSON.stringify(body))).toEqual({
      altText: null,
      folder: 'team',
      tags: ['portrait'],
    });
  });

  it('leaves the description out when there was none to remove', () => {
    const body = mediaDetailsChanges({}, { altText: '', folder: 'site', tags: [] });
    expect(body).toEqual({ folder: 'site', tags: [] });
    expect(body).not.toHaveProperty('altText');
  });

  it('sends a new description trimmed', () => {
    expect(
      mediaDetailsChanges(
        { altText: 'Old words' },
        { altText: '  Graduates at the Accra hub ', folder: 'gallery', tags: [] },
      ),
    ).toEqual({ altText: 'Graduates at the Accra hub', folder: 'gallery', tags: [] });
  });
});

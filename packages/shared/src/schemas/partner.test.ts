import { describe, expect, it } from 'vitest';

import { partnerInputSchema, partnerUpdateSchema } from './partner.js';

const partner = {
  name: 'Acme Foundation',
  logo: { url: 'https://res.cloudinary.com/demo/image/upload/acme.png', publicId: 'acme' },
};

describe('a partner’s website', () => {
  // The admin form submits '' for an emptied field; refusing it as an invalid
  // URL blocked the edit before the removal could be sent.
  it('reads an emptied website as none', () => {
    const parsed = partnerInputSchema.parse({ ...partner, websiteUrl: '' });
    expect(parsed.websiteUrl).toBeUndefined();
    expect(partnerUpdateSchema.parse({ websiteUrl: '' })).toEqual({});
  });

  it('keeps a real website and still refuses one that is not a URL', () => {
    expect(partnerInputSchema.parse({ ...partner, websiteUrl: 'https://acme.org' })).toMatchObject({
      websiteUrl: 'https://acme.org',
    });
    expect(partnerInputSchema.safeParse({ ...partner, websiteUrl: 'acme' }).success).toBe(false);
  });
});

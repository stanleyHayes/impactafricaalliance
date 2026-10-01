import { describe, expect, it } from 'vitest';

import { jobInputSchema, jobUpdateSchema } from './job.js';

const job = {
  title: 'Programme Manager',
  slug: 'programme-manager',
  location: 'Accra, Ghana',
  type: 'full-time',
  description: 'Lead the delivery of our flagship programme.',
};

describe('a job’s apply link', () => {
  // The admin form submits '' for an emptied field; refusing it as an invalid
  // URL blocked the edit before the removal could be sent.
  it('reads an emptied link as none', () => {
    const parsed = jobInputSchema.parse({ ...job, applyUrl: '' });
    expect(parsed.applyUrl).toBeUndefined();
    expect(jobUpdateSchema.parse({ applyUrl: '' })).toEqual({});
  });

  it('keeps a real link and still refuses one that is not a URL', () => {
    expect(jobInputSchema.parse({ ...job, applyUrl: 'https://example.org/apply' })).toMatchObject({
      applyUrl: 'https://example.org/apply',
    });
    expect(jobInputSchema.safeParse({ ...job, applyUrl: 'apply here' }).success).toBe(false);
  });
});

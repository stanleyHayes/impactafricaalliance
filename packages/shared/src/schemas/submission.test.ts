import { describe, expect, it } from 'vitest';

import { SubmissionType } from '../enums.js';

import { submissionSchema, subscribeSchema } from './submission.js';

describe('submissionSchema', () => {
  it('accepts a valid contact submission and normalises the email', () => {
    const result = submissionSchema.safeParse({
      type: SubmissionType.Contact,
      name: 'Ama Asante',
      email: 'AMA@Example.COM',
      subject: 'Hello',
      message: 'I would love to learn more about your programs.',
      consent: true,
      consentVersion: '2026-07',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ama@example.com');
    }
  });

  it('rejects a partner submission missing the organisation name', () => {
    const result = submissionSchema.safeParse({
      type: SubmissionType.Partner,
      name: 'Kwame',
      email: 'kwame@example.com',
      country: 'Ghana',
      partnershipInterest: 'Funding',
      message: 'We would like to co-fund a cohort.',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unknown submission type', () => {
    const result = submissionSchema.safeParse({ type: 'spam', email: 'x@y.com' });
    expect(result.success).toBe(false);
  });
});

describe('subscribeSchema', () => {
  it('requires a valid email', () => {
    expect(subscribeSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    expect(
      subscribeSchema.safeParse({ email: 'reader@iaa.org', consent: true, consentVersion: '2026-07' }).success,
    ).toBe(true);
  });
});

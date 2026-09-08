import { describe, expect, it } from 'vitest';

import {
  eventReviewInputSchema,
  MIN_RATINGS_FOR_AVERAGE,
  organisationReviewInputSchema,
  ratingAverage,
  ratingSummary,
} from './review.js';

describe('the rating average', () => {
  it('is withheld below the threshold', () => {
    expect(ratingAverage([5])).toBeUndefined();
    expect(ratingAverage(Array(MIN_RATINGS_FOR_AVERAGE - 1).fill(5))).toBeUndefined();
  });

  it('appears once there are enough, rounded to one place', () => {
    expect(ratingAverage([5, 4, 4])).toBe(4.3);
  });

  it('counts how many gave each star', () => {
    expect(ratingSummary([5, 5, 4, 1]).distribution).toEqual([1, 0, 0, 1, 2]);
  });
});

describe('what a review will accept', () => {
  it('refuses a rating outside one to five', () => {
    const base = { token: 'x'.repeat(20), displayName: 'Ama' };
    expect(eventReviewInputSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(eventReviewInputSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(eventReviewInputSchema.safeParse({ ...base, rating: 4.5 }).success).toBe(false);
    expect(eventReviewInputSchema.safeParse({ ...base, rating: 4 }).success).toBe(true);
  });

  it('treats an empty comment as no comment', () => {
    const parsed = eventReviewInputSchema.parse({
      token: 'x'.repeat(20),
      displayName: 'Ama',
      rating: 5,
      comment: '   ',
    });

    // Otherwise the site renders an empty paragraph under someone's name.
    expect(parsed.comment).toBeUndefined();
  });

  it('will not take an organisation review without agreement', () => {
    const base = { email: 'a@b.com', rating: 5, displayName: 'Ama' };
    expect(organisationReviewInputSchema.safeParse(base).success).toBe(false);
    expect(organisationReviewInputSchema.safeParse({ ...base, consent: true }).success).toBe(true);
  });

  it('lower-cases the address so one person cannot review twice', () => {
    const parsed = organisationReviewInputSchema.parse({
      email: 'Ama@Example.COM',
      rating: 5,
      displayName: 'Ama',
      consent: true,
    });

    expect(parsed.email).toBe('ama@example.com');
  });
});

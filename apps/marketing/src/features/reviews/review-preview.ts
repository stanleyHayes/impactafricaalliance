import type { PublicReview, RatingSummary } from '@iaa/shared';

/** Fictional UI examples. Never seed or submit these to the API. */
export const previewReviews: PublicReview[] = [
  {
    id: 'demo-1',
    subject: 'organisation',
    rating: 5,
    displayName: 'Ama K. (sample)',
    role: 'Programme participant',
    comment:
      'The practical sessions gave me the confidence to put my new skills to work. Having someone explain each step made all the difference.',
    attended: false,
    submittedAt: '2026-09-08T10:00:00Z',
  },
  {
    id: 'demo-2',
    subject: 'organisation',
    rating: 4,
    displayName: 'Daniel O. (sample)',
    role: 'Community partner',
    comment:
      'A thoughtful team and a well-organised programme. I would love to see more time for questions in the next workshop.',
    attended: false,
    submittedAt: '2026-09-07T10:00:00Z',
  },
  {
    id: 'demo-3',
    subject: 'organisation',
    rating: 5,
    displayName: 'Mariama S. (sample)',
    role: 'Volunteer',
    comment:
      'I felt supported from the first day. It was rewarding to work alongside people who care about their communities.',
    attended: false,
    submittedAt: '2026-09-06T10:00:00Z',
  },
];
export const previewSummary: RatingSummary = {
  count: 3,
  average: 4.7,
  distribution: [0, 0, 0, 1, 2],
};

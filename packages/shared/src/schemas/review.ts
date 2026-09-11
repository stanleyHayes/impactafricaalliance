import { z } from 'zod';

/**
 * Reviews come in two kinds, and the difference is how we know the person is
 * real. An event review is anchored to a registration, so the token in their
 * follow-up email proves they were there. An organisation review has nothing
 * behind it, so the address is confirmed before the words go anywhere.
 */
export const REVIEW_SUBJECTS = ['event', 'organisation'] as const;
export type ReviewSubject = (typeof REVIEW_SUBJECTS)[number];

export const REVIEW_STATUSES = ['pending', 'published', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Nothing is shown until someone approves it, so this is the resting state. */
export const REVIEW_INITIAL_STATUS: ReviewStatus = 'pending';

/**
 * An average built on one or two opinions describes the reviewer, not the
 * work. Below this the count is shown and the average is withheld.
 */
export const MIN_RATINGS_FOR_AVERAGE = 3;

const rating = z
  .number()
  .int('Choose a whole number of stars')
  .min(1, 'Choose at least one star')
  .max(5, 'Five stars is the most');

const comment = z
  .string()
  .max(2000, 'Please keep it under 2000 characters')
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const displayName = z
  .string()
  .min(2, 'Please give a name to show')
  .max(80, 'That name is too long')
  .trim();

/** What an attendee submits from the link in their follow-up email. */
export const eventReviewInputSchema = z.object({
  token: z.string().min(16, 'This review link is not valid'),
  rating,
  comment,
  displayName,
});
export type EventReviewInput = z.infer<typeof eventReviewInputSchema>;

/** What anyone submits about the organisation, before their address is confirmed. */
export const organisationReviewInputSchema = z.object({
  email: z.string().email('Enter an email we can confirm this with').max(200).toLowerCase().trim(),
  rating,
  comment,
  displayName,
  /** Optional context — "Partner", "Cohort 3", "Volunteer". */
  role: z.string().max(80).trim().optional(),
  consent: z.literal(true, { message: 'Please agree before submitting' }),
});
export type OrganisationReviewInput = z.infer<typeof organisationReviewInputSchema>;

/**
 * What someone sends when they want their own review link again.
 *
 * The link is the only way to the form, so an attendee who deleted the email
 * would otherwise have no way in.
 */
export const reviewLinkRequestSchema = z.object({
  email: z.string().email('Enter the email you registered with').max(200).toLowerCase().trim(),
});
export type ReviewLinkRequest = z.infer<typeof reviewLinkRequestSchema>;

export const reviewModerationSchema = z.object({
  status: z.enum(['published', 'rejected']),
  /** Shown to nobody but the team; it explains the decision to the next reader. */
  rejectionReason: z.string().max(500).trim().optional(),
});
export type ReviewModeration = z.infer<typeof reviewModerationSchema>;

/** A review as the public sees it. No address, ever. */
export interface PublicReview {
  id: string;
  subject: ReviewSubject;
  eventId?: string;
  eventTitle?: string;
  rating: number;
  comment?: string;
  displayName: string;
  role?: string;
  /** True when the person held a registration for the event they reviewed. */
  attended: boolean;
  submittedAt: string;
}

/** A review as the console sees it, with everything moderation needs. */
export interface AdminReview extends PublicReview {
  email: string;
  status: ReviewStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingSummary {
  count: number;
  /** Withheld until there are enough to mean something. */
  average?: number;
  /** How many gave each of 1-5 stars, in that order. */
  distribution: number[];
}

/**
 * The average, or nothing.
 *
 * Returning undefined rather than a number is deliberate: it forces the caller
 * to say "3 ratings" instead of quietly printing a one-star average that one
 * unhappy person decided.
 */
export const ratingAverage = (ratings: readonly number[]): number | undefined => {
  if (ratings.length < MIN_RATINGS_FOR_AVERAGE) return undefined;
  const total = ratings.reduce((sum, value) => sum + value, 0);
  return Math.round((total / ratings.length) * 10) / 10;
};

export const ratingSummary = (ratings: readonly number[]): RatingSummary => ({
  count: ratings.length,
  average: ratingAverage(ratings),
  distribution: [1, 2, 3, 4, 5].map(
    (star) => ratings.filter((value) => Math.round(value) === star).length,
  ),
});

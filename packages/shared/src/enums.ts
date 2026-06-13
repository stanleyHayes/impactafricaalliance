/**
 * Domain enumerations shared by the API and both front-ends.
 * Declared as frozen const objects (not TS `enum`) so they tree-shake cleanly
 * and serialise as plain strings across the HTTP boundary.
 */

export const UserRole = {
  Admin: 'admin',
  Editor: 'editor',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const USER_ROLES = Object.values(UserRole);

export const ContentStatus = {
  Draft: 'draft',
  Published: 'published',
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];
export const CONTENT_STATUSES = Object.values(ContentStatus);

export const TeamTier = {
  Leadership: 'leadership',
  Advisory: 'advisory',
  Country: 'country',
} as const;
export type TeamTier = (typeof TeamTier)[keyof typeof TeamTier];
export const TEAM_TIERS = Object.values(TeamTier);

export const JobType = {
  FullTime: 'full-time',
  PartTime: 'part-time',
  Remote: 'remote',
  Internship: 'internship',
  Fellowship: 'fellowship',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];
export const JOB_TYPES = Object.values(JobType);

export const SubmissionType = {
  Contact: 'contact',
  Partner: 'partner',
  Volunteer: 'volunteer',
} as const;
export type SubmissionType = (typeof SubmissionType)[keyof typeof SubmissionType];
export const SUBMISSION_TYPES = Object.values(SubmissionType);

export const SubmissionStatus = {
  New: 'new',
  Read: 'read',
  Archived: 'archived',
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];
export const SUBMISSION_STATUSES = Object.values(SubmissionStatus);

export const PaymentProvider = {
  Stripe: 'stripe',
  Paystack: 'paystack',
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];
export const PAYMENT_PROVIDERS = Object.values(PaymentProvider);

export const DonationStatus = {
  Pending: 'pending',
  Succeeded: 'succeeded',
  Failed: 'failed',
} as const;
export type DonationStatus = (typeof DonationStatus)[keyof typeof DonationStatus];
export const DONATION_STATUSES = Object.values(DonationStatus);

export const DonationFrequency = {
  OneTime: 'one-time',
  Monthly: 'monthly',
} as const;
export type DonationFrequency = (typeof DonationFrequency)[keyof typeof DonationFrequency];
export const DONATION_FREQUENCIES = Object.values(DonationFrequency);

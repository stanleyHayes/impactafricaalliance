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

export const PermissionAction = {
  Read: 'read',
  Update: 'update',
  Create: 'create',
  Delete: 'delete',
} as const;
export type PermissionAction = (typeof PermissionAction)[keyof typeof PermissionAction];
export const PERMISSION_ACTIONS = Object.values(PermissionAction);

export const AdminResource = {
  Articles: 'articles',
  Stories: 'stories',
  Team: 'team',
  Partners: 'partners',
  Reports: 'reports',
  Jobs: 'jobs',
  Events: 'events',
  Gallery: 'gallery',
  Stats: 'stats',
  PageSettings: 'page-settings',
  Submissions: 'submissions',
  Subscribers: 'subscribers',
  Donations: 'donations',
  PrivacyRequests: 'privacy-requests',
  SiteSettings: 'site-settings',
  Media: 'media',
  Users: 'users',
  Roles: 'roles',
} as const;
export type AdminResource = (typeof AdminResource)[keyof typeof AdminResource];
export const ADMIN_RESOURCES = Object.values(AdminResource);

export type Permission = `${AdminResource}:${PermissionAction}`;

const allPermissions = (): Permission[] =>
  ADMIN_RESOURCES.flatMap((resource) =>
    PERMISSION_ACTIONS.map((action) => `${resource}:${action}` as Permission),
  );

export const ALL_PERMISSIONS = allPermissions();

const editorPermissions = (): Permission[] => {
  const read = ADMIN_RESOURCES.map((resource) => `${resource}:read` as Permission);
  const writeResources: AdminResource[] = [
    AdminResource.Articles,
    AdminResource.Stories,
    AdminResource.Team,
    AdminResource.Partners,
    AdminResource.Reports,
    AdminResource.Jobs,
    AdminResource.Events,
    AdminResource.Gallery,
    AdminResource.Stats,
    AdminResource.PageSettings,
    AdminResource.Submissions,
    AdminResource.Subscribers,
    AdminResource.PrivacyRequests,
    AdminResource.SiteSettings,
    AdminResource.Media,
  ];
  const createUpdate = writeResources.flatMap((resource) => [
    `${resource}:create` as Permission,
    `${resource}:update` as Permission,
  ]);
  return [...read, ...createUpdate];
};

export const ROLE_TEMPLATES: Record<UserRole, Permission[]> = {
  [UserRole.Admin]: allPermissions(),
  [UserRole.Editor]: editorPermissions(),
};

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
  Job: 'job',
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

export const EventType = {
  Webinar: 'webinar',
  CohortLaunch: 'cohort-launch',
  PartnerForum: 'partner-forum',
  CommunityEvent: 'community-event',
  Other: 'other',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];
export const EVENT_TYPES = Object.values(EventType);

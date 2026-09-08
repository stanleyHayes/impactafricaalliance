import type { PaymentSettingsStatus } from './payment-settings.js';

export interface DashboardCountEntry {
  key: string;
  count: number;
}

export interface DashboardDonationMonth {
  /** `YYYY-MM` bucket label. */
  month: string;
  amountUsd: number;
  count: number;
}

/**
 * The content collections the dashboard counts, in the order it shows them.
 *
 * Shared so the API and the console agree on how many rows there are. The
 * console draws that many placeholders while the summary loads, and a list
 * that only lived on the server meant the loading state guessed — and guessed
 * half of them.
 */
export const DASHBOARD_CONTENT_COLLECTIONS = [
  { key: 'articles', label: 'Articles' },
  { key: 'stories', label: 'Stories' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'reports', label: 'Reports' },
  { key: 'events', label: 'Events' },
  { key: 'team', label: 'Team' },
  { key: 'partners', label: 'Partners' },
  { key: 'stats', label: 'Impact stats' },
] as const;

export type DashboardContentKey = (typeof DASHBOARD_CONTENT_COLLECTIONS)[number]['key'];

export interface DashboardContentEntry {
  key: string;
  label: string;
  total: number;
  published: number;
}

/**
 * Aggregated overview for the admin dashboard. Computed server-side so KPIs
 * stay accurate regardless of how large the underlying collections grow.
 */
export interface DashboardSummary {
  submissions: {
    total: number;
    newCount: number;
    byType: DashboardCountEntry[];
    byStatus: DashboardCountEntry[];
  };
  subscribers: {
    total: number;
    newLast30Days: number;
  };
  donations: {
    totalRaisedUsd: number;
    succeededCount: number;
    pendingCount: number;
    failedCount: number;
    /** Amount raised (USD, succeeded only) per provider. */
    byProvider: { stripe: number; paystack: number };
    /** Succeeded donations bucketed by month, oldest first (last 6 months). */
    monthly: DashboardDonationMonth[];
  };
  content: DashboardContentEntry[];
  events: { total: number; upcoming: number };
  users: number;
  privacyRequests: { total: number; open: number };
  socialConnections: number;
  payments: PaymentSettingsStatus;
}

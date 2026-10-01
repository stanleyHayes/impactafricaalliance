import type { PaymentSettingsStatus } from './payment-settings.js';
import type { MoneyAmount } from './payment.js';

export interface DashboardCountEntry {
  key: string;
  count: number;
}

export interface DashboardDonationMonth {
  /** `YYYY-MM` bucket label. */
  month: string;
  /** Completed gifts that month, in any currency. */
  count: number;
  /** Raised that month, one entry per currency that had gifts; empty for a quiet month. */
  raised: MoneyAmount[];
}

/** Completed gifts through one provider. */
export interface DashboardProviderDonations {
  count: number;
  /** One entry per currency, cedis before dollars. */
  raised: MoneyAmount[];
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
    /**
     * Raised from succeeded gifts, one entry per currency (cedis before dollars),
     * never summed across currencies; empty until a gift succeeds.
     */
    raised: MoneyAmount[];
    succeededCount: number;
    pendingCount: number;
    failedCount: number;
    /** Succeeded gifts per provider. */
    byProvider: { stripe: DashboardProviderDonations; paystack: DashboardProviderDonations };
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

import { z } from 'zod';

/**
 * What the browser is allowed to tell us about a visit.
 *
 * Everything else — country, device, the visitor hash — is derived on the
 * server from headers the page cannot forge, so a beacon cannot inflate the
 * figures with a country it made up.
 */
export const pageViewInputSchema = z.object({
  path: z.string().min(1).max(300),
  /** Full referrer URL; only its host is kept. */
  referrer: z.string().max(500).optional(),
});
export type PageViewInput = z.infer<typeof pageViewInputSchema>;

export const DEVICE_KINDS = ['mobile', 'tablet', 'desktop'] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

export interface AnalyticsBucket {
  key: string;
  label: string;
  count: number;
}

/** One day of traffic, for the trend chart. */
export interface AnalyticsDay {
  date: string;
  views: number;
  visitors: number;
}

export interface AnalyticsSummary {
  /** Days covered, counting back from today. */
  days: number;
  totalViews: number;
  totalVisitors: number;
  countryCount: number;
  daily: AnalyticsDay[];
  byCountry: AnalyticsBucket[];
  byDevice: AnalyticsBucket[];
  /** Views per hour of the day, 0–23 UTC. Always 24 entries. */
  byHour: AnalyticsBucket[];
  topPages: AnalyticsBucket[];
  topReferrers: AnalyticsBucket[];
}

/**
 * The figures the public reach card is allowed to show.
 *
 * Deliberately narrower than the admin summary: which pages people read and
 * where they arrived from is the organisation's business, not the visitor's.
 */
export interface PublicReachSummary {
  days: number;
  totalViews: number;
  totalVisitors: number;
  countryCount: number;
  topCountries: AnalyticsBucket[];
  daily: AnalyticsDay[];
  /** When the figures were assembled, so a shared card can date itself. */
  generatedAt: string;
}

/** ISO-3166 alpha-2 to a readable name, for the countries we actually see. */
export const countryName = (code: string): string => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

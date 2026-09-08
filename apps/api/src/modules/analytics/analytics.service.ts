import { createHash } from 'node:crypto';

import {
  countryName,
  type AnalyticsBucket,
  type AnalyticsDay,
  type AnalyticsSummary,
  type DeviceKind,
  type PageViewInput,
  type PublicReachSummary,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

import { PageViewModel } from './page-view.model.js';

/** What the caller knows about the request that the body cannot be trusted for. */
export interface VisitContext {
  ip?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
}

const MAX_PATH = 300;

/** Query strings carry campaign tags and, occasionally, someone's email. */
const cleanPath = (path: string): string => {
  const withoutQuery = path.split(/[?#]/)[0] ?? '/';
  const normalised = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return normalised.length > MAX_PATH ? normalised.slice(0, MAX_PATH) : normalised;
};

/** Only the host: which site sent them, never the page they came from. */
const referrerHost = (referrer: string | undefined, siteUrl: string): string | undefined => {
  if (!referrer) return undefined;
  const match = /^https?:\/\/([^/?#]+)/i.exec(referrer.trim());
  const host = match?.[1]?.toLowerCase().replace(/^www\./, '');
  if (!host) return undefined;
  // Moving between our own pages is navigation, not a referral.
  const ownHost = /^https?:\/\/([^/?#]+)/i.exec(siteUrl)?.[1]?.toLowerCase().replace(/^www\./, '');
  return host === ownHost ? undefined : host;
};

const deviceOf = (userAgent: string): DeviceKind => {
  if (/\b(ipad|tablet|playbook|silk)\b/i.test(userAgent)) return 'tablet';
  if (/android(?!.*mobile)/i.test(userAgent)) return 'tablet';
  if (/\b(mobi|iphone|ipod|android|blackberry|windows phone)\b/i.test(userAgent)) return 'mobile';
  return 'desktop';
};

/** Order matters: Edge and Chromium both claim to be Chrome. */
const BROWSERS: ReadonlyArray<[RegExp, string]> = [
  [/\bedg[ea]?\//i, 'Edge'],
  [/\bopr\/|\bopera\b/i, 'Opera'],
  [/\bsamsungbrowser\//i, 'Samsung Internet'],
  [/\bfirefox\//i, 'Firefox'],
  [/\bchrome\/|\bcriOS\//i, 'Chrome'],
  [/\bsafari\//i, 'Safari'],
];

const OPERATING_SYSTEMS: ReadonlyArray<[RegExp, string]> = [
  [/\bandroid\b/i, 'Android'],
  [/\b(iphone|ipad|ipod|ios)\b/i, 'iOS'],
  [/\bmac os x\b/i, 'macOS'],
  [/\bwindows\b/i, 'Windows'],
  [/\blinux\b/i, 'Linux'],
];

const firstMatch = (table: ReadonlyArray<[RegExp, string]>, value: string): string | undefined =>
  table.find(([pattern]) => pattern.test(value))?.[1];

const startOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dayKey = (date: Date): string => startOfDayUtc(date).toISOString().slice(0, 10);

@injectable()
export class AnalyticsService {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  /**
   * Counts one visitor once per day without being able to say who they are.
   *
   * The address and agent go in, a digest comes out, and the calendar day is
   * part of the input — so the same person on two days produces two unrelated
   * values, and nothing here can be walked backwards to a person.
   */
  private visitorHash(context: VisitContext, now: Date): string {
    return createHash('sha256')
      .update(this.config.jwt.accessSecret)
      .update('|analytics|')
      .update(context.ip ?? 'unknown')
      .update(context.userAgent ?? 'unknown')
      .update(dayKey(now))
      .digest('hex')
      .slice(0, 32);
  }

  async record(input: PageViewInput, context: VisitContext, now = new Date()): Promise<void> {
    const userAgent = context.userAgent ?? '';
    await PageViewModel.create({
      path: cleanPath(input.path),
      referrerHost: referrerHost(input.referrer, this.config.siteUrl),
      country: context.country?.toUpperCase(),
      region: context.region,
      city: context.city,
      device: deviceOf(userAgent),
      browser: firstMatch(BROWSERS, userAgent),
      os: firstMatch(OPERATING_SYSTEMS, userAgent),
      visitorHash: this.visitorHash(context, now),
      occurredAt: now,
      hourUtc: now.getUTCHours(),
    });
  }

  /** Groups one field, biggest first, with the visitor count where asked for. */
  private async bucket(
    since: Date,
    field: string,
    limit: number,
    label: (key: string) => string = (key) => key,
  ): Promise<AnalyticsBucket[]> {
    const rows = await PageViewModel.aggregate<{ _id: string | null; count: number }>([
      { $match: { occurredAt: { $gte: since }, [field]: { $nin: [null, ''] } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
    ]).exec();
    return rows
      .filter((row): row is { _id: string; count: number } => typeof row._id === 'string')
      .map((row) => ({ key: row._id, label: label(row._id), count: row.count }));
  }

  /** Every day in the window, including the quiet ones, so the chart has no gaps. */
  private async dailySeries(since: Date, days: number, now: Date): Promise<AnalyticsDay[]> {
    const rows = await PageViewModel.aggregate<{
      _id: string;
      views: number;
      visitors: string[];
    }>([
      { $match: { occurredAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: 'UTC' } },
          views: { $sum: 1 },
          visitors: { $addToSet: '$visitorHash' },
        },
      },
    ]).exec();

    const byDate = new Map(rows.map((row) => [row._id, row]));
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(startOfDayUtc(now).getTime() - (days - 1 - index) * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      const row = byDate.get(key);
      return { date: key, views: row?.views ?? 0, visitors: row?.visitors.length ?? 0 };
    });
  }

  private windowStart(days: number, now: Date): Date {
    return new Date(startOfDayUtc(now).getTime() - (days - 1) * 86_400_000);
  }

  private async totals(since: Date): Promise<{ views: number; visitors: number }> {
    const [row] = await PageViewModel.aggregate<{ views: number; visitors: string[] }>([
      { $match: { occurredAt: { $gte: since } } },
      { $group: { _id: null, views: { $sum: 1 }, visitors: { $addToSet: '$visitorHash' } } },
    ]).exec();
    return { views: row?.views ?? 0, visitors: row?.visitors.length ?? 0 };
  }

  /** Twenty-four entries whatever the data says, so the shape reads as a day. */
  private async hourly(since: Date): Promise<AnalyticsBucket[]> {
    const rows = await PageViewModel.aggregate<{ _id: number; count: number }>([
      { $match: { occurredAt: { $gte: since } } },
      { $group: { _id: '$hourUtc', count: { $sum: 1 } } },
    ]).exec();
    const byHour = new Map(rows.map((row) => [row._id, row.count]));
    return Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour),
      label: `${String(hour).padStart(2, '0')}:00`,
      count: byHour.get(hour) ?? 0,
    }));
  }

  async summary(days = 30, now = new Date()): Promise<AnalyticsSummary> {
    const since = this.windowStart(days, now);
    const [totals, daily, byCountry, byDevice, byHour, topPages, topReferrers] = await Promise.all([
      this.totals(since),
      this.dailySeries(since, days, now),
      this.bucket(since, 'country', 12, countryName),
      this.bucket(since, 'device', 3),
      this.hourly(since),
      this.bucket(since, 'path', 10),
      this.bucket(since, 'referrerHost', 8),
    ]);
    const allCountries = await PageViewModel.distinct('country', {
      occurredAt: { $gte: since },
      country: { $nin: [null, ''] },
    }).exec();

    return {
      days,
      totalViews: totals.views,
      totalVisitors: totals.visitors,
      countryCount: allCountries.length,
      daily,
      byCountry,
      byDevice,
      byHour,
      topPages,
      topReferrers,
    };
  }

  /**
   * The figures the public card may show. Pages and referrers are left out on
   * purpose — reach is the organisation's story to tell, but what an individual
   * reader looked at is not part of it.
   */
  async publicReach(days = 30, now = new Date()): Promise<PublicReachSummary> {
    const since = this.windowStart(days, now);
    const [totals, daily, topCountries] = await Promise.all([
      this.totals(since),
      this.dailySeries(since, days, now),
      this.bucket(since, 'country', 6, countryName),
    ]);
    const allCountries = await PageViewModel.distinct('country', {
      occurredAt: { $gte: since },
      country: { $nin: [null, ''] },
    }).exec();

    return {
      days,
      totalViews: totals.views,
      totalVisitors: totals.visitors,
      countryCount: allCountries.length,
      topCountries,
      daily,
      generatedAt: now.toISOString(),
    };
  }
}

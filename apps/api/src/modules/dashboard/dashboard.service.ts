import { DASHBOARD_CONTENT_COLLECTIONS } from '@iaa/shared';
import type {
  DashboardContentEntry,
  DashboardContentKey,
  DashboardDonationMonth,
  DashboardSummary,
} from '@iaa/shared';
import type { Model } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { ArticleModel } from '../content/models/article.model.js';
import { EventModel } from '../content/models/event.model.js';
import { JobModel } from '../content/models/job.model.js';
import { PartnerModel } from '../content/models/partner.model.js';
import { ReportModel } from '../content/models/report.model.js';
import { ImpactStatModel } from '../content/models/stat.model.js';
import { StoryModel } from '../content/models/story.model.js';
import { TeamMemberModel } from '../content/models/team.model.js';
import { DonationModel } from '../payments/donation.model.js';
import { PaymentSettingsService } from '../payments/payment-settings.service.js';
import { PrivacyRequestModel } from '../privacy/privacy-request.model.js';
import { SocialAccountModel } from '../social/social-account.model.js';
import { SubmissionModel, SubscriberModel } from '../submissions/submission.model.js';
import { UserModel } from '../users/user.model.js';

const MONTHS_LOOKBACK = 6;

interface ContentSource {
  model: Model<unknown>;
  /** `status: 'published'` collections vs `isActive` collections. */
  liveFilter: Record<string, unknown>;
}

const PUBLISHED = { status: 'published' };
const ACTIVE = { isActive: true };

/**
 * Where each collection's counts come from. The keys, labels and order live in
 * DASHBOARD_CONTENT_COLLECTIONS so the console knows how many rows to expect
 * while this is loading; only the model and the "is it live" filter are
 * server-side, because neither can leave the API.
 */
const CONTENT_SOURCES: Record<DashboardContentKey, ContentSource> = {
  articles: { model: ArticleModel, liveFilter: PUBLISHED },
  stories: { model: StoryModel, liveFilter: PUBLISHED },
  jobs: { model: JobModel, liveFilter: PUBLISHED },
  reports: { model: ReportModel, liveFilter: PUBLISHED },
  events: { model: EventModel, liveFilter: PUBLISHED },
  team: { model: TeamMemberModel, liveFilter: ACTIVE },
  partners: { model: PartnerModel, liveFilter: ACTIVE },
  stats: { model: ImpactStatModel, liveFilter: ACTIVE },
};

const monthBucketStart = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_LOOKBACK - 1), 1));

const monthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/** Builds the `YYYY-MM` labels for the lookback window, oldest first. */
const buildMonthLabels = (now: Date): string[] =>
  Array.from({ length: MONTHS_LOOKBACK }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_LOOKBACK - 1) + index, 1),
    );
    return monthKey(date);
  });

/**
 * Server-side aggregates for the admin dashboard. One round-trip per concern,
 * all keyed off MongoDB counts/aggregations so the numbers stay exact as data grows.
 */
@injectable()
export class DashboardService {
  constructor(
    @inject(PaymentSettingsService) private readonly paymentSettings: PaymentSettingsService,
  ) {}

  async summary(): Promise<DashboardSummary> {
    const now = new Date();
    const [submissions, subscribers, donations, content, events, users, privacy, social, payments] =
      await Promise.all([
        this.submissionStats(),
        this.subscriberStats(now),
        this.donationStats(now),
        this.contentStats(),
        this.eventStats(now),
        UserModel.countDocuments().exec(),
        this.privacyStats(),
        SocialAccountModel.countDocuments().exec(),
        this.paymentSettings.getStatus(),
      ]);

    return {
      submissions,
      subscribers,
      donations,
      content,
      events,
      users,
      privacyRequests: privacy,
      socialConnections: social,
      payments,
    };
  }

  private async submissionStats(): Promise<DashboardSummary['submissions']> {
    const [total, newCount, byType, byStatus] = await Promise.all([
      SubmissionModel.countDocuments().exec(),
      SubmissionModel.countDocuments({ status: 'new' }).exec(),
      SubmissionModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]).exec(),
      SubmissionModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
    ]);
    return {
      total,
      newCount,
      byType: byType.map((entry) => ({ key: entry._id, count: entry.count })),
      byStatus: byStatus.map((entry) => ({ key: entry._id, count: entry.count })),
    };
  }

  private async subscriberStats(now: Date): Promise<DashboardSummary['subscribers']> {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeFilter = { unsubscribedAt: null };
    const [total, newLast30Days] = await Promise.all([
      SubscriberModel.countDocuments(activeFilter).exec(),
      SubscriberModel.countDocuments({ ...activeFilter, createdAt: { $gte: thirtyDaysAgo } }).exec(),
    ]);
    return { total, newLast30Days };
  }

  private async donationStats(now: Date): Promise<DashboardSummary['donations']> {
    const [totals, byProvider, monthly] = await Promise.all([
      DonationModel.aggregate<{ _id: string; amount: number; count: number }>([
        { $group: { _id: '$status', amount: { $sum: '$amountUsd' }, count: { $sum: 1 } } },
      ]).exec(),
      DonationModel.aggregate<{ _id: string; amount: number }>([
        { $match: { status: 'succeeded' } },
        { $group: { _id: '$provider', amount: { $sum: '$amountUsd' } } },
      ]).exec(),
      DonationModel.aggregate<{ _id: string; amount: number; count: number }>([
        { $match: { status: 'succeeded', createdAt: { $gte: monthBucketStart(now) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            amount: { $sum: '$amountUsd' },
            count: { $sum: 1 },
          },
        },
      ]).exec(),
    ]);

    const statusOf = (status: string) => totals.find((entry) => entry._id === status);
    const providerAmount = (provider: string) =>
      byProvider.find((entry) => entry._id === provider)?.amount ?? 0;

    const monthlyMap = new Map(monthly.map((entry) => [entry._id, entry]));
    const monthlyBuckets: DashboardDonationMonth[] = buildMonthLabels(now).map((label) => ({
      month: label,
      amountUsd: monthlyMap.get(label)?.amount ?? 0,
      count: monthlyMap.get(label)?.count ?? 0,
    }));

    return {
      totalRaisedUsd: statusOf('succeeded')?.amount ?? 0,
      succeededCount: statusOf('succeeded')?.count ?? 0,
      pendingCount: statusOf('pending')?.count ?? 0,
      failedCount: statusOf('failed')?.count ?? 0,
      byProvider: { stripe: providerAmount('stripe'), paystack: providerAmount('paystack') },
      monthly: monthlyBuckets,
    };
  }

  private async contentStats(): Promise<DashboardContentEntry[]> {
    return Promise.all(
      DASHBOARD_CONTENT_COLLECTIONS.map(async ({ key, label }) => {
        const source = CONTENT_SOURCES[key];
        const [total, published] = await Promise.all([
          source.model.countDocuments().exec(),
          source.model.countDocuments(source.liveFilter).exec(),
        ]);
        return { key, label, total, published };
      }),
    );
  }

  private async eventStats(now: Date): Promise<DashboardSummary['events']> {
    const [total, upcoming] = await Promise.all([
      EventModel.countDocuments().exec(),
      EventModel.countDocuments({ startAt: { $gte: now } }).exec(),
    ]);
    return { total, upcoming };
  }

  private async privacyStats(): Promise<DashboardSummary['privacyRequests']> {
    const [total, open] = await Promise.all([
      PrivacyRequestModel.countDocuments().exec(),
      PrivacyRequestModel.countDocuments({ status: { $in: ['pending', 'verified'] } }).exec(),
    ]);
    return { total, open };
  }
}

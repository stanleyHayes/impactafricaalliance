import {
  DASHBOARD_CONTENT_COLLECTIONS,
  DonationStatus,
  PaymentProvider,
  sumByCurrency,
} from '@iaa/shared';
import type {
  DashboardContentEntry,
  DashboardContentKey,
  DashboardDonationMonth,
  DashboardProviderDonations,
  DashboardSummary,
  DonationCurrency,
  MoneyAmount,
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
import {
  DONATION_AMOUNT_EXPR,
  DONATION_CURRENCY_EXPR,
  DonationModel,
} from '../payments/donation.model.js';
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

/** Succeeded gifts grouped by something and by currency, summed in pesewas or cents. */
interface DonationGroup<K> {
  _id: K & { currency: DonationCurrency };
  minor: number;
  count: number;
}

const SUM_MINOR_UNITS = { $sum: { $round: [{ $multiply: [DONATION_AMOUNT_EXPR, 100] }, 0] } };

const toMoney = (group: DonationGroup<object>): MoneyAmount => ({
  currency: group._id.currency,
  amount: group.minor / 100,
});

/** One provider's gifts: the count across currencies, and a total per currency. */
const providerDonations = (
  groups: DonationGroup<{ provider: PaymentProvider }>[],
  provider: PaymentProvider,
): DashboardProviderDonations => {
  const mine = groups.filter((group) => group._id.provider === provider);
  return {
    count: mine.reduce((sum, group) => sum + group.count, 0),
    raised: sumByCurrency(mine.map(toMoney)),
  };
};

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
      SubscriberModel.countDocuments({
        ...activeFilter,
        createdAt: { $gte: thirtyDaysAgo },
      }).exec(),
    ]);
    return { total, newLast30Days };
  }

  /**
   * Cedis and dollars are summed apart and never together: there is no rate to
   * convert at, and a total that silently mixed them would be wrong in both.
   */
  private async donationStats(now: Date): Promise<DashboardSummary['donations']> {
    const succeeded = { status: DonationStatus.Succeeded };
    const [statuses, byProvider, monthly] = await Promise.all([
      DonationModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      DonationModel.aggregate<DonationGroup<{ provider: PaymentProvider }>>([
        { $match: succeeded },
        {
          $group: {
            _id: { provider: '$provider', currency: DONATION_CURRENCY_EXPR },
            minor: SUM_MINOR_UNITS,
            count: { $sum: 1 },
          },
        },
      ]).exec(),
      DonationModel.aggregate<DonationGroup<{ month: string }>>([
        { $match: { ...succeeded, createdAt: { $gte: monthBucketStart(now) } } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              currency: DONATION_CURRENCY_EXPR,
            },
            minor: SUM_MINOR_UNITS,
            count: { $sum: 1 },
          },
        },
      ]).exec(),
    ]);

    const countOf = (status: string) => statuses.find((entry) => entry._id === status)?.count ?? 0;
    const monthlyBuckets: DashboardDonationMonth[] = buildMonthLabels(now).map((label) => {
      const groups = monthly.filter((entry) => entry._id.month === label);
      return {
        month: label,
        count: groups.reduce((sum, group) => sum + group.count, 0),
        raised: sumByCurrency(groups.map(toMoney)),
      };
    });

    return {
      raised: sumByCurrency(byProvider.map(toMoney)),
      succeededCount: countOf(DonationStatus.Succeeded),
      pendingCount: countOf(DonationStatus.Pending),
      failedCount: countOf(DonationStatus.Failed),
      byProvider: {
        stripe: providerDonations(byProvider, PaymentProvider.Stripe),
        paystack: providerDonations(byProvider, PaymentProvider.Paystack),
      },
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

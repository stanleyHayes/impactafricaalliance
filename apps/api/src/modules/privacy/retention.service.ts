import { DonationStatus } from '@iaa/shared';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { DonationModel } from '../payments/donation.model.js';
import { SubmissionModel, SubscriberModel } from '../submissions/submission.model.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Lightweight daily retention purge for Ghana DPA compliance.
 * - Deletes archived submissions older than the retention window.
 * - Deletes unsubscribed subscribers older than the retention window.
 * - Deletes failed/pending abandoned donations older than a short window.
 */
export const startRetentionJobs = (config: AppConfig, logger: AppLogger): (() => void) => {
  if (
    config.retention.submissionDays === 0 &&
    config.retention.unsubscribedDays === 0 &&
    config.retention.failedDonationDays === 0
  ) {
    logger.info('Retention jobs disabled (all retention windows set to 0)');
    return () => undefined;
  }

  const run = async (): Promise<void> => {
    const now = Date.now();
    try {
      if (config.retention.submissionDays > 0) {
        const cutoff = new Date(now - config.retention.submissionDays * DAY_MS);
        const { deletedCount } = await SubmissionModel.deleteMany({
          status: 'archived',
          updatedAt: { $lt: cutoff },
        }).exec();
        logger.info({ deletedCount, kind: 'submissions' }, 'Retention purge completed');
      }
      if (config.retention.unsubscribedDays > 0) {
        const cutoff = new Date(now - config.retention.unsubscribedDays * DAY_MS);
        const { deletedCount } = await SubscriberModel.deleteMany({
          unsubscribedAt: { $lt: cutoff },
        }).exec();
        logger.info({ deletedCount, kind: 'subscribers' }, 'Retention purge completed');
      }
      if (config.retention.failedDonationDays > 0) {
        const cutoff = new Date(now - config.retention.failedDonationDays * DAY_MS);
        const { deletedCount } = await DonationModel.deleteMany({
          status: { $in: [DonationStatus.Failed, DonationStatus.Pending] },
          updatedAt: { $lt: cutoff },
        }).exec();
        logger.info({ deletedCount, kind: 'donations' }, 'Retention purge completed');
      }
    } catch (error) {
      logger.error({ err: error }, 'Retention purge failed');
    }
  };

  // Run once shortly after startup, then daily.
  const initial = setTimeout(run, 30_000);
  const interval = setInterval(run, INTERVAL_MS);

  return () => {
    clearTimeout(initial);
    clearInterval(interval);
  };
};

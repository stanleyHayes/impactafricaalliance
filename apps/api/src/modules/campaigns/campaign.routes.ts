import type { Announcement, SitePopup } from '@iaa/shared';
import { Router } from 'express';
import type { Model } from 'mongoose';

import { asyncHandler } from '../../common/async-handler.js';
import { AnnouncementModel } from '../content/models/announcement.model.js';
import { SitePopupModel } from '../content/models/site-popup.model.js';

/**
 * What is live, right now.
 *
 * The window is applied here rather than left to the browser so a banner
 * queued for a date in the future is not readable from the API before that
 * date — a launch announcement is news until it is published, and the CMS
 * list would otherwise hand it to anyone who asked.
 */
const liveFilter = (now: Date) => ({
  isActive: true,
  $and: [
    { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
    { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }] },
  ],
});

/**
 * Highest priority wins, then most recently edited — so promoting one campaign
 * over another is a number rather than switching every other one off, and two
 * left live at once still give one deterministic answer.
 */
const current = async <T>(model: Model<T>, now: Date): Promise<T | null> =>
  model.findOne(liveFilter(now)).sort({ priority: -1, updatedAt: -1 }).exec();

export const createCampaignRouter = (): Router => {
  const router = Router();

  router.get(
    '/announcement',
    asyncHandler(async (_req, res) => {
      const now = new Date();
      // Short cache: a banner switched off should disappear quickly, but this
      // is requested on every page load of every visit.
      res.set('Cache-Control', 'public, max-age=60');
      res.json((await current(AnnouncementModel, now)) as Announcement | null);
    }),
  );

  router.get(
    '/popup',
    asyncHandler(async (_req, res) => {
      const now = new Date();
      res.set('Cache-Control', 'public, max-age=60');
      res.json((await current(SitePopupModel, now)) as SitePopup | null);
    }),
  );

  return router;
};

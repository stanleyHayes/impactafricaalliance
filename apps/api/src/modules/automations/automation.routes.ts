import { timingSafeEqual } from 'node:crypto';

import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { runEventAutomation } from '../event-messages/event-automation.worker.js';
import { runReviewInvites } from '../reviews/review-invite.worker.js';

/**
 * The way the scheduled work actually happens.
 *
 * The API runs on a plan where the instance sleeps after a quiet quarter of an
 * hour, and a sleeping process does not run timers. The first webinar's review
 * invitations were due at 21:00 and never went out for exactly that reason.
 * So the timers stay as a backstop and an outside scheduler knocks here
 * instead, which both runs the work and keeps the instance awake to do it.
 *
 * Guarded by a shared secret rather than a login, because the caller is a cron
 * job with no session. Unset means nobody gets in, including the scheduler —
 * a misconfigured deploy should go quiet, not open.
 */
const constantTimeEquals = (given: string, expected: string): boolean => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * A run sends email one message at a time, so it can outlast the socket
 * timeout the rest of the API is held to. Each invitation is recorded as it is
 * sent, so a run cut short resumes rather than repeating.
 */
const RUN_TIMEOUT_MS = 120_000;

export const createAutomationRouter = (
  container: DependencyContainer,
  config: AppConfig,
  logger: AppLogger,
): Router => {
  const router = Router();

  router.post(
    '/run',
    asyncHandler(async (req, res) => {
      const secret = config.automations.runSecret;
      const given = String(req.header('x-automation-secret') ?? '');
      if (!secret || !constantTimeEquals(given, secret)) {
        // Deliberately says nothing about whether a secret is configured.
        res.status(404).json({ message: 'Not found' });
        return;
      }

      req.setTimeout(RUN_TIMEOUT_MS);
      res.setTimeout(RUN_TIMEOUT_MS);

      const started = Date.now();
      // One failing half must not cost the other: a mail provider that rejects
      // an invitation should not also stop that evening's reminders.
      const [invites, events] = await Promise.all([
        runReviewInvites(container, logger).catch((error: unknown) => {
          logger.error({ err: error }, 'Review invitations failed during a scheduled run');
          return null;
        }),
        runEventAutomation(container, logger).catch((error: unknown) => {
          logger.error({ err: error }, 'Event automation failed during a scheduled run');
          return null;
        }),
      ]);

      const result = {
        ranFor: Date.now() - started,
        reviewInvites: invites,
        eventMessages: events,
      };
      logger.info(result, 'Scheduled automation run finished');
      // 207 when a half failed, so a red run is visible in the scheduler
      // rather than only in a log nobody opens.
      res.status(invites && events ? 200 : 207).json(result);
    }),
  );

  return router;
};

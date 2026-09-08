import { ORG } from '@iaa/shared';
import type { DependencyContainer } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { TOKENS } from '../../tokens.js';
import { EventModel } from '../content/models/event.model.js';
import { EventRegistrationModel } from '../event-registrations/event-registration.model.js';

import { ReviewService } from './review.service.js';

/**
 * Invites attendees to review an event, once it is over.
 *
 * On the same in-process interval as the other background work rather than a
 * scheduler: it runs hourly, does nothing most of the time, and adding cron
 * infrastructure to send a handful of emails a week is not a trade worth
 * making.
 *
 * The invitation is deliberately late enough that the event has actually
 * finished and early enough that people still remember it.
 */
const TICK_MS = 60 * 60_000;
const FIRST_RUN_DELAY_MS = 60_000;

/** How long after an event ends before asking. Long enough to be over, short enough to recall. */
const DELAY_HOURS = 3;
/** Stop asking about events nobody is thinking about any more. */
const GIVE_UP_DAYS = 14;
/** Ceiling per tick, so a backlog cannot monopolise the mail provider. */
const MAX_EVENTS_PER_TICK = 3;

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );

interface Deps {
  config: AppConfig;
  email: EmailProvider;
  reviews: ReviewService;
  logger: AppLogger;
}

const inviteOne = async (
  { config, email, reviews, logger }: Deps,
  event: { id: string; title: string },
): Promise<number> => {
  const registrations = await EventRegistrationModel.find({ eventId: event.id })
    .select('email fullName')
    .lean()
    .exec();

  let sent = 0;
  for (const registration of registrations) {
    const token = reviews.reviewToken(event.id, registration.email);
    const url = `${config.siteUrl.replace(/\/$/, '')}/events/${event.id}?review=${encodeURIComponent(token)}`;
    const firstName = registration.fullName.trim().split(/\s+/)[0] ?? 'there';
    try {
      await email.send({
        to: registration.email,
        subject: `How was ${event.title}?`,
        html: [
          `<p>Hi ${escapeHtml(firstName)},</p>`,
          `<p>Thanks for joining <strong>${escapeHtml(event.title)}</strong>. If you have a minute, how was it?</p>`,
          `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:#183E33;color:#F4EDDC;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">Leave a review</a></p>`,
          `<p style="color:#666;font-size:13px">Your rating helps other people decide whether the next one is for them. Reviews are read before they are published.</p>`,
          `<p style="color:#666;font-size:13px">${escapeHtml(ORG.name)} — ${escapeHtml(ORG.tagline)}</p>`,
        ].join(''),
      });
      sent += 1;
    } catch (error) {
      // One bad address must not stop the rest of the room being asked.
      logger.warn({ err: error, eventId: event.id }, 'Review invitation failed for one attendee');
    }
  }
  return sent;
};

export const startReviewInviteWorker = (
  container: DependencyContainer,
  logger: AppLogger,
): (() => void) => {
  let running = false;

  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const config = container.resolve<AppConfig>(TOKENS.Config);
      const email = container.resolve<EmailProvider>(TOKENS.EmailProvider);
      const reviews = container.resolve(ReviewService);
      const now = Date.now();

      // `reviewInvitesSentAt` unset is what marks an event as not yet asked
      // about, so the same room is never invited twice.
      const due = await EventModel.find({
        status: 'published',
        reviewInvitesSentAt: { $exists: false },
        startAt: {
          $lte: new Date(now - DELAY_HOURS * 3_600_000),
          $gte: new Date(now - GIVE_UP_DAYS * 86_400_000),
        },
      })
        .limit(MAX_EVENTS_PER_TICK)
        .exec();

      for (const event of due) {
        const sent = await inviteOne(
          { config, email, reviews, logger },
          { id: String(event.id), title: event.get('title') as string },
        );
        // Stamped whatever the count, including zero: an event nobody
        // registered for is done being asked about, not retried hourly.
        await EventModel.findByIdAndUpdate(event.id, {
          $set: { reviewInvitesSentAt: new Date() },
        }).exec();
        logger.info({ eventId: String(event.id), sent }, 'Review invitations sent');
      }
    } catch (error) {
      logger.error({ err: error }, 'Review invitation worker failed');
    } finally {
      running = false;
    }
  };

  const first = setTimeout(() => void run(), FIRST_RUN_DELAY_MS);
  const timer = setInterval(() => void run(), TICK_MS);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
};

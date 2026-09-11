import type { DependencyContainer } from 'tsyringe';

import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { TOKENS } from '../../tokens.js';
import { EventModel } from '../content/models/event.model.js';
import { EventRegistrationModel } from '../event-registrations/event-registration.model.js';

import { ReviewService } from './review.service.js';

/**
 * Invites attendees to review an event, once it is over.
 *
 * The invitation is deliberately late enough that the event has actually
 * finished and early enough that people still remember it.
 *
 * The in-process interval below is a backstop, not the mechanism. On a plan
 * where the instance sleeps between requests a timer that fires hourly never
 * fires at all — which is exactly what happened to the first webinar — so the
 * real trigger is /api/automations/run, called by a scheduler that is awake.
 */
const TICK_MS = 60 * 60_000;
const FIRST_RUN_DELAY_MS = 60_000;

/** How long after an event ends before asking. Long enough to be over, short enough to recall. */
const DELAY_HOURS = 3;
/** Stop asking about events nobody is thinking about any more. */
const GIVE_UP_DAYS = 14;
/** Ceiling per run, so a backlog cannot monopolise the mail provider. */
const MAX_EVENTS_PER_RUN = 3;
/**
 * A run is triggered over HTTP, so it has to answer before anything between
 * here and the caller gives up. Whatever is left is picked up next time: every
 * invitation is stamped on the registration as it is sent.
 */
const RUN_BUDGET_MS = 45_000;
/** Resend allows a couple of messages a second; this stays under it. */
const SEND_GAP_MS = 550;

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

interface Deps {
  email: EmailProvider;
  reviews: ReviewService;
  logger: AppLogger;
}

/**
 * Asks everyone who has not yet been asked, until the budget runs out.
 *
 * Returns whether the room is finished, so the caller knows whether to close
 * the event off or leave it for the next run.
 */
const inviteOne = async (
  deps: Deps,
  event: { id: string; title: string },
  deadline: number,
): Promise<{ sent: number; complete: boolean }> => {
  const registrations = await EventRegistrationModel.find({
    eventId: event.id,
    reviewInvitedAt: { $exists: false },
  })
    .select('email fullName')
    .lean()
    .exec();

  let sent = 0;
  for (const [index, registration] of registrations.entries()) {
    if (Date.now() > deadline) return { sent, complete: false };
    if (index > 0) await pause(SEND_GAP_MS);
    try {
      await deps.email.send(deps.reviews.inviteEmail(event, registration));
      sent += 1;
    } catch (error) {
      // One bad address must not stop the rest of the room being asked.
      deps.logger.warn(
        { err: error, eventId: event.id },
        'Review invitation failed for one attendee',
      );
    }
    // Stamped whether or not it sent: an address the provider rejects will be
    // rejected again next run, and retrying it forever starves everyone behind it.
    await EventRegistrationModel.updateOne(
      { _id: registration._id },
      { $set: { reviewInvitedAt: new Date() } },
    ).exec();
  }
  return { sent, complete: true };
};

export interface ReviewInviteRun {
  events: number;
  invitations: number;
}

/** One pass over the events that are due an invitation. Safe to call at any time. */
export const runReviewInvites = async (
  container: DependencyContainer,
  logger: AppLogger,
  deadline = Date.now() + RUN_BUDGET_MS,
): Promise<ReviewInviteRun> => {
  const deps: Deps = {
    email: container.resolve<EmailProvider>(TOKENS.EmailProvider),
    reviews: container.resolve(ReviewService),
    logger,
  };
  const now = Date.now();

  // `reviewInvitesSentAt` unset is what marks an event as not yet finished
  // with, so the same room is never invited twice.
  const due = await EventModel.find({
    status: 'published',
    reviewInvitesSentAt: { $exists: false },
    startAt: {
      $lte: new Date(now - DELAY_HOURS * 3_600_000),
      $gte: new Date(now - GIVE_UP_DAYS * 86_400_000),
    },
  })
    .limit(MAX_EVENTS_PER_RUN)
    .exec();

  const result: ReviewInviteRun = { events: 0, invitations: 0 };
  for (const event of due) {
    const { sent, complete } = await inviteOne(
      deps,
      { id: String(event.id), title: event.get('title') as string },
      deadline,
    );
    result.invitations += sent;
    if (!complete) {
      logger.info({ eventId: String(event.id), sent }, 'Review invitations paused for this run');
      break;
    }
    // Stamped whatever the count, including zero: an event nobody registered
    // for is done being asked about, not retried every run.
    await EventModel.findByIdAndUpdate(event.id, {
      $set: { reviewInvitesSentAt: new Date() },
    }).exec();
    result.events += 1;
    logger.info({ eventId: String(event.id), sent }, 'Review invitations sent');
  }
  return result;
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
      await runReviewInvites(container, logger);
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

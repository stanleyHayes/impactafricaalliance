import type { DependencyContainer } from 'tsyringe';

import type { AppLogger } from '../../config/logger.js';
import { EventModel } from '../content/models/event.model.js';

import { EventMessageService } from './event-message.service.js';

/**
 * Sends the reminders and the thank-yous.
 *
 * On the same in-process interval as the other background work rather than a
 * scheduler: this is a handful of emails a week, and cron infrastructure to
 * deliver them is not a trade worth making. Five minutes is fine-grained
 * enough for "a few minutes after it ends" while staying cheap.
 */
const TICK_MS = 5 * 60_000;
const FIRST_RUN_DELAY_MS = 45_000;

/**
 * How late is too late.
 *
 * If the process was down when a reminder was due, sending it hours after the
 * event has started is worse than not sending it — so a missed window is
 * abandoned rather than fired on catch-up.
 */
const REMINDER_GRACE_MS = 2 * 3_600_000;
const THANK_YOU_GRACE_MS = 24 * 3_600_000;

const DEFAULTS = {
  reminder: (title: string) => ({
    subject: `Reminder: ${title}`,
    body: [
      `This is a reminder that ${title} is coming up.`,
      'The details are below. We look forward to seeing you there.',
    ].join('\n\n'),
    // A reminder without the joining link is the reminder people complain about.
    includeMeetingLink: true,
  }),
  thankYou: (title: string) => ({
    subject: `Thank you for joining ${title}`,
    body: [
      `Thank you for joining us at ${title}.`,
      'We hope it was worth your time. If you have a moment, we would love to hear what you thought — a short review link will follow shortly.',
    ].join('\n\n'),
    // It is over; the link would only invite people into an empty room.
    includeMeetingLink: false,
  }),
};

export const startEventAutomationWorker = (
  container: DependencyContainer,
  logger: AppLogger,
): (() => void) => {
  let running = false;

  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const messages = container.resolve(EventMessageService);
      const now = Date.now();

      // Reminders: due, not yet sent, and not so late that sending is worse
      // than staying quiet.
      const reminders = await EventModel.find({
        status: 'published',
        reminderHoursBefore: { $gt: 0 },
        reminderSentAt: { $exists: false },
        startAt: { $gt: new Date(now) },
      }).exec();

      for (const event of reminders) {
        const hours = event.get('reminderHoursBefore') as number;
        const dueAt = (event.get('startAt') as Date).getTime() - hours * 3_600_000;
        if (now < dueAt || now > dueAt + REMINDER_GRACE_MS) continue;

        const title = event.get('title') as string;
        try {
          await messages.send(String(event.id), 'reminder', DEFAULTS.reminder(title));
        } catch (error) {
          // "Nobody registered" is the usual reason and is not a failure worth
          // retrying every five minutes, so the event is stamped either way.
          logger.warn({ err: error, eventId: String(event.id) }, 'Reminder not sent');
        }
        await EventModel.findByIdAndUpdate(event.id, { $set: { reminderSentAt: new Date() } }).exec();
      }

      const thanks = await EventModel.find({
        status: 'published',
        thankYouMinutesAfter: { $gt: 0 },
        thankYouSentAt: { $exists: false },
        startAt: { $lte: new Date(now) },
      }).exec();

      for (const event of thanks) {
        const minutes = event.get('thankYouMinutesAfter') as number;
        const endsAt = (event.get('endAt') as Date | undefined) ?? (event.get('startAt') as Date);
        const dueAt = endsAt.getTime() + minutes * 60_000;
        if (now < dueAt || now > dueAt + THANK_YOU_GRACE_MS) continue;

        const title = event.get('title') as string;
        try {
          await messages.send(String(event.id), 'thank-you', DEFAULTS.thankYou(title));
        } catch (error) {
          logger.warn({ err: error, eventId: String(event.id) }, 'Thank-you not sent');
        }
        await EventModel.findByIdAndUpdate(event.id, { $set: { thankYouSentAt: new Date() } }).exec();
      }
    } catch (error) {
      logger.error({ err: error }, 'Event automation worker failed');
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

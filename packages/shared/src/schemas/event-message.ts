import { z } from 'zod';

/**
 * Messages sent to the people registered for an event.
 *
 * Three kinds, all of them the same email in the end: a reminder before it
 * starts, a note of thanks once it is over, and anything an organiser wants to
 * say in between. Automated or not, each send is recorded, because "did the
 * joining link actually go out" is the question asked five minutes before a
 * webinar and there was previously no way to answer it.
 */
export const EVENT_MESSAGE_KINDS = ['reminder', 'thank-you', 'custom'] as const;
export type EventMessageKind = (typeof EVENT_MESSAGE_KINDS)[number];

export const EVENT_MESSAGE_STATUSES = ['sending', 'sent', 'failed'] as const;
export type EventMessageStatus = (typeof EVENT_MESSAGE_STATUSES)[number];

export const eventMessageInputSchema = z.object({
  subject: z.string().min(3, 'Give the email a subject').max(180).trim(),
  /** Plain text from the composer; newlines become paragraphs when sent. */
  body: z.string().min(10, 'Write something to send').max(5000).trim(),
  /**
   * Whether to include the joining link. Off by default: the link is withheld
   * from the public API on purpose, so putting it in an email is a decision
   * rather than something that happens by not thinking about it.
   */
  includeMeetingLink: z.boolean().default(false),
});
export type EventMessageInput = z.infer<typeof eventMessageInputSchema>;

/** What an organiser can automate per event, and when. */
export const eventAutomationSchema = z.object({
  /** Hours before the start to send a reminder. Absent means no reminder. */
  reminderHoursBefore: z.number().int().min(1).max(168).nullish(),
  /** Minutes after the end to thank people. Absent means no thanks. */
  thankYouMinutesAfter: z.number().int().min(1).max(1440).nullish(),
});
export type EventAutomation = z.infer<typeof eventAutomationSchema>;

export interface EventMessage {
  id: string;
  eventId: string;
  kind: EventMessageKind;
  subject: string;
  body: string;
  includeMeetingLink: boolean;
  status: EventMessageStatus;
  /** How many were written to, and how many the provider refused. */
  recipientCount: number;
  failedCount: number;
  /** The account that pressed send. Absent for the automated ones. */
  sentBy?: string;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Turns the composer's plain text into paragraphs, escaping as it goes. */
export const bodyToHtml = (body: string, escape: (value: string) => string): string =>
  body
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');

/**
 * When a reminder for this event is due, or null if it is not wanted.
 *
 * Returns null once the event has started: a reminder that arrives after the
 * thing it is reminding you about is worse than none, and an event created at
 * short notice should not fire one retroactively.
 */
export const reminderDueAt = (
  event: { startAt: string; reminderHoursBefore?: number | null },
): Date | null =>
  event.reminderHoursBefore
    ? new Date(new Date(event.startAt).getTime() - event.reminderHoursBefore * 3_600_000)
    : null;

/** When thanks are due, counted from the end, or the start if none was set. */
export const thankYouDueAt = (
  event: { startAt: string; endAt?: string; thankYouMinutesAfter?: number | null },
): Date | null =>
  event.thankYouMinutesAfter
    ? new Date(new Date(event.endAt ?? event.startAt).getTime() + event.thankYouMinutesAfter * 60_000)
    : null;

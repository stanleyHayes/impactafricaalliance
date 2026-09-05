import {
  buildEventIcs,
  eventIcsFilename,
  isRegistrationOpen,
  ORG,
  type Event,
  type EventRegistrationInput,
  type EventRegistrationResult,
  type Paginated,
} from '@iaa/shared';
import { Types } from 'mongoose';
import QRCode from 'qrcode';
import { inject, injectable } from 'tsyringe';

import { ConflictError, NotFoundError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { TOKENS } from '../../tokens.js';
import { EventModel } from '../content/models/event.model.js';

import {
  EventRegistrationModel,
  type EventRegistrationDocument,
} from './event-registration.model.js';

const DUPLICATE_KEY = 11000;

/** The joining link travels with the result, since only a registrant may see it. */
const joiningLink = (event: { meetingUrl?: string }): Pick<EventRegistrationResult, 'meetingUrl'> =>
  event.meetingUrl ? { meetingUrl: event.meetingUrl } : {};

/** Matches how the public site prints an event time, so the two agree. */
const whenFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );

@injectable()
export class EventRegistrationService {
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.EmailProvider) private readonly email: EmailProvider,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** Absolute URL of an event's page on the public site. */
  private eventUrl = (eventId: string): string =>
    `${this.config.siteUrl.replace(/\/$/, '')}/events/${eventId}`;

  /** Register an attendee, or report that this email already holds a place. */
  register = async (
    eventId: string,
    input: EventRegistrationInput,
  ): Promise<EventRegistrationResult> => {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundError('Event');
    }

    const event = await EventModel.findById(eventId).exec();
    if (!event || event.status !== 'published') {
      throw new NotFoundError('Event');
    }

    if (!isRegistrationOpen(event.toJSON() as unknown as Event, new Date())) {
      throw new ConflictError('Registration for this event is closed.');
    }

    if (event.capacity && event.capacity > 0) {
      const taken = await EventRegistrationModel.countDocuments({ eventId }).exec();
      if (taken >= event.capacity) {
        throw new ConflictError('This event has reached capacity.');
      }
    }

    try {
      await EventRegistrationModel.create({
        ...input,
        eventId: new Types.ObjectId(eventId),
        consentedAt: new Date(),
      });
      await this.confirm(event.toJSON() as unknown as Event, input, false);
      return { registered: true, alreadyRegistered: false, ...joiningLink(event) };
    } catch (error) {
      // A repeat submission is a no-op, not a failure the visitor must resolve.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        // Re-send, because the usual reason for registering twice is that the
        // first confirmation never arrived.
        await this.confirm(event.toJSON() as unknown as Event, input, true);
        return { registered: true, alreadyRegistered: true, ...joiningLink(event) };
      }
      throw error;
    }
  };

  /**
   * The attendee's own calendar file. Carries the joining link, so it is only
   * ever built for someone who has registered.
   */
  private registrantIcs = (event: Event): string =>
    buildEventIcs(event, {
      url: this.eventUrl(event.id),
      ...(event.meetingUrl ? { meetingUrl: event.meetingUrl } : {}),
    });

  /**
   * Best-effort confirmation email — a delivery failure must never fail the
   * registration, which has already been recorded.
   */
  private confirm = async (
    event: Event,
    input: EventRegistrationInput,
    alreadyRegistered: boolean,
  ): Promise<void> => {
    const when = whenFormatter.format(new Date(event.startAt));
    const firstName = input.fullName.trim().split(/\s+/)[0] ?? 'there';
    const url = this.eventUrl(event.id);
    const rows: string[] = [
      `<p style="margin:0 0 6px"><strong>When:</strong> ${escapeHtml(when)} GMT</p>`,
      `<p style="margin:0 0 6px"><strong>Where:</strong> ${escapeHtml(event.location)}</p>`,
    ];
    if (event.host) {
      const host = event.hostTitle ? `${event.host} — ${event.hostTitle}` : event.host;
      rows.push(`<p style="margin:0 0 6px"><strong>Host:</strong> ${escapeHtml(host)}</p>`);
    }
    if (event.meetingUrl) {
      rows.push(
        `<p style="margin:16px 0"><a href="${escapeHtml(event.meetingUrl)}" style="background:#183E33;color:#F4EDDC;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">Join the session</a></p>`,
      );
    }

    try {
      await this.email.send({
        to: input.email,
        subject: `${alreadyRegistered ? 'Your place is confirmed' : "You're registered"} — ${event.title}`,
        html: [
          `<p>Hi ${escapeHtml(firstName)},</p>`,
          alreadyRegistered
            ? `<p>You already hold a place at <strong>${escapeHtml(event.title)}</strong>. Here are the details again.</p>`
            : `<p>Your place at <strong>${escapeHtml(event.title)}</strong> is confirmed.</p>`,
          ...rows,
          `<p>The attached calendar file will add it to your calendar with a reminder.</p>`,
          `<p><a href="${escapeHtml(url)}">View the event page</a></p>`,
          `<p style="color:#666;font-size:13px">${escapeHtml(ORG.name)} — ${escapeHtml(ORG.tagline)}</p>`,
        ].join(''),
        attachments: [
          {
            filename: eventIcsFilename(event),
            content: Buffer.from(this.registrantIcs(event), 'utf8'),
            contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
          },
        ],
      });
    } catch (error) {
      this.logger.error({ err: error, eventId: event.id }, 'Failed to send registration confirmation');
    }
  };

  /**
   * The public calendar file for an event. Deliberately built without the
   * joining link: anyone can download this without registering.
   */
  calendarForEvent = async (eventId: string): Promise<{ filename: string; body: string }> => {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundError('Event');
    }
    const document = await EventModel.findById(eventId).exec();
    if (!document || document.status !== 'published') {
      throw new NotFoundError('Event');
    }
    const event = document.toJSON() as unknown as Event;
    return {
      filename: eventIcsFilename(event),
      body: buildEventIcs(event, { url: this.eventUrl(event.id) }),
    };
  };

  listForEvent = async (
    eventId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<EventRegistrationDocument>> => {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundError('Event');
    }
    const filter = { eventId: new Types.ObjectId(eventId) };
    const [items, total] = await Promise.all([
      EventRegistrationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      EventRegistrationModel.countDocuments(filter).exec(),
    ]);
    return paginate(items, total, page, pageSize);
  };

  /**
   * A printable QR code pointing at the event's own page, for flyers and
   * slides. Generated server-side so the admin never has to ship a QR library.
   */
  qrForEvent = async (eventId: string): Promise<{ targetUrl: string; dataUrl: string }> => {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundError('Event');
    }
    const event = await EventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundError('Event');
    }
    const targetUrl = `${this.config.siteUrl.replace(/\/$/, '')}/events/${eventId}`;
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    return { targetUrl, dataUrl };
  };

  /** Registration totals keyed by event id, for the admin list column. */
  countsByEvent = async (): Promise<Record<string, number>> => {
    const rows = await EventRegistrationModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]).exec();
    return Object.fromEntries(rows.map((row) => [row._id.toString(), row.count]));
  };
}

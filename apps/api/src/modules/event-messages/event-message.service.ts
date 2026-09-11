import {
  bodyToHtml,
  formatDateTime,
  ORG,
  type EventMessage,
  type EventMessageInput,
  type EventMessageKind,
  type Paginated,
} from '@iaa/shared';
import { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { NotFoundError, ValidationError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { TOKENS } from '../../tokens.js';
import { EventModel } from '../content/models/event.model.js';
import { EventRegistrationModel } from '../event-registrations/event-registration.model.js';

import { EventMessageModel, type EventMessageDocument } from './event-message.model.js';

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );



interface EventLike {
  id: string;
  title: string;
  startAt: Date;
  location: string;
  meetingUrl?: string;
}

@injectable()
export class EventMessageService {
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.EmailProvider) private readonly email: EmailProvider,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  private eventUrl(eventId: string): string {
    return `${this.config.siteUrl.replace(/\/$/, '')}/events/${eventId}`;
  }

  /** The organiser's words, wrapped in the event's own details. */
  private html(event: EventLike, input: EventMessageInput, firstName: string): string {
    const parts = [
      `<p>Hi ${escapeHtml(firstName)},</p>`,
      bodyToHtml(input.body, escapeHtml),
      `<hr style="border:0;border-top:1px solid #E4E0D6;margin:24px 0 18px" />`,
      `<p style="margin:0 0 6px"><strong>${escapeHtml(event.title)}</strong></p>`,
      `<p style="margin:0 0 6px">${escapeHtml(formatDateTime(event.startAt))} GMT</p>`,
      `<p style="margin:0 0 6px">${escapeHtml(event.location)}</p>`,
    ];

    if (input.includeMeetingLink && event.meetingUrl) {
      parts.push(
        `<p style="margin:18px 0"><a href="${escapeHtml(event.meetingUrl)}" style="background:#183E33;color:#F4EDDC;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">Join the session</a></p>`,
      );
    }

    parts.push(
      `<p style="margin:14px 0 0"><a href="${escapeHtml(this.eventUrl(event.id))}">View the event page</a></p>`,
      `<p style="color:#666;font-size:13px">${escapeHtml(ORG.name)} — ${escapeHtml(ORG.tagline)}</p>`,
    );
    return parts.join('');
  }

  /**
   * Writes to everyone registered, and records what happened either way.
   *
   * One address failing must not stop the rest of the room being written to,
   * so failures are counted rather than thrown — a send that reached forty of
   * forty-two people is a fact worth recording, not an error to discard.
   */
  async send(
    eventId: string,
    kind: EventMessageKind,
    input: EventMessageInput,
    sentBy?: string,
  ): Promise<EventMessage> {
    if (!Types.ObjectId.isValid(eventId)) throw new NotFoundError('Event');
    const event = await EventModel.findById(eventId).exec();
    if (!event) throw new NotFoundError('Event');

    if (input.includeMeetingLink && !event.get('meetingUrl')) {
      throw new ValidationError('This event has no joining link to include');
    }

    const details: EventLike = {
      id: String(event.id),
      title: event.get('title') as string,
      startAt: event.get('startAt') as Date,
      location: event.get('location') as string,
      meetingUrl: event.get('meetingUrl') as string | undefined,
    };

    const registrations = await EventRegistrationModel.find({ eventId: event._id })
      .select('email fullName')
      .lean()
      .exec();

    if (registrations.length === 0) {
      throw new ValidationError('Nobody has registered for this event yet');
    }

    let failed = 0;
    for (const registration of registrations) {
      const firstName = registration.fullName.trim().split(/\s+/)[0] ?? 'there';
      try {
        await this.email.send({
          to: registration.email,
          subject: input.subject,
          html: this.html(details, input, firstName),
        });
      } catch (error) {
        failed += 1;
        this.logger.warn({ err: error, eventId }, 'Event message failed for one recipient');
      }
    }

    const record = await EventMessageModel.create({
      eventId: event._id,
      kind,
      subject: input.subject,
      body: input.body,
      includeMeetingLink: input.includeMeetingLink,
      // Sent unless nobody at all received it; a partial send is still a send.
      status: failed === registrations.length ? 'failed' : 'sent',
      recipientCount: registrations.length - failed,
      failedCount: failed,
      sentBy,
      sentAt: new Date(),
    });

    return this.toDto(record);
  }

  private toDto = (record: EventMessageDocument): EventMessage => ({
    id: String(record.id),
    eventId: String(record.eventId),
    kind: record.kind,
    subject: record.subject,
    body: record.body,
    includeMeetingLink: record.includeMeetingLink,
    status: record.status,
    recipientCount: record.recipientCount,
    failedCount: record.failedCount,
    ...(record.sentBy ? { sentBy: record.sentBy } : {}),
    sentAt: record.sentAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });

  /** What has already gone out for one event, newest first. */
  async listForEvent(eventId: string, page = 1, pageSize = 20): Promise<Paginated<EventMessage>> {
    if (!Types.ObjectId.isValid(eventId)) throw new NotFoundError('Event');
    const filter = { eventId: new Types.ObjectId(eventId) };
    const [rows, total] = await Promise.all([
      EventMessageModel.find(filter)
        .sort({ sentAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      EventMessageModel.countDocuments(filter).exec(),
    ]);
    return paginate(rows.map(this.toDto), total, page, pageSize);
  }
}

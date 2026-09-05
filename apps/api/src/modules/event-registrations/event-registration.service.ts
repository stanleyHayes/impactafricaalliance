import {
  isRegistrationOpen,
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
import { TOKENS } from '../../tokens.js';
import { EventModel } from '../content/models/event.model.js';

import {
  EventRegistrationModel,
  type EventRegistrationDocument,
} from './event-registration.model.js';

const DUPLICATE_KEY = 11000;

@injectable()
export class EventRegistrationService {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

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
      return { registered: true, alreadyRegistered: false };
    } catch (error) {
      // A repeat submission is a no-op, not a failure the visitor must resolve.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        return { registered: true, alreadyRegistered: true };
      }
      throw error;
    }
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

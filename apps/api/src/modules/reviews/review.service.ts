import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  ORG,
  ratingSummary,
  type AdminReview,
  type EventReviewInput,
  type OrganisationReviewInput,
  type Paginated,
  type PublicReview,
  type RatingSummary,
  type ReviewModeration,
  type ReviewStatus,
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

import { ReviewModel, type ReviewDocument } from './review.model.js';

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );

/**
 * Signs "this address may review this event".
 *
 * A signature rather than a stored row: the registration already proves the
 * relationship, so there is nothing to keep, nothing to expire and nothing to
 * clean up. The event id is inside the signature, so a link for one event
 * cannot be replayed against another.
 */
const REVIEW_TOKEN_VERSION = 'r1';

/**
 * When an event becomes reviewable: once it has finished, or once it has
 * started for one with no end time recorded.
 */
const reviewableFrom = (event: { startAt: Date | string; endAt?: Date | string | null }): Date =>
  new Date(event.endAt ?? event.startAt);

@injectable()
export class ReviewService {
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.EmailProvider) private readonly email: EmailProvider,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  reviewToken(eventId: string, email: string): string {
    const payload = `${REVIEW_TOKEN_VERSION}.${eventId}.${email.toLowerCase()}`;
    const signature = createHmac('sha256', this.config.jwt.accessSecret)
      .update(payload)
      .digest('base64url');
    return `${Buffer.from(payload).toString('base64url')}.${signature}`;
  }

  /**
   * The invitation an attendee gets after the event.
   *
   * Lives here rather than in the worker because two things send it: the
   * scheduled run that asks the whole room, and the "send me my link" request
   * from someone who deleted the email.
   */
  inviteEmail(
    event: { id: string; title: string },
    registration: { email: string; fullName?: string },
  ): { to: string; subject: string; html: string } {
    const token = this.reviewToken(event.id, registration.email);
    const url = `${this.config.siteUrl.replace(/\/$/, '')}/events/${event.id}?review=${encodeURIComponent(token)}#event-reviews`;
    const firstName = (registration.fullName ?? '').trim().split(/\s+/)[0] || 'there';
    return {
      to: registration.email,
      subject: `How was ${event.title}?`,
      html: [
        `<p>Hi ${escapeHtml(firstName)},</p>`,
        `<p>Thanks for joining <strong>${escapeHtml(event.title)}</strong>. If you have a minute, how was it?</p>`,
        `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:#183E33;color:#F4EDDC;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">Leave a review</a></p>`,
        `<p style="color:#666;font-size:13px">Your rating helps other people decide whether the next one is for them. Reviews are read before they are published.</p>`,
        `<p style="color:#666;font-size:13px">${escapeHtml(ORG.name)} — ${escapeHtml(ORG.tagline)}</p>`,
      ].join(''),
    };
  }

  /**
   * Sends someone their own review link on request.
   *
   * The invitation email is the only way to the form, which leaves anyone who
   * deleted it with no way in — so the event page offers this instead. It
   * answers the same whether or not the address was registered: the caller is
   * anonymous, and confirming who attended an event to whoever asks is not
   * ours to do.
   */
  async requestReviewLink(eventId: string, email: string): Promise<void> {
    const event = await EventModel.findById(eventId).exec();
    if (!event) return;
    if (new Date() < reviewableFrom(event.toObject() as { startAt: Date; endAt?: Date })) return;

    const registration = await EventRegistrationModel.findOne({
      eventId: new Types.ObjectId(eventId),
      email,
    })
      .select('email fullName')
      .lean()
      .exec();
    if (!registration) return;

    try {
      await this.email.send(
        this.inviteEmail(
          { id: eventId, title: event.get('title') as string },
          { email: registration.email, fullName: registration.fullName },
        ),
      );
      // Counts as having been asked, so the scheduled run does not ask again.
      await EventRegistrationModel.updateOne(
        { _id: registration._id },
        { $set: { reviewInvitedAt: new Date() } },
      ).exec();
    } catch (error) {
      this.logger.error({ err: error, eventId }, 'Could not send a requested review link');
    }
  }

  /** Reads a token back, or refuses it. Never says which half was wrong. */
  private openToken(token: string): { eventId: string; email: string } {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) throw new ValidationError('This review link is not valid');

    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const expected = createHmac('sha256', this.config.jwt.accessSecret)
      .update(payload)
      .digest('base64url');

    const given = Buffer.from(signature);
    const want = Buffer.from(expected);
    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      throw new ValidationError('This review link is not valid');
    }

    // Emails contain dots, so the address is everything after the event id
    // rather than the third field — splitting naively truncated ama@example.com
    // to ama@example and no registration ever matched.
    const [version, eventId, ...rest] = payload.split('.');
    const email = rest.join('.');
    if (version !== REVIEW_TOKEN_VERSION || !eventId || email === '') {
      throw new ValidationError('This review link is not valid');
    }
    return { eventId, email };
  }

  /** What the token belongs to, so the form can name the event before submitting. */
  async describeToken(token: string): Promise<{ eventId: string; eventTitle: string }> {
    const { eventId } = this.openToken(token);
    const event = await EventModel.findById(eventId).exec();
    if (!event) throw new NotFoundError('Event not found');
    return { eventId, eventTitle: event.get('title') as string };
  }

  async submitEventReview(
    input: EventReviewInput,
    now = new Date(),
  ): Promise<{ status: ReviewStatus }> {
    const { eventId, email } = this.openToken(input.token);

    // The signature says the address was registered when the link was sent;
    // this says it still is. A withdrawn registration should not leave behind
    // a working review link.
    const registered = await EventRegistrationModel.exists({
      eventId: new Types.ObjectId(eventId),
      email,
    }).exec();
    if (!registered) throw new ValidationError('No registration found for this review link');

    // Nobody can review an event that has not happened yet. In practice the
    // link only goes out afterwards, but the rule belongs at the write rather
    // than in the timing of an email — a forwarded link, a re-sent invitation
    // or a rescheduled event should not be able to get round it.
    const event = await EventModel.findById(eventId).exec();
    if (!event) throw new NotFoundError('Event not found');
    if (now < reviewableFrom(event.toObject() as { startAt: Date; endAt?: Date })) {
      throw new ValidationError('This event has not taken place yet');
    }

    await ReviewModel.findOneAndUpdate(
      { subject: 'event', eventId: new Types.ObjectId(eventId), email },
      {
        $set: {
          rating: input.rating,
          comment: input.comment,
          displayName: input.displayName,
          verifiedVia: 'registration',
          verifiedAt: new Date(),
          // Editing a published review sends it back for another look: the
          // words have changed, so the approval no longer covers them.
          status: 'pending',
          rejectionReason: undefined,
          publishedAt: undefined,
        },
        $setOnInsert: { subject: 'event', eventId: new Types.ObjectId(eventId), email },
      },
      { upsert: true, new: true },
    ).exec();

    // An edited review is pending again; remove its previous public rating immediately.
    await this.refreshEventRating(eventId);
    return { status: 'pending' };
  }

  /**
   * Takes an organisation review and holds it until the address is confirmed.
   *
   * Nothing about it is visible, or even in the moderation queue, until the
   * link is clicked — otherwise the queue becomes the spam target instead of
   * the site.
   */
  async submitOrganisationReview(input: OrganisationReviewInput): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await ReviewModel.findOneAndUpdate(
      { subject: 'organisation', email: input.email },
      {
        $set: {
          rating: input.rating,
          comment: input.comment,
          displayName: input.displayName,
          role: input.role,
          verifiedVia: 'email',
          verifiedAt: undefined,
          verificationToken: token,
          status: 'pending',
          rejectionReason: undefined,
          publishedAt: undefined,
        },
        $setOnInsert: { subject: 'organisation', email: input.email },
      },
      { upsert: true, new: true },
    ).exec();

    await this.sendVerification(input.email, input.displayName, token);
  }

  private async sendVerification(email: string, name: string, token: string): Promise<void> {
    const url = `${this.config.siteUrl.replace(/\/$/, '')}/reviews/confirm?token=${token}`;
    try {
      await this.email.send({
        to: email,
        subject: 'Confirm your review — Impact Africa Alliance',
        html: [
          `<p>Hi ${escapeHtml(name)},</p>`,
          `<p>Please confirm this address so we know the review came from you.</p>`,
          `<p style="margin:20px 0"><a href="${escapeHtml(url)}" style="background:#183E33;color:#F4EDDC;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">Confirm my review</a></p>`,
          `<p style="color:#666;font-size:13px">If you did not write a review, ignore this — nothing will be published.</p>`,
        ].join(''),
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to send review verification');
      throw new ValidationError('We could not send the confirmation email. Please try again.');
    }
  }

  /** Confirms an address and puts the review in front of a moderator. */
  async confirmOrganisationReview(token: string): Promise<void> {
    const review = await ReviewModel.findOneAndUpdate(
      { verificationToken: token, subject: 'organisation' },
      // The token is cleared as it is used, so a forwarded link is spent.
      { $set: { verifiedAt: new Date() }, $unset: { verificationToken: '' } },
    ).exec();
    if (!review) throw new NotFoundError('This confirmation link has already been used');
  }

  // ── Reading ──────────────────────────────────────────────────────────────

  private toPublic = (review: ReviewDocument, eventTitle?: string): PublicReview => ({
    id: String(review.id),
    subject: review.subject,
    ...(review.eventId ? { eventId: String(review.eventId) } : {}),
    ...(eventTitle ? { eventTitle } : {}),
    rating: review.rating,
    ...(review.comment ? { comment: review.comment } : {}),
    displayName: review.displayName,
    ...(review.role ? { role: review.role } : {}),
    attended: review.verifiedVia === 'registration',
    submittedAt: (review.publishedAt ?? review.createdAt).toISOString(),
  });

  /** Published reviews only, and only ones whose address was confirmed. */
  private publishedFilter(subject: 'event' | 'organisation', eventId?: string) {
    return {
      subject,
      status: 'published' as const,
      verifiedAt: { $ne: null },
      ...(eventId ? { eventId: new Types.ObjectId(eventId) } : {}),
    };
  }

  async publicReviews(
    subject: 'event' | 'organisation',
    options: { eventId?: string; page?: number; pageSize?: number } = {},
  ): Promise<Paginated<PublicReview>> {
    const filter = this.publishedFilter(subject, options.eventId);
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 10;
    const [rows, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      ReviewModel.countDocuments(filter).exec(),
    ]);
    return paginate(
      rows.map((review) => this.toPublic(review)),
      total,
      page,
      pageSize,
    );
  }

  async summary(subject: 'event' | 'organisation', eventId?: string): Promise<RatingSummary> {
    const rows = await ReviewModel.find(this.publishedFilter(subject, eventId))
      .select('rating')
      .lean()
      .exec();
    return ratingSummary(rows.map((row) => row.rating));
  }

  // ── Moderation ───────────────────────────────────────────────────────────

  async list(options: {
    eventId?: string;
    status?: ReviewStatus;
    subject?: 'event' | 'organisation';
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<AdminReview>> {
    // An unconfirmed organisation review is not waiting on the team, it is
    // waiting on its author. Keeping it out of the queue keeps the queue
    // meaningful.
    const filter = {
      verifiedAt: { $ne: null },
      ...(options.status ? { status: options.status } : {}),
      ...(options.subject ? { subject: options.subject } : {}),
      ...(options.eventId
        ? { subject: 'event' as const, eventId: new Types.ObjectId(options.eventId) }
        : {}),
    };
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const [rows, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      ReviewModel.countDocuments(filter).exec(),
    ]);

    const eventIds = [...new Set(rows.map((row) => row.eventId).filter(Boolean))];
    const events = await EventModel.find({ _id: { $in: eventIds } })
      .select('title')
      .lean()
      .exec();
    const titles = new Map(events.map((event) => [String(event._id), event.title as string]));

    return paginate(
      rows.map((review) => ({
        ...this.toPublic(review, review.eventId ? titles.get(String(review.eventId)) : undefined),
        email: review.email,
        status: review.status,
        ...(review.rejectionReason ? { rejectionReason: review.rejectionReason } : {}),
        ...(review.verifiedAt ? { verifiedAt: review.verifiedAt.toISOString() } : {}),
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    );
  }

  async remove(id: string): Promise<void> {
    const review = await ReviewModel.findByIdAndDelete(id).exec();
    if (!review) throw new NotFoundError('Review not found');
    if (review.subject === 'event' && review.eventId)
      await this.refreshEventRating(String(review.eventId));
  }

  async moderate(id: string, decision: ReviewModeration): Promise<void> {
    const review = await ReviewModel.findById(id).exec();
    if (!review) throw new NotFoundError('Review not found');
    if (!review.verifiedAt) {
      throw new ValidationError('This review has not been confirmed by its author yet');
    }

    review.set({
      status: decision.status,
      rejectionReason: decision.status === 'rejected' ? decision.rejectionReason : undefined,
      publishedAt: decision.status === 'published' ? new Date() : undefined,
    });
    await review.save();

    if (review.subject === 'event' && review.eventId) {
      await this.refreshEventRating(String(review.eventId));
    }
  }

  /**
   * Copies the published rating onto the event.
   *
   * Denormalised because the events list draws a star on every card, and an
   * aggregate per card is a query per card. Recomputed from the published rows
   * on every decision, so a rejected review takes its stars back out with it.
   */
  async refreshEventRating(eventId: string): Promise<void> {
    const summary = await this.summary('event', eventId);
    await EventModel.findByIdAndUpdate(eventId, {
      $set: { ratingCount: summary.count, ratingAverage: summary.average ?? null },
    }).exec();
  }
}

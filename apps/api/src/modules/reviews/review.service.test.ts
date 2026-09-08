import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { EventRegistrationModel } from '../event-registrations/event-registration.model.js';

import { ReviewModel } from './review.model.js';
import { ReviewService } from './review.service.js';

const eventId = '507f1f77bcf86cd799439011';
const otherEventId = '507f1f77bcf86cd799439099';

const config = {
  jwt: { accessSecret: 'a'.repeat(32) },
  siteUrl: 'https://www.impactafricaalliance.org',
} as unknown as ConstructorParameters<typeof ReviewService>[0];

const build = () => {
  const send = vi.fn().mockResolvedValue(undefined);
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as AppLogger;
  const service = new ReviewService(config, { send } as unknown as EmailProvider, logger);
  vi.spyOn(service, 'refreshEventRating').mockResolvedValue(undefined);
  return { service, send, logger };
};

/** Records what would have been written without touching a database. */
const captureUpsert = () => {
  const writes: Record<string, unknown>[] = [];
  vi.spyOn(ReviewModel, 'findOneAndUpdate').mockImplementation(((
    filter: unknown,
    update: Record<string, unknown>,
  ) => {
    writes.push({ filter, update });
    return { exec: vi.fn().mockResolvedValue({}) };
  }) as never);
  return writes;
};

const registrationExists = (exists: boolean): void => {
  vi.spyOn(EventRegistrationModel, 'exists').mockReturnValue({
    exec: vi.fn().mockResolvedValue(exists ? { _id: 'x' } : null),
  } as unknown as ReturnType<typeof EventRegistrationModel.exists>);
};

afterEach(() => vi.restoreAllMocks());

describe('the review link an attendee is sent', () => {
  it('accepts the token it issued', async () => {
    const { service } = build();
    registrationExists(true);
    const writes = captureUpsert();

    const token = service.reviewToken(eventId, 'Ama@Example.com');
    await service.submitEventReview({
      token,
      rating: 5,
      comment: 'Genuinely useful.',
      displayName: 'Ama M.',
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.filter).toMatchObject({ subject: 'event', email: 'ama@example.com' });
  });

  it('refuses a token whose signature has been altered', async () => {
    const { service } = build();
    const token = service.reviewToken(eventId, 'ama@example.com');
    const tampered = `${token.slice(0, -4)}aaaa`;

    await expect(
      service.submitEventReview({ token: tampered, rating: 5, displayName: 'Ama' }),
    ).rejects.toThrow(/not valid/);
  });

  it('carries the event inside the signature, so a link cannot be repointed', async () => {
    const { service } = build();
    registrationExists(true);
    const writes = captureUpsert();

    await service.submitEventReview({
      token: service.reviewToken(otherEventId, 'ama@example.com'),
      rating: 4,
      displayName: 'Ama',
    });

    // The review lands against the event the link was issued for, whatever
    // the URL around it says.
    expect(String((writes[0]?.filter as { eventId: unknown }).eventId)).toBe(otherEventId);
  });

  it('keeps the whole address, dots and all', async () => {
    const { service } = build();
    registrationExists(true);
    const writes = captureUpsert();

    await service.submitEventReview({
      token: service.reviewToken(eventId, 'ama.mensah@example.co.uk'),
      rating: 5,
      displayName: 'Ama',
    });

    expect(writes[0]?.filter).toMatchObject({ email: 'ama.mensah@example.co.uk' });
  });

  it('refuses once the registration behind it is gone', async () => {
    const { service } = build();
    registrationExists(false);

    // The signature says they were registered when the link was sent. A
    // withdrawn registration must not leave a working review link behind.
    await expect(
      service.submitEventReview({
        token: service.reviewToken(eventId, 'ama@example.com'),
        rating: 5,
        displayName: 'Ama',
      }),
    ).rejects.toThrow(/No registration/);
  });

  it('sends an edited review back for another look', async () => {
    const { service } = build();
    registrationExists(true);
    const writes = captureUpsert();

    await service.submitEventReview({
      token: service.reviewToken(eventId, 'ama@example.com'),
      rating: 2,
      comment: 'Changed my mind.',
      displayName: 'Ama',
    });

    // An approval covered the old words, not the new ones.
    const update = writes[0]?.update as { $set: Record<string, unknown> };
    expect(update.$set.status).toBe('pending');
    expect(update.$set.publishedAt).toBeUndefined();
    expect(service.refreshEventRating).toHaveBeenCalledWith(eventId);
  });
});

describe('a review of the organisation', () => {
  it('is held until the address is confirmed', async () => {
    const { service, send } = build();
    const writes = captureUpsert();

    await service.submitOrganisationReview({
      email: 'partner@example.com',
      rating: 5,
      comment: 'A serious partner.',
      displayName: 'Kwame A.',
      consent: true,
    });

    const update = writes[0]?.update as { $set: Record<string, unknown> };
    expect(update.$set.status).toBe('pending');
    expect(update.$set.verifiedAt).toBeUndefined();
    expect(update.$set.verificationToken).toEqual(expect.any(String));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].html).toContain('/reviews/confirm?token=');
  });

  it('reports a failure to send rather than pretending it worked', async () => {
    const { service, send, logger } = build();
    captureUpsert();
    send.mockRejectedValue(new Error('provider down'));

    // Silently accepting it would leave someone waiting for an email that is
    // never coming, and a review nobody can approve.
    await expect(
      service.submitOrganisationReview({
        email: 'partner@example.com',
        rating: 5,
        displayName: 'Kwame',
        consent: true,
      }),
    ).rejects.toThrow(/could not send/);
    expect(logger.error).toHaveBeenCalled();
  });

  it('spends the confirmation link as it is used', async () => {
    const { service } = build();
    const update = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({ id: 'r1' }) });
    vi.spyOn(ReviewModel, 'findOneAndUpdate').mockImplementation(update as never);

    await service.confirmOrganisationReview('token-123');

    // Clearing the token is what stops a forwarded link being reused.
    expect(update.mock.calls[0]?.[1]).toMatchObject({ $unset: { verificationToken: '' } });
  });

  it('refuses a confirmation link that has already been spent', async () => {
    const { service } = build();
    vi.spyOn(ReviewModel, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as never);

    await expect(service.confirmOrganisationReview('spent')).rejects.toThrow(/already been used/);
  });
});

describe('public event comment moderation', () => {
  it('restricts both comments and rating summaries to approved, verified reviews', async () => {
    const { service } = build();
    const query = {
      sort: vi.fn(),
      skip: vi.fn(),
      limit: vi.fn(),
      select: vi.fn(),
      lean: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    };
    for (const method of ['sort', 'skip', 'limit', 'select', 'lean'] as const)
      query[method].mockReturnValue(query);
    const find = vi.spyOn(ReviewModel, 'find').mockReturnValue(query as never);
    vi.spyOn(ReviewModel, 'countDocuments').mockReturnValue({
      exec: vi.fn().mockResolvedValue(0),
    } as never);
    await service.publicReviews('event', { eventId });
    await service.summary('event', eventId);
    expect(find).toHaveBeenCalledTimes(2);
    for (const [filter] of find.mock.calls)
      expect(filter).toMatchObject({
        subject: 'event',
        status: 'published',
        verifiedAt: { $ne: null },
      });
  });
});

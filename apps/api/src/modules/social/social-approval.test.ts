import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppLogger } from '../../config/logger.js';

import type { SocialAccountRepository } from './social-account.repository.js';
import type { SocialOAuthService } from './social-oauth.service.js';
import { SocialPublicationModel } from './social-publication.model.js';
import { SocialPublicationService } from './social-publication.service.js';
import type { WhatsappAudience } from './whatsapp-audience.js';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;

const build = () =>
  new SocialPublicationService(
    {} as SocialAccountRepository,
    {} as SocialOAuthService,
    logger,
    {} as WhatsappAudience,
  );

const held = (overrides: Record<string, unknown> = {}) => ({
  _id: 'pub-1',
  status: 'pending_approval',
  scheduledFor: undefined,
  ...overrides,
});

beforeEach(() => vi.restoreAllMocks());

describe('a publication waiting for approval', () => {
  it('is never claimed by the worker', async () => {
    const findOneAndUpdate = vi
      .spyOn(SocialPublicationModel, 'findOneAndUpdate')
      .mockReturnValue({ exec: vi.fn().mockResolvedValue(null) } as never);

    await build().claimNext(new Date('2026-01-01T00:00:00.000Z'));

    // The claim is a positive match on 'queued'. That is what actually stops
    // an unapproved row going out — not a check the worker could skip.
    const [filter] = findOneAndUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(filter.status).toBe('queued');
    expect(JSON.stringify(filter)).not.toContain('pending_approval');
  });

  it('cannot be smuggled out through Retry', async () => {
    vi.spyOn(SocialPublicationModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(held()),
    } as never);

    await expect(build().retry('pub-1')).rejects.toThrow('waiting for approval');
  });
});

describe('approving', () => {
  it('releases it to the queue and records who did it', async () => {
    vi.spyOn(SocialPublicationModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(held()),
    } as never);
    const update = vi
      .spyOn(SocialPublicationModel, 'findByIdAndUpdate')
      .mockReturnValue({ exec: vi.fn().mockResolvedValue({ status: 'queued' }) } as never);

    await build().approve('pub-1', 'user-admin');

    const [, changes] = update.mock.calls[0] as [string, { $set: Record<string, unknown> }];
    expect(changes.$set.status).toBe('queued');
    expect(changes.$set.approvedBy).toBe('user-admin');
    expect(changes.$set.approvedAt).toBeInstanceOf(Date);
  });

  it('honours the schedule rather than sending it immediately', async () => {
    const friday = new Date('2026-10-02T17:00:00.000Z');
    vi.spyOn(SocialPublicationModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(held({ scheduledFor: friday })),
    } as never);
    const update = vi
      .spyOn(SocialPublicationModel, 'findByIdAndUpdate')
      .mockReturnValue({ exec: vi.fn().mockResolvedValue({}) } as never);

    await build().approve('pub-1', 'user-admin');

    // Approving something scheduled for Friday queues it for Friday.
    const [, changes] = update.mock.calls[0] as [string, { $set: Record<string, unknown> }];
    expect(changes.$set.nextAttemptAt).toEqual(friday);
  });

  it('refuses anything that is not waiting for approval', async () => {
    vi.spyOn(SocialPublicationModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(held({ status: 'published' })),
    } as never);

    await expect(build().approve('pub-1', 'user-admin')).rejects.toThrow('not waiting');
  });
});

describe('rejecting', () => {
  it('keeps the row, with who declined it and why', async () => {
    vi.spyOn(SocialPublicationModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(held()),
    } as never);
    const update = vi
      .spyOn(SocialPublicationModel, 'findByIdAndUpdate')
      .mockReturnValue({ exec: vi.fn().mockResolvedValue({}) } as never);

    await build().reject('pub-1', 'user-admin', 'The headline overstates the numbers.');

    const [, changes] = update.mock.calls[0] as [
      string,
      { $set: Record<string, unknown>; $unset: Record<string, unknown> },
    ];
    // Rejection is not deletion: the submitter needs to see what to change.
    expect(changes.$set.status).toBe('cancelled');
    expect(changes.$set.rejectedBy).toBe('user-admin');
    expect(changes.$set.rejectionReason).toBe('The headline overstates the numbers.');
    expect(changes.$unset.nextAttemptAt).toBe(1);
  });

  it('refuses anything that is not waiting for approval', async () => {
    vi.spyOn(SocialPublicationModel, 'findById').mockReturnValue({
      exec: vi.fn().mockResolvedValue(held({ status: 'queued' })),
    } as never);

    await expect(build().reject('pub-1', 'user-admin', 'no')).rejects.toThrow('not waiting');
  });
});

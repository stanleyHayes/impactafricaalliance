import type { PersonSummary } from '@iaa/shared';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppLogger } from '../../config/logger.js';
import type { PeopleService } from '../people/people.service.js';

import { AuditEventModel } from './audit.model.js';
import { AuditService } from './audit.service.js';

const actorId = new Types.ObjectId();
const ama: PersonSummary = {
  id: actorId.toHexString(),
  name: 'Ama Boateng',
  email: 'ama@iaa.org',
  role: 'editor',
};

const build = () => {
  const logger = { error: vi.fn() };
  const people = { summaries: vi.fn().mockResolvedValue(new Map([[ama.id, ama]])) };
  const service = new AuditService(
    people as unknown as PeopleService,
    logger as unknown as AppLogger,
  );
  return { service, logger, people };
};

const input = {
  module: 'projects' as const,
  entityType: 'project',
  entityId: new Types.ObjectId().toHexString(),
  action: 'updated' as const,
  actorId: actorId.toHexString(),
  actorEmail: 'ama@iaa.org',
  summary: 'Updated the project',
  changes: [{ field: 'status', from: 'draft', to: 'active' }],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuditService.record', () => {
  it('writes the entry with the actor taken from the caller', async () => {
    const create = vi.spyOn(AuditEventModel, 'create').mockResolvedValue([] as never);
    const { service } = build();
    await service.record(input);
    expect(create).toHaveBeenCalledTimes(1);
    const written = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written).toMatchObject({
      module: 'projects',
      entityType: 'project',
      entityId: input.entityId,
      action: 'updated',
      actorEmail: 'ama@iaa.org',
      summary: 'Updated the project',
      changes: input.changes,
    });
    expect(String(written.actorId)).toBe(actorId.toHexString());
    expect(written.at).toBeInstanceOf(Date);
  });

  it('never throws when the write fails, and logs instead', async () => {
    vi.spyOn(AuditEventModel, 'create').mockRejectedValue(new Error('database asleep'));
    const { service, logger } = build();
    await expect(service.record(input)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'projects', entityId: input.entityId, action: 'updated' }),
      'Failed to record audit event',
    );
  });

  it('keeps the email but drops an actor id that cannot name an account', async () => {
    const create = vi.spyOn(AuditEventModel, 'create').mockResolvedValue([] as never);
    const { service } = build();
    await service.record({ ...input, actorId: 'twelve-chars' });
    const written = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written.actorId).toBeUndefined();
    expect(written.actorEmail).toBe('ama@iaa.org');
  });

  it('caps an over-long summary', async () => {
    const create = vi.spyOn(AuditEventModel, 'create').mockResolvedValue([] as never);
    const { service } = build();
    await service.record({ ...input, summary: 'x'.repeat(2000) });
    const written = create.mock.calls[0]?.[0] as { summary: string };
    expect(written.summary).toHaveLength(500);
  });
});

describe('AuditService.list', () => {
  it('returns a page of entries, newest first, with actors resolved', async () => {
    const at = new Date('2026-10-05T09:30:00.000Z');
    const stored = [
      {
        _id: new Types.ObjectId(),
        module: 'projects',
        entityType: 'project',
        entityId: input.entityId,
        action: 'status-changed',
        actorId,
        actorEmail: 'ama@iaa.org',
        summary: 'Moved to Active',
        changes: [{ field: 'status', from: 'draft', to: 'active' }],
        at,
      },
      {
        _id: new Types.ObjectId(),
        module: 'projects',
        entityType: 'project',
        entityId: input.entityId,
        action: 'created',
        actorId: new Types.ObjectId(),
        summary: 'Created the project',
        changes: [],
        at,
      },
    ];
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(stored),
    };
    const find = vi
      .spyOn(AuditEventModel, 'find')
      .mockReturnValue(chain as unknown as ReturnType<typeof AuditEventModel.find>);
    vi.spyOn(AuditEventModel, 'countDocuments').mockReturnValue({
      exec: vi.fn().mockResolvedValue(12),
    } as unknown as ReturnType<typeof AuditEventModel.countDocuments>);
    const { service, people } = build();

    const page = await service.list('project', input.entityId, 2, 10);

    expect(find).toHaveBeenCalledWith({ entityType: 'project', entityId: input.entityId });
    expect(chain.sort).toHaveBeenCalledWith({ at: -1, _id: -1 });
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(people.summaries).toHaveBeenCalledTimes(1);
    expect(page).toMatchObject({ page: 2, pageSize: 10, total: 12, totalPages: 2 });
    expect(page.items[0]).toEqual({
      id: stored[0]?._id.toString(),
      module: 'projects',
      entityType: 'project',
      entityId: input.entityId,
      action: 'status-changed',
      actor: ama,
      actorEmail: 'ama@iaa.org',
      summary: 'Moved to Active',
      changes: [{ field: 'status', from: 'draft', to: 'active' }],
      at: '2026-10-05T09:30:00.000Z',
    });
    // An actor whose account is gone reads as null, and an empty change list is left out.
    expect(page.items[1]?.actor).toBeNull();
    expect(page.items[1]).not.toHaveProperty('changes');
  });
});

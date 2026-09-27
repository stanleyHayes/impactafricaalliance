import { projectListQuerySchema, projectUpdateSchema } from '@iaa/shared';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConflictError } from '../../common/errors.js';
import type { AppLogger } from '../../config/logger.js';
import type { AuditService } from '../audit/audit.service.js';
import { ImpactStoryModel } from '../impact-stories/impact-story.model.js';
import type { PeopleService } from '../people/people.service.js';
import { TaskModel } from '../tasks/task.model.js';

import type { StoredProject } from './project-changes.js';
import { ProjectModel } from './project.model.js';
import { ProjectService } from './project.service.js';

const actor = { id: new Types.ObjectId().toHexString(), email: 'ama@iaa.org' };
const earlier = new Date('2026-10-01T08:00:00.000Z');

const stored = (overrides: Partial<StoredProject> = {}): StoredProject => ({
  _id: new Types.ObjectId(),
  title: 'Digital Skills Hub',
  slug: 'digital-skills-hub',
  summary: 'Coding and e-commerce training for young people.',
  description: '',
  status: 'active',
  priority: 'medium',
  memberIds: [],
  objectives: [],
  partners: [],
  tags: [],
  sdgs: [],
  milestones: [],
  metrics: [],
  risks: [],
  media: [],
  documents: [],
  createdAt: earlier,
  updatedAt: earlier,
  ...overrides,
});

// A Mongoose query as far as the service uses it: `.lean().exec()` or `.exec()`.
const query = <T>(value: T) => {
  const exec = vi.fn().mockResolvedValue(value);
  return { exec, lean: () => ({ exec }), collation: vi.fn() };
};

const build = () => {
  const people = {
    summaries: vi.fn().mockResolvedValue(new Map()),
    assertActive: vi.fn().mockResolvedValue(undefined),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined), list: vi.fn() };
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
  const service = new ProjectService(
    people as unknown as PeopleService,
    audit as unknown as AuditService,
    logger as unknown as AppLogger,
  );
  return { service, people, audit, logger };
};

// What `present` asks for after a write: task counts and the story count.
const stubPresent = (): void => {
  vi.spyOn(TaskModel, 'aggregate').mockReturnValue(query([]) as never);
  vi.spyOn(ImpactStoryModel, 'countDocuments').mockReturnValue(query(0) as never);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProjectService.remove', () => {
  it('refuses while tasks point at the project, and deletes nothing', async () => {
    const project = stored();
    vi.spyOn(ProjectModel, 'findById').mockReturnValue(query(project) as never);
    vi.spyOn(TaskModel, 'countDocuments').mockReturnValue(query(2) as never);
    vi.spyOn(ImpactStoryModel, 'countDocuments').mockReturnValue(query(0) as never);
    const deleteOne = vi.spyOn(ProjectModel, 'deleteOne');
    const { service, audit } = build();
    await expect(service.remove(project._id.toHexString(), actor)).rejects.toThrow(
      /2 tasks linked to it\. Archive it instead/,
    );
    expect(deleteOne).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('deletes a project nothing points at and logs who did it', async () => {
    const project = stored();
    vi.spyOn(ProjectModel, 'findById').mockReturnValue(query(project) as never);
    vi.spyOn(TaskModel, 'countDocuments').mockReturnValue(query(0) as never);
    vi.spyOn(ImpactStoryModel, 'countDocuments').mockReturnValue(query(0) as never);
    const deleteOne = vi
      .spyOn(ProjectModel, 'deleteOne')
      .mockReturnValue(query({ deletedCount: 1 }) as never);
    const { service, audit } = build();
    await service.remove(project._id.toHexString(), actor);
    expect(deleteOne).toHaveBeenCalledWith({ _id: project._id });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deleted',
        entityType: 'project',
        actorId: actor.id,
        actorEmail: actor.email,
        summary: 'Deleted the project "Digital Skills Hub"',
      }),
    );
  });
});

describe('ProjectService.update', () => {
  it('checks only the people being added, so a departed member does not block edits', async () => {
    const stayed = new Types.ObjectId();
    const lead = new Types.ObjectId();
    const joining = new Types.ObjectId().toHexString();
    const project = stored({ leadId: lead, memberIds: [stayed] });
    vi.spyOn(ProjectModel, 'findById').mockReturnValue(query(project) as never);
    vi.spyOn(ProjectModel, 'findOneAndUpdate').mockReturnValue(query(project) as never);
    stubPresent();
    const { service, people } = build();
    await service.update(
      project._id.toHexString(),
      projectUpdateSchema.parse({
        leadId: lead.toHexString(),
        memberIds: [stayed.toHexString(), joining],
      }),
      actor,
    );
    expect(people.assertActive).toHaveBeenCalledTimes(1);
    expect(people.assertActive).toHaveBeenCalledWith([joining], 'Project members');
  });

  it('only writes a status move if the status is still what was checked', async () => {
    const project = stored({ status: 'planned' });
    vi.spyOn(ProjectModel, 'findById').mockReturnValue(query(project) as never);
    const write = vi.spyOn(ProjectModel, 'findOneAndUpdate').mockReturnValue(query(null) as never);
    vi.spyOn(ProjectModel, 'exists').mockReturnValue(query({ _id: project._id }) as never);
    const { service, audit } = build();
    await expect(
      service.update(
        project._id.toHexString(),
        projectUpdateSchema.parse({ status: 'active' }),
        actor,
      ),
    ).rejects.toThrow(ConflictError);
    expect(write.mock.calls[0]?.[0]).toEqual({ _id: project._id, status: 'planned' });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('logs a status move and the other edits as separate lines', async () => {
    const project = stored({ status: 'planned' });
    vi.spyOn(ProjectModel, 'findById').mockReturnValue(query(project) as never);
    vi.spyOn(ProjectModel, 'findOneAndUpdate').mockReturnValue(
      query({ ...project, status: 'active', title: 'Hub, Tamale' }) as never,
    );
    stubPresent();
    const { service, audit } = build();
    await service.update(
      project._id.toHexString(),
      projectUpdateSchema.parse({ status: 'active', title: 'Hub, Tamale' }),
      actor,
    );
    const actions = audit.record.mock.calls.map(([entry]) => (entry as { action: string }).action);
    expect(actions).toEqual(['status-changed', 'updated']);
  });
});

describe('ProjectService.update and milestones', () => {
  const plan = [
    { id: 'launch', kind: 'milestone' as const, title: 'Launch', status: 'done' as const },
    { id: 'cohort', kind: 'milestone' as const, title: 'Cohort', status: 'planned' as const },
  ];

  it('unlinks tasks from a milestone the plan no longer has, and leaves the rest alone', async () => {
    const project = stored({ milestones: plan });
    vi.spyOn(ProjectModel, 'findById').mockReturnValue(query(project) as never);
    vi.spyOn(ProjectModel, 'findOneAndUpdate').mockReturnValue(query(project) as never);
    stubPresent();
    const unlink = vi.spyOn(TaskModel, 'updateMany').mockReturnValue(query({}) as never);
    const { service } = build();
    await service.update(
      project._id.toHexString(),
      projectUpdateSchema.parse({ milestones: [{ id: 'launch', title: 'Launch' }] }),
      actor,
    );
    expect(unlink).toHaveBeenCalledTimes(1);
    expect(unlink.mock.calls[0]?.[0]).toEqual({
      projectId: project._id,
      milestoneId: { $in: ['cohort'] },
    });
    expect(unlink.mock.calls[0]?.[1]).toEqual({ $unset: { milestoneId: 1 } });

    unlink.mockClear();
    await service.update(
      project._id.toHexString(),
      projectUpdateSchema.parse({ title: 'A new title' }),
      actor,
    );
    expect(unlink).not.toHaveBeenCalled();
  });

  it('still reports the save when unlinking fails, and logs why', async () => {
    const project = stored({ milestones: plan });
    vi.spyOn(ProjectModel, 'findById').mockReturnValue(query(project) as never);
    vi.spyOn(ProjectModel, 'findOneAndUpdate').mockReturnValue(query(project) as never);
    stubPresent();
    const broken = { exec: vi.fn().mockRejectedValue(new Error('connection reset')) };
    vi.spyOn(TaskModel, 'updateMany').mockReturnValue(broken as never);
    const { service, logger } = build();
    await expect(
      service.update(
        project._id.toHexString(),
        projectUpdateSchema.parse({ milestones: [] }),
        actor,
      ),
    ).resolves.toMatchObject({ id: project._id.toHexString() });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'projects', entityId: project._id.toHexString() }),
      expect.any(String),
    );
  });
});

describe('ProjectService.list', () => {
  it('counts the tasks of every project on the page in one aggregate', async () => {
    const lead = new Types.ObjectId();
    const records = [stored({ leadId: lead }), stored()];
    const aggregate = query(records);
    vi.spyOn(ProjectModel, 'aggregate').mockReturnValue(aggregate as never);
    vi.spyOn(ProjectModel, 'countDocuments').mockReturnValue(query(2) as never);
    const counts = vi
      .spyOn(TaskModel, 'aggregate')
      .mockReturnValue(query([{ _id: records[0]?._id, total: 4, done: 1, overdue: 1 }]) as never);
    const { service, people } = build();
    const page = await service.list(
      projectListQuerySchema.parse({ sort: 'title' }),
      actor,
      '2026-10-10',
    );
    expect(counts).toHaveBeenCalledTimes(1);
    expect(people.summaries).toHaveBeenCalledTimes(1);
    expect(aggregate.collation).toHaveBeenCalledWith({ locale: 'en', strength: 1 });
    expect(page.total).toBe(2);
    expect(page.items[0]?.taskCounts).toEqual({ total: 4, done: 1, open: 3, overdue: 1 });
    expect(page.items[1]?.taskCounts).toEqual({ total: 0, done: 0, open: 0, overdue: 0 });
  });
});

describe('ProjectService.addMedia', () => {
  it('refuses a photo once the list is full', async () => {
    vi.spyOn(ProjectModel, 'updateOne').mockReturnValue(query({ matchedCount: 0 }) as never);
    vi.spyOn(ProjectModel, 'exists').mockReturnValue(query({ _id: 'x' }) as never);
    const { service, audit } = build();
    await expect(
      service.addMedia(
        new Types.ObjectId().toHexString(),
        {
          image: { url: 'https://res.cloudinary.com/demo/a.jpg', publicId: 'a' },
          shareable: false,
        },
        actor,
      ),
    ).rejects.toThrow(/already holds 200 photos/);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

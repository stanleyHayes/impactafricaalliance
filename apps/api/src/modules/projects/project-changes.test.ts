import {
  dueBucket,
  projectInputSchema,
  projectUpdateSchema,
  type PersonSummary,
} from '@iaa/shared';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { ConflictError, ValidationError } from '../../common/errors.js';

import {
  applyMediaPatch,
  buildProjectCreate,
  buildProjectUpdate,
  deleteRefusal,
  mediaPatchOperators,
  mediaUpdateSummary,
  removedMilestoneIds,
  stampMilestones,
  statusAuditAction,
  statusAuditSummary,
  updateAuditSummary,
  type StoredProject,
} from './project-changes.js';
import { auditView, EMPTY_TASK_COUNTS, toProjectDto, toProjectListItem } from './project-dto.js';
import {
  projectListFilter,
  projectListPipeline,
  startOfUtcDay,
  taskCountsPipeline,
} from './project-query.js';

const actorId = new Types.ObjectId().toHexString();
const now = new Date('2026-10-10T09:30:00.000Z');
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

const update = (body: unknown) => projectUpdateSchema.parse(body);

describe('stampMilestones', () => {
  const previous = [
    {
      id: 'kept',
      kind: 'milestone' as const,
      title: 'Kept',
      status: 'done' as const,
      completedAt: earlier,
    },
    {
      id: 'reopened',
      kind: 'milestone' as const,
      title: 'Reopened',
      status: 'done' as const,
      completedAt: earlier,
    },
  ];

  it('stamps the first time an item is done, keeps the date while it stays done, and drops it when reopened', () => {
    const next = projectInputSchema.parse({
      title: 'Digital Skills Hub',
      slug: 'hub',
      summary: 'Coding and e-commerce training.',
      milestones: [
        { id: 'kept', title: 'Kept', status: 'done' },
        { id: 'reopened', title: 'Reopened', status: 'in-progress' },
        {
          id: 'fresh',
          title: 'Fresh',
          status: 'done',
          // Whatever the client says, the server decides when it was finished.
          completedAt: '2020-01-01T00:00:00.000Z',
          dueDate: '2026-10-05T12:00:00.000Z',
          description: '',
        },
      ],
    }).milestones;
    const result = stampMilestones(previous, next, now);
    expect(result[0]?.completedAt).toBe(earlier);
    expect(result[1]).not.toHaveProperty('completedAt');
    expect(result[2]?.completedAt).toBe(now);
    expect(result[2]?.dueDate).toEqual(new Date('2026-10-05T12:00:00.000Z'));
    expect(result[2]).not.toHaveProperty('description');
  });
});

describe('buildProjectCreate', () => {
  it('leaves empty optional values out and stamps the creator', () => {
    const input = projectInputSchema.parse({
      title: 'Digital Skills Hub',
      slug: 'hub',
      summary: 'Coding and e-commerce training.',
      leadId: null,
      programme: null,
      startDate: '2026-10-05T12:00:00.000Z',
      endDate: '',
      metrics: [{ id: 'trained', label: 'People trained', value: 12, target: null }],
    });
    const doc = buildProjectCreate(input, actorId, now);
    expect(doc).not.toHaveProperty('leadId');
    expect(doc).not.toHaveProperty('programme');
    expect(doc).not.toHaveProperty('endDate');
    expect(doc.startDate).toEqual(new Date('2026-10-05T12:00:00.000Z'));
    expect(doc.metrics).toEqual([{ id: 'trained', label: 'People trained', value: 12 }]);
    expect(String(doc.createdBy)).toBe(actorId);
    expect(doc).not.toHaveProperty('archivedAt');
  });

  it('refuses an end before the start', () => {
    const input = projectInputSchema.parse({
      title: 'Digital Skills Hub',
      slug: 'hub',
      summary: 'Coding and e-commerce training.',
      startDate: '2026-10-05T12:00:00.000Z',
      endDate: '2026-10-01T12:00:00.000Z',
    });
    expect(() => buildProjectCreate(input, actorId, now)).toThrow(ValidationError);
  });
});

describe('buildProjectUpdate', () => {
  it('removes cleared fields and leaves absent ones alone', () => {
    const write = buildProjectUpdate(
      stored({ code: 'DSH', country: 'Ghana' }),
      update({ code: null, leadId: null, startDate: null, title: 'Renamed hub' }),
      actorId,
      now,
    );
    expect(write.$unset).toEqual({ code: 1, leadId: 1, startDate: 1 });
    expect(write.$set).toMatchObject({ title: 'Renamed hub' });
    expect(write.$set).not.toHaveProperty('country');
    expect(String(write.$set.updatedBy)).toBe(actorId);
  });

  it('sends no $unset when nothing is cleared', () => {
    expect(
      buildProjectUpdate(stored(), update({ priority: 'high' }), actorId, now),
    ).not.toHaveProperty('$unset');
  });

  it('does not credit an edit to an id that is not a user id', () => {
    const write = buildProjectUpdate(stored(), update({ priority: 'high' }), 'not-an-id', now);
    expect(write.$set).not.toHaveProperty('updatedBy');
  });

  it('remembers where an archived project came from, and forgets it on restore', () => {
    const archived = buildProjectUpdate(
      stored({ status: 'on-hold' }),
      update({ status: 'archived' }),
      actorId,
      now,
    );
    expect(archived.$set).toMatchObject({
      status: 'archived',
      archivedAt: now,
      archivedFromStatus: 'on-hold',
    });

    const restored = buildProjectUpdate(
      stored({ status: 'archived', archivedAt: earlier, archivedFromStatus: 'on-hold' }),
      update({ status: 'on-hold' }),
      actorId,
      now,
    );
    expect(restored.$unset).toEqual({ archivedAt: 1, archivedFromStatus: 1 });
  });

  it('refuses a move the lifecycle forbids', () => {
    expect(() =>
      buildProjectUpdate(
        stored({ status: 'draft' }),
        update({ status: 'completed' }),
        actorId,
        now,
      ),
    ).toThrow(new ConflictError('A project cannot move from Draft to Completed.'));
  });

  it('checks the dates of the merged record', () => {
    const project = stored({ startDate: new Date('2026-10-05T12:00:00.000Z') });
    expect(() =>
      buildProjectUpdate(project, update({ endDate: '2026-10-01T12:00:00.000Z' }), actorId, now),
    ).toThrow(ValidationError);
    // Clearing the start makes any end acceptable.
    expect(() =>
      buildProjectUpdate(
        project,
        update({ startDate: null, endDate: '2026-10-01T12:00:00.000Z' }),
        actorId,
        now,
      ),
    ).not.toThrow();
  });

  it('keeps milestone completion dates across an edit', () => {
    const project = stored({
      milestones: [
        { id: 'launch', kind: 'milestone', title: 'Launch', status: 'done', completedAt: earlier },
      ],
    });
    const write = buildProjectUpdate(
      project,
      update({ milestones: [{ id: 'launch', title: 'Launch the hub', status: 'done' }] }),
      actorId,
      now,
    );
    expect(write.$set.milestones).toEqual([
      {
        id: 'launch',
        kind: 'milestone',
        title: 'Launch the hub',
        status: 'done',
        completedAt: earlier,
      },
    ]);
  });
});

describe('calendar days and repeated entries', () => {
  it('stores every calendar date at noon UTC, whatever time of day was sent', () => {
    const input = projectInputSchema.parse({
      title: 'Digital Skills Hub',
      slug: 'hub',
      summary: 'Coding and e-commerce training.',
      startDate: '2026-10-05T00:00:00.000Z',
      endDate: '2026-10-05T23:59:00.000Z',
      milestones: [{ id: 'launch', title: 'Launch', dueDate: '2026-11-01T06:30:00.000Z' }],
    });
    const doc = buildProjectCreate(input, actorId, now);
    expect(doc.startDate).toEqual(new Date('2026-10-05T12:00:00.000Z'));
    expect(doc.endDate).toEqual(new Date('2026-10-05T12:00:00.000Z'));
    expect((doc.milestones as { dueDate?: Date }[])[0]?.dueDate).toEqual(
      new Date('2026-11-01T12:00:00.000Z'),
    );

    const write = buildProjectUpdate(
      stored(),
      update({ endDate: '2027-06-30T22:00:00.000Z' }),
      actorId,
      now,
    );
    expect(write.$set.endDate).toEqual(new Date('2027-06-30T12:00:00.000Z'));
    expect(mediaPatchOperators({ takenOn: '2026-10-05T01:00:00.000Z' }, actorId).$set).toEqual(
      expect.objectContaining({ 'media.$.takenOn': new Date('2026-10-05T12:00:00.000Z') }),
    );
  });

  it('compares the days that will be stored, so the same day twice is never out of order', () => {
    const project = stored({ startDate: new Date('2026-10-05T12:00:00.000Z') });
    expect(() =>
      buildProjectUpdate(project, update({ endDate: '2026-10-05T01:00:00.000Z' }), actorId, now),
    ).not.toThrow();
  });

  it('keeps one of each member, goal and tag', () => {
    const member = new Types.ObjectId().toHexString();
    const input = projectInputSchema.parse({
      title: 'Digital Skills Hub',
      slug: 'hub',
      summary: 'Coding and e-commerce training.',
      memberIds: [member, member],
      sdgs: [4, 4, 8],
      tags: ['youth', 'youth'],
    });
    const doc = buildProjectCreate(input, actorId, now);
    expect(doc.memberIds).toEqual([member]);
    expect(doc.sdgs).toEqual([4, 8]);
    expect(doc.tags).toEqual(['youth']);
    const write = buildProjectUpdate(
      stored(),
      update({ memberIds: [member, member] }),
      actorId,
      now,
    );
    expect(write.$set.memberIds).toEqual([member]);
  });
});

describe('removedMilestoneIds', () => {
  const project = stored({
    milestones: [
      { id: 'launch', kind: 'milestone', title: 'Launch', status: 'done' },
      { id: 'cohort', kind: 'activity', title: 'Cohort', status: 'planned' },
    ],
  });

  it('names the milestones a new list leaves out', () => {
    expect(
      removedMilestoneIds(project, update({ milestones: [{ id: 'cohort', title: 'Cohort' }] })),
    ).toEqual(['launch']);
    expect(removedMilestoneIds(project, update({ milestones: [] }))).toEqual(['launch', 'cohort']);
  });

  it('names nothing when the milestones are not part of the change', () => {
    expect(removedMilestoneIds(project, update({ title: 'Renamed hub' }))).toEqual([]);
  });
});

describe('activity log wording', () => {
  it('names status moves', () => {
    expect(statusAuditAction('active', 'archived')).toBe('archived');
    expect(statusAuditAction('archived', 'draft')).toBe('restored');
    expect(statusAuditAction('planned', 'active')).toBe('status-changed');
    expect(statusAuditSummary('active', 'archived')).toBe('Archived the project (it was Active)');
    expect(statusAuditSummary('archived', 'on-hold')).toBe('Restored the project to On hold');
    expect(statusAuditSummary('planned', 'active')).toBe(
      'Moved the project from Planned to Active',
    );
  });

  it('lists edited fields in words', () => {
    expect(updateAuditSummary(['title'])).toBe('Edited the title');
    expect(updateAuditSummary(['title', 'leadId', 'startDate'])).toBe(
      'Edited the title, lead and start date',
    );
  });

  it('shows people by name, dates as days and lists as lines, keeping null and absence apart', () => {
    const ama = new Types.ObjectId();
    const people = new Map<string, PersonSummary>([
      [
        ama.toHexString(),
        { id: ama.toHexString(), name: 'Ama Boateng', email: 'ama@iaa.org', role: 'editor' },
      ],
    ]);
    const before = auditView(
      stored({
        leadId: ama,
        startDate: new Date('2026-10-05T12:00:00.000Z'),
        milestones: [{ id: 'm', kind: 'milestone', title: 'Launch', status: 'planned' }],
      }) as unknown as Record<string, unknown>,
      people,
    );
    expect(before).toMatchObject({
      leadId: 'Ama Boateng',
      startDate: '2026-10-05',
      milestones: ['Launch (planned)'],
    });
    const after = auditView({ leadId: null, startDate: '2026-10-05T12:00:00.000Z' }, people);
    expect(after).toEqual({ leadId: null, startDate: '2026-10-05' });
  });
});

describe('deleteRefusal', () => {
  it('allows a project nothing points at', () => {
    expect(deleteRefusal(0, 0)).toBeNull();
  });

  it('counts what is linked and says to archive instead', () => {
    expect(deleteRefusal(3, 1)).toBe(
      'This project has 3 tasks and 1 impact story linked to it. Archive it instead: ' +
        'it leaves every list, and its tasks and stories keep their link.',
    );
    expect(deleteRefusal(0, 2)).toMatch(/^This project has 2 impact stories linked/);
  });
});

describe('photo details', () => {
  const photo = {
    id: 'photo-1',
    image: { url: 'https://res.cloudinary.com/demo/a.jpg', publicId: 'a' },
    caption: 'Opening day',
    takenOn: earlier,
    shareable: false,
    addedAt: earlier,
  };

  it('updates the matched photo in place and removes cleared details', () => {
    const write = mediaPatchOperators({ caption: null, shareable: true }, actorId);
    expect(write.$set).toMatchObject({ 'media.$.shareable': true });
    expect(write.$unset).toEqual({ 'media.$.caption': 1 });
    const after = applyMediaPatch(photo, { caption: null, shareable: true });
    expect(after.caption).toBeUndefined();
    expect(after.takenOn).toBe(earlier);
  });

  it('says when consent changes', () => {
    expect(mediaUpdateSummary(photo, { ...photo, shareable: true })).toBe(
      'Cleared "Opening day" for public use',
    );
    expect(mediaUpdateSummary({ shareable: true }, { shareable: false })).toBe(
      'Withdrew a photo from public use',
    );
    expect(mediaUpdateSummary(photo, photo)).toBe('Edited the details of "Opening day"');
  });
});

describe('projectListFilter', () => {
  // Only the filter fields matter here; paging and sorting are the pipeline's.
  const base: Parameters<typeof projectListFilter>[0] = {};

  it('leaves archived projects out unless asked', () => {
    expect(projectListFilter(base, actorId)).toEqual({ status: { $ne: 'archived' } });
    expect(projectListFilter({ ...base, includeArchived: true }, actorId)).toEqual({});
    expect(projectListFilter({ ...base, status: 'archived' }, actorId)).toEqual({
      status: 'archived',
    });
  });

  it('searches literally and combines filters', () => {
    const filter = projectListFilter({ ...base, q: 'a.*b', priority: 'high' }, actorId) as {
      $and: Record<string, unknown>[];
    };
    expect(filter.$and).toHaveLength(3);
    const search = filter.$and[2] as { $or: { title: RegExp }[] };
    expect(search.$or[0]?.title.test('A.*B project')).toBe(true);
    expect(search.$or[0]?.title.test('aXXb')).toBe(false);
  });

  it('matches my projects by lead or membership, and nothing for a caller without a user id', () => {
    const mine = projectListFilter({ ...base, mine: true, includeArchived: true }, actorId) as {
      $or: Record<string, Types.ObjectId>[];
    };
    expect(mine.$or.map((clause) => Object.keys(clause)[0])).toEqual(['leadId', 'memberIds']);
    expect(String(mine.$or[0]?.leadId)).toBe(actorId);
    expect(projectListFilter({ ...base, mine: true, includeArchived: true }, 'nobody')).toEqual({
      _id: { $exists: false },
    });
  });
});

describe('projectListPipeline', () => {
  it('pages after sorting, and puts undated projects last on a date sort', () => {
    const pipeline = projectListPipeline({}, 'start', 3, 10);
    const stages = pipeline.map((stage) => Object.keys(stage)[0]);
    expect(stages).toEqual([
      '$match',
      '$project',
      '$addFields',
      '$sort',
      '$skip',
      '$limit',
      '$project',
    ]);
    expect(pipeline[3]).toEqual({ $sort: { undated: 1, startDate: 1, _id: 1 } });
    expect(pipeline[4]).toEqual({ $skip: 20 });
  });

  it('sorts by the latest change by default', () => {
    expect(projectListPipeline({}, 'updated', 1, 20)[2]).toEqual({
      $sort: { updatedAt: -1, _id: -1 },
    });
  });
});

describe('task counts', () => {
  it('asks for every project on the page in one aggregate', () => {
    const ids = [new Types.ObjectId(), new Types.ObjectId()];
    const [match] = taskCountsPipeline(ids, '2026-10-10');
    expect(match).toEqual({ $match: { projectId: { $in: ids }, archivedAt: null } });
  });

  it('draws the overdue line exactly where dueBucket does', () => {
    const today = '2026-10-10';
    for (const due of [
      '2026-10-09T12:00:00.000Z',
      '2026-10-09T23:59:59.999Z',
      '2026-10-10T00:00:00.000Z',
      '2026-10-10T12:00:00.000Z',
      '2026-10-11T12:00:00.000Z',
    ]) {
      const overdue = new Date(due) < startOfUtcDay(today);
      expect(overdue).toBe(dueBucket(due, today) === 'overdue');
    }
  });
});

describe('project DTOs', () => {
  it('states nullable fields as null and leaves empty text out', () => {
    const record = stored({
      milestones: [
        { id: 'm', kind: 'milestone', title: 'Launch', status: 'done', completedAt: earlier },
      ],
      progressOverride: null,
    });
    const dto = toProjectDto(record, {
      people: new Map(),
      members: [],
      taskCounts: EMPTY_TASK_COUNTS,
      storyCount: 2,
    });
    expect(dto).toMatchObject({
      id: record._id.toHexString(),
      leadId: null,
      lead: null,
      programme: null,
      startDate: null,
      cover: null,
      progressOverride: null,
      archivedAt: null,
      archivedFromStatus: null,
      storyCount: 2,
      progress: { value: 100, source: 'tasks-and-milestones', done: 1, total: 1 },
    });
    expect(dto).not.toHaveProperty('code');
    expect(dto).not.toHaveProperty('country');
    expect(dto.milestones[0]).toEqual({
      id: 'm',
      kind: 'milestone',
      title: 'Launch',
      status: 'done',
      dueDate: null,
      completedAt: earlier.toISOString(),
    });
  });

  it('builds list rows with progress and counts', () => {
    const counts = { total: 4, done: 1, open: 3, overdue: 2 };
    const row = toProjectListItem(stored({ code: 'DSH' }), new Map(), counts);
    expect(row).toMatchObject({ code: 'DSH', taskCounts: counts, progress: { value: 25 } });
    expect(row).not.toHaveProperty('description');
  });
});

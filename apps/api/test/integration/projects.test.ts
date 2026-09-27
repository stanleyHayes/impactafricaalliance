import type { Server } from 'node:http';

import {
  ROLE_TEMPLATES,
  toCalendarDateIso,
  todayKey,
  UserRole,
  type AuditEvent,
  type Paginated,
  type Permission,
  type Project,
  type ProjectListItem,
} from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { ImpactStoryModel } from '../../src/modules/impact-stories/impact-story.model.js';
import { ProjectModel } from '../../src/modules/projects/project.model.js';
import { TaskModel } from '../../src/modules/tasks/task.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
// The harness serves the app from one loopback-bound server for the whole file.
let server: Server;
const password = 'TestProjects2026!';
// Hashing is slow on purpose; one hash serves every account in this file.
let passwordHash: string;
const ids: Record<string, string> = {};
const tokens: Record<string, string> = {};

const addUser = async (
  key: string,
  fields: {
    name: string;
    email: string;
    role?: UserRole;
    isActive?: boolean;
    permissions?: Permission[];
  },
): Promise<void> => {
  const user = await UserModel.create({
    role: UserRole.Editor,
    permissions: [],
    ...fields,
    passwordHash,
  });
  ids[key] = user.id as string;
};

// Four logins in this file, well inside the shared login limiter (20 per 15 minutes).
const login = async (key: string, email: string): Promise<void> => {
  const result = await request(server).post('/api/auth/login').send({ email, password });
  tokens[key] = result.body.tokens.accessToken as string;
};

const BASE = '/api/admin/projects';
const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

const get = (who: string, path = '') => request(server).get(`${BASE}${path}`).set(as(who));
const post = (who: string, path: string, body: unknown) =>
  request(server)
    .post(`${BASE}${path}`)
    .set(as(who))
    .send(body as object);
const patch = (who: string, path: string, body: unknown) =>
  request(server)
    .patch(`${BASE}${path}`)
    .set(as(who))
    .send(body as object);
const del = (who: string, path: string) => request(server).delete(`${BASE}${path}`).set(as(who));

const image = (name: string) => ({
  url: `https://res.cloudinary.com/demo/image/upload/iaa/${name}.jpg`,
  publicId: `iaa/${name}`,
  width: 1200,
  height: 800,
});

const document = (name: string) => ({
  name,
  file: {
    url: `https://res.cloudinary.com/demo/raw/upload/iaa/documents/${name}`,
    publicId: `iaa/documents/${name}`,
    format: 'pdf',
    bytes: 2048,
    resourceType: 'raw',
    originalFilename: name,
  },
});

let slugCount = 0;
const newProject = (overrides: Record<string, unknown> = {}) => {
  slugCount += 1;
  return {
    title: `Project number ${slugCount}`,
    slug: `project-number-${slugCount}`,
    summary: 'Digital skills training for young people in the Northern Region.',
    ...overrides,
  };
};

const create = async (overrides: Record<string, unknown> = {}): Promise<Project> => {
  const response = await post('admin', '', newProject(overrides));
  expect(response.status).toBe(201);
  return response.body as Project;
};

const yesterday = (): string => {
  const date = new Date(`${todayKey()}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString();
};

beforeAll(async () => {
  ctx = await createTestContext();
  server = ctx.app;
  passwordHash = await new PasswordService().hash(password);
  await addUser('admin', {
    name: 'Adwoa Admin',
    email: 'adwoa.projects@iaa.org',
    role: UserRole.Admin,
    permissions: ROLE_TEMPLATES.admin,
  });
  await addUser('editor', {
    name: 'Esi Editor',
    email: 'esi.projects@iaa.org',
    permissions: ROLE_TEMPLATES.editor,
  });
  await addUser('reader', {
    name: 'Rashid Reader',
    email: 'rashid.projects@iaa.org',
    permissions: ['projects:read'],
  });
  await addUser('outsider', {
    name: 'Olu Outsider',
    email: 'olu.projects@iaa.org',
    permissions: ['articles:read'],
  });
  await addUser('ama', { name: 'Ama Boateng', email: 'ama.projects@iaa.org' });
  await addUser('gone', { name: 'Gone Away', email: 'gone.projects@iaa.org', isActive: false });
  await login('admin', 'adwoa.projects@iaa.org');
  await login('editor', 'esi.projects@iaa.org');
  await login('reader', 'rashid.projects@iaa.org');
  await login('outsider', 'olu.projects@iaa.org');
}, 60_000);

afterAll(async () => {
  await ctx?.teardown();
});

describe('project access', () => {
  it('needs a signed-in user', async () => {
    expect((await request(server).get(BASE)).status).toBe(401);
    expect((await request(server).post(BASE).send(newProject())).status).toBe(401);
  });

  it('checks the permission each route names', async () => {
    const project = await create();
    const path = `/${project.id}`;
    expect((await get('outsider')).status).toBe(403);
    expect((await get('outsider', path)).status).toBe(403);
    expect((await get('reader')).status).toBe(200);
    expect((await get('reader', path)).status).toBe(200);
    expect((await get('reader', `${path}/activity`)).status).toBe(200);
    expect((await post('reader', '', newProject())).status).toBe(403);
    expect((await patch('reader', path, { title: 'Renamed by a reader' })).status).toBe(403);
    expect((await del('reader', path)).status).toBe(403);
    expect((await post('reader', `${path}/media`, { image: image('reader') })).status).toBe(403);
    expect((await post('reader', `${path}/documents`, document('r.pdf'))).status).toBe(403);
    // Editors create and update, but never delete (plan D2).
    expect((await post('editor', '', newProject())).status).toBe(201);
    expect((await patch('editor', path, { priority: 'high' })).status).toBe(200);
    expect((await del('editor', path)).status).toBe(403);
  });
});

describe('project validation', () => {
  it('refuses a malformed project, id or schedule', async () => {
    const missing = await post('admin', '', { slug: 'no-title-here' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');
    expect((await get('admin', '/not-an-id')).status).toBe(400);
    expect((await get('admin', '?sort=cost')).status).toBe(400);
    const backwards = await post(
      'admin',
      '',
      newProject({
        startDate: toCalendarDateIso('2026-11-01'),
        endDate: toCalendarDateIso('2026-10-01'),
      }),
    );
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.message).toMatch(/end date is before the start date/);

    const project = await create({ startDate: toCalendarDateIso('2026-10-01') });
    // Only one date moves, but the check is on the merged record.
    const moved = await patch('admin', `/${project.id}`, {
      endDate: toCalendarDateIso('2026-09-01'),
    });
    expect(moved.status).toBe(400);
  });

  it('only accepts active colleagues as lead and members', async () => {
    const inactiveLead = await post('admin', '', newProject({ leadId: ids.gone }));
    expect(inactiveLead.status).toBe(400);
    expect(inactiveLead.body.error.details).toEqual([ids.gone]);
    const nobody = await post('admin', '', newProject({ memberIds: ['64b7f0c2a1b2c3d4e5f60718'] }));
    expect(nobody.status).toBe(400);
  });

  it('answers 404 for a project that does not exist', async () => {
    const unknown = '/64b7f0c2a1b2c3d4e5f60718';
    expect((await get('admin', unknown)).status).toBe(404);
    expect((await patch('admin', unknown, { title: 'Nowhere project' })).status).toBe(404);
    expect((await del('admin', unknown)).status).toBe(404);
    expect((await post('admin', `${unknown}/media`, { image: image('x') })).status).toBe(404);
    expect((await get('admin', `${unknown}/activity`)).status).toBe(404);
  });

  it('refuses a slug another project already uses', async () => {
    await ProjectModel.init();
    const first = await create({ slug: 'taken-address' });
    const again = await post('admin', '', newProject({ slug: 'taken-address' }));
    expect(again.status).toBe(409);
    const other = await create();
    expect((await patch('admin', `/${other.id}`, { slug: 'taken-address' })).status).toBe(409);
    // Keeping its own slug is not a clash.
    expect((await patch('admin', `/${first.id}`, { slug: 'taken-address' })).status).toBe(200);
  });
});

describe('project lifecycle', () => {
  it('creates, reads, edits and clears a project', async () => {
    const created = await create({
      title: 'Digital Skills Hub, Tamale',
      slug: 'digital-skills-hub-tamale',
      code: 'DSH-2026',
      leadId: ids.ama,
      memberIds: [ids.editor, ids.ama],
      programme: 'digital-skills',
      startDate: toCalendarDateIso('2026-10-05'),
      country: 'Ghana',
      milestones: [
        { id: 'launch', title: 'Launch the hub', status: 'done' },
        { id: 'cohort', title: 'First cohort graduates' },
      ],
      partners: [{ name: 'Tamale Tech', url: 'https://tamaletech.example' }],
      sdgs: [4, 8],
    });
    expect(created.lead).toMatchObject({ id: ids.ama, name: 'Ama Boateng' });
    expect(created.members.map((member) => member.name)).toEqual(['Esi Editor', 'Ama Boateng']);
    expect(created.createdBy).toMatchObject({ id: ids.admin });
    expect(created.status).toBe('draft');
    expect(created.milestones[0]?.completedAt).toEqual(expect.any(String));
    expect(created.milestones[1]).toMatchObject({ status: 'planned', completedAt: null });
    expect(created.progress).toMatchObject({ value: 50, source: 'tasks-and-milestones' });

    const read = await get('reader', `/${created.id}`);
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({ code: 'DSH-2026', storyCount: 0, archivedAt: null });

    const cleared = await patch('editor', `/${created.id}`, {
      code: null,
      startDate: null,
      programme: null,
      leadId: null,
      summary: 'A training hub for young people in Tamale and the districts around it.',
    });
    expect(cleared.status).toBe(200);
    const body = cleared.body as Project;
    expect(body).not.toHaveProperty('code');
    expect(body).toMatchObject({ startDate: null, programme: null, leadId: null, lead: null });
    expect(body.updatedBy).toMatchObject({ id: ids.editor });
    // Cleared fields are removed, not stored as null.
    const stored = await ProjectModel.findById(created.id).lean().exec();
    expect(stored).not.toHaveProperty('code');
    expect(stored).not.toHaveProperty('startDate');
    expect(stored).not.toHaveProperty('leadId');
    // Untouched fields stay as they were.
    expect(stored?.country).toBe('Ghana');
    expect(stored?.milestones).toHaveLength(2);
  });

  it('archives, hides, restores and refuses moves the lifecycle forbids', async () => {
    const project = await create({ status: 'planned' });
    const path = `/${project.id}`;
    const skipped = await patch('admin', path, { status: 'completed' });
    expect(skipped.status).toBe(409);
    expect(skipped.body.error.message).toBe('A project cannot move from Planned to Completed.');

    expect((await patch('admin', path, { status: 'active' })).status).toBe(200);
    const archived = await patch('editor', path, { status: 'archived' });
    expect(archived.status).toBe(200);
    expect(archived.body).toMatchObject({ status: 'archived', archivedFromStatus: 'active' });
    expect(archived.body.archivedAt).toEqual(expect.any(String));

    const visible = (await get('admin', '?pageSize=100')).body as Paginated<ProjectListItem>;
    expect(visible.items.map((item) => item.id)).not.toContain(project.id);
    const everything = (await get('admin', '?includeArchived=true&pageSize=100'))
      .body as Paginated<ProjectListItem>;
    expect(everything.items.map((item) => item.id)).toContain(project.id);
    const archivedOnly = (await get('admin', '?status=archived&pageSize=100'))
      .body as Paginated<ProjectListItem>;
    expect(archivedOnly.items.every((item) => item.status === 'archived')).toBe(true);
    expect(archivedOnly.items.map((item) => item.id)).toContain(project.id);

    const restored = await patch('editor', path, { status: 'active' });
    expect(restored.status).toBe(200);
    expect(restored.body).toMatchObject({
      status: 'active',
      archivedAt: null,
      archivedFromStatus: null,
    });
  });

  it('stores calendar days at noon and unlinks tasks from a milestone taken off the plan', async () => {
    const project = await create({
      startDate: '2026-10-05T00:00:00.000Z',
      milestones: [
        { id: 'launch', title: 'Launch the hub', dueDate: '2026-11-01T23:00:00.000Z' },
        { id: 'cohort', title: 'First cohort graduates' },
      ],
    });
    expect(project.startDate).toBe('2026-10-05T12:00:00.000Z');
    expect(project.milestones[0]?.dueDate).toBe('2026-11-01T12:00:00.000Z');
    await TaskModel.create([
      {
        key: 'IAA-9201',
        number: 9201,
        title: 'Book the venue',
        projectId: project.id,
        milestoneId: 'launch',
      },
      {
        key: 'IAA-9202',
        number: 9202,
        title: 'Plan the cohort',
        projectId: project.id,
        milestoneId: 'cohort',
      },
    ]);

    const trimmed = await patch('editor', `/${project.id}`, {
      milestones: [{ id: 'cohort', title: 'First cohort graduates' }],
    });
    expect(trimmed.status).toBe(200);
    const venue = await TaskModel.findOne({ key: 'IAA-9201' }).lean().exec();
    const cohort = await TaskModel.findOne({ key: 'IAA-9202' }).lean().exec();
    // The task stays on the project; only the link to the missing milestone goes.
    expect(String(venue?.projectId)).toBe(project.id);
    expect(venue).not.toHaveProperty('milestoneId');
    expect(cohort?.milestoneId).toBe('cohort');
  });

  it('refuses to delete a project that tasks or stories point at', async () => {
    const linked = await create();
    await TaskModel.create({
      key: 'IAA-9001',
      number: 9001,
      title: 'Book the venue',
      projectId: linked.id,
    });
    const refused = await del('admin', `/${linked.id}`);
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toMatch(/1 task linked to it\. Archive it instead/);

    const storied = await create();
    await ImpactStoryModel.create({
      title: 'A story from the hub',
      slug: 'a-story-from-the-hub',
      excerpt: 'How the first cohort found work.',
      projectId: storied.id,
    });
    expect((await del('admin', `/${storied.id}`)).body.error.message).toMatch(/1 impact story/);

    const lonely = await create();
    expect((await del('admin', `/${lonely.id}`)).status).toBe(204);
    expect((await get('admin', `/${lonely.id}`)).status).toBe(404);
  });
});

describe('project list', () => {
  it('filters by search, status, priority, programme and my projects', async () => {
    const mine = await create({
      title: 'Coding club in Bolgatanga',
      code: 'BOLGA-01',
      priority: 'urgent',
      programme: 'stem-learning',
      leadId: ids.editor,
    });
    const member = await create({ title: 'Mentoring circle', memberIds: [ids.editor] });
    const others = await create({ title: 'Women in trade', status: 'active' });

    const search = (await get('admin', '?q=bolga')).body as Paginated<ProjectListItem>;
    expect(search.items.map((item) => item.id)).toEqual([mine.id]);
    expect(search.items[0]?.lead).toMatchObject({ name: 'Esi Editor' });
    // Search text is literal, never a pattern.
    expect(((await get('admin', '?q=.*')).body as Paginated<ProjectListItem>).total).toBe(0);
    const byCode = (await get('admin', '?q=BOLGA-01')).body as Paginated<ProjectListItem>;
    expect(byCode.items.map((item) => item.id)).toEqual([mine.id]);

    const urgent = (await get('admin', '?priority=urgent')).body as Paginated<ProjectListItem>;
    expect(urgent.items.map((item) => item.id)).toEqual([mine.id]);
    const stem = (await get('admin', '?programme=stem-learning'))
      .body as Paginated<ProjectListItem>;
    expect(stem.items.map((item) => item.id)).toEqual([mine.id]);
    const active = (await get('admin', '?status=active&pageSize=100'))
      .body as Paginated<ProjectListItem>;
    expect(active.items.map((item) => item.id)).toContain(others.id);
    expect(active.items.every((item) => item.status === 'active')).toBe(true);

    // Led by the editor, or with the editor as a member; never anyone else's.
    const my = (await get('editor', '?mine=true&pageSize=100')).body as Paginated<ProjectListItem>;
    const myIds = my.items.map((item) => item.id);
    expect(myIds).toEqual(expect.arrayContaining([mine.id, member.id]));
    expect(myIds).not.toContain(others.id);
    const theirs = (await get('reader', '?mine=true')).body as Paginated<ProjectListItem>;
    expect(theirs.total).toBe(0);

    const paged = (await get('admin', '?pageSize=2&page=2&sort=title'))
      .body as Paginated<ProjectListItem>;
    expect(paged).toMatchObject({ page: 2, pageSize: 2 });
    expect(paged.items).toHaveLength(2);
    expect(paged.totalPages).toBeGreaterThan(1);
  });

  it('counts progress and tasks from the tasks themselves', async () => {
    const project = await create({
      milestones: [
        { id: 'one', title: 'First milestone', status: 'done' },
        { id: 'two', title: 'Second milestone' },
      ],
    });
    const base = { projectId: project.id };
    await TaskModel.create([
      { ...base, key: 'IAA-9101', number: 9101, title: 'Done work', status: 'done' },
      { ...base, key: 'IAA-9102', number: 9102, title: 'Late work', dueDate: yesterday() },
      { ...base, key: 'IAA-9103', number: 9103, title: 'Open work' },
      {
        ...base,
        key: 'IAA-9104',
        number: 9104,
        title: 'Shelved work',
        status: 'done',
        archivedAt: new Date(),
      },
    ]);
    const detail = (await get('admin', `/${project.id}`)).body as Project;
    expect(detail.taskCounts).toEqual({ total: 3, done: 1, open: 2, overdue: 1 });
    // Two done (one task, one milestone) out of five.
    expect(detail.progress).toEqual({
      value: 40,
      source: 'tasks-and-milestones',
      done: 2,
      total: 5,
    });
    const list = (await get('admin', `?q=${encodeURIComponent(project.title)}`))
      .body as Paginated<ProjectListItem>;
    expect(list.items[0]?.taskCounts).toEqual(detail.taskCounts);
    expect(list.items[0]?.progress).toEqual(detail.progress);

    const manual = await patch('admin', `/${project.id}`, {
      progressOverride: { value: 75, reason: 'Training finished early' },
    });
    expect(manual.body.progress).toMatchObject({
      value: 75,
      source: 'manual',
      reason: 'Training finished early',
      done: 2,
      total: 5,
    });
    const counted = await patch('admin', `/${project.id}`, { progressOverride: null });
    expect(counted.body.progress.source).toBe('tasks-and-milestones');
  });
});

describe('project evidence', () => {
  it('adds, edits and removes photos', async () => {
    const project = await create();
    const path = `/${project.id}/media`;
    const added = await post('editor', path, {
      image: image('hub-opening'),
      caption: 'Opening day',
    });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({
      caption: 'Opening day',
      shareable: false,
      takenOn: null,
      addedBy: { id: ids.editor, name: 'Esi Editor' },
    });
    const itemId = added.body.id as string;

    const cleared = await patch('editor', `${path}/${itemId}`, {
      shareable: true,
      takenOn: toCalendarDateIso('2026-10-05'),
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({ shareable: true, caption: 'Opening day' });
    const uncaptioned = await patch('editor', `${path}/${itemId}`, { caption: null });
    expect(uncaptioned.body).not.toHaveProperty('caption');

    expect((await patch('editor', `${path}/photo-missing`, { shareable: true })).status).toBe(404);
    expect(
      (await post('editor', path, { image: { ...image('x'), url: 'http://x.example/a.jpg' } }))
        .status,
    ).toBe(400);

    const detail = (await get('admin', `/${project.id}`)).body as Project;
    expect(detail.media).toHaveLength(1);
    expect(detail.media[0]).toMatchObject({ id: itemId, shareable: true });

    expect((await del('editor', `${path}/${itemId}`)).status).toBe(204);
    expect((await del('editor', `${path}/${itemId}`)).status).toBe(404);
    expect(((await get('admin', `/${project.id}`)).body as Project).media).toHaveLength(0);
  });

  it('stops adding photos at the limit', async () => {
    const project = await create();
    const full = Array.from({ length: 200 }, (_, index) => ({
      id: `photo-${index}`,
      image: image(`bulk-${index}`),
      shareable: false,
      addedAt: new Date(),
    }));
    await ProjectModel.updateOne({ _id: project.id }, { $set: { media: full } }).exec();
    const refused = await post('admin', `/${project.id}/media`, { image: image('one-more') });
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toMatch(/already holds 200 photos/);
  });

  it('attaches and removes documents', async () => {
    const project = await create();
    const added = await post('editor', `/${project.id}/documents`, document('budget-2026.pdf'));
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({
      name: 'budget-2026.pdf',
      addedBy: { id: ids.editor },
      file: { format: 'pdf' },
    });
    const documentId = added.body.id as string;
    expect(((await get('admin', `/${project.id}`)).body as Project).documents).toHaveLength(1);
    expect((await del('editor', `/${project.id}/documents/${documentId}`)).status).toBe(204);
    expect((await del('editor', `/${project.id}/documents/${documentId}`)).status).toBe(404);
  });

  it('keeps an activity log of what changed and who changed it', async () => {
    const project = await create({ status: 'planned' });
    await patch('editor', `/${project.id}`, { status: 'active', title: 'A renamed project' });
    const photo = await post('editor', `/${project.id}/media`, { image: image('log') });
    await del('editor', `/${project.id}/media/${photo.body.id as string}`);
    await post('editor', `/${project.id}/documents`, document('minutes.pdf'));
    await patch('admin', `/${project.id}`, { status: 'archived' });

    const log = await get('reader', `/${project.id}/activity`);
    expect(log.status).toBe(200);
    const events = (log.body as Paginated<AuditEvent>).items;
    expect(events.map((event) => event.action)).toEqual([
      'archived',
      'document-added',
      'media-removed',
      'media-added',
      'updated',
      'status-changed',
      'created',
    ]);
    const edit = events.find((event) => event.action === 'updated');
    expect(edit).toMatchObject({
      summary: 'Edited the title',
      actor: { id: ids.editor, name: 'Esi Editor' },
      changes: [{ field: 'title', to: 'A renamed project' }],
    });
    expect(events.find((event) => event.action === 'status-changed')?.summary).toBe(
      'Moved the project from Planned to Active',
    );
  });
});

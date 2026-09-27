import {
  formatTaskKey,
  mentionToken,
  ROLE_TEMPLATES,
  TASK_ATTACHMENT_LIMIT,
  TASK_BOARD_COLUMN_LIMIT,
  TASK_BOARD_COLUMNS,
  TASK_CHECKLIST_LIMIT,
  UserRole,
  type Permission,
  type Task,
  type TaskBoard,
  type TaskComment,
  type TaskListItem,
  type Paginated,
} from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditEventModel } from '../../src/modules/audit/audit.model.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import { ProjectModel } from '../../src/modules/projects/project.model.js';
import { TaskCommentModel } from '../../src/modules/tasks/task-comment.model.js';
import { LoggingTaskEventPublisher, type TaskEvent } from '../../src/modules/tasks/task-events.js';
import { TaskModel } from '../../src/modules/tasks/task.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
const password = 'TestTasks2026!';
let passwordHash: string;
const ids: Record<string, string> = {};
const tokens: Record<string, string> = {};
let activeProject: string;
let otherProject: string;
let archivedProject: string;

// Spying on the prototype catches the instance the container built at mount.
const publish = vi.spyOn(LoggingTaskEventPublisher.prototype, 'publish');
const published = (type: TaskEvent['type']): TaskEvent[] =>
  publish.mock.calls.map(([event]) => event).filter((event) => event.type === type);

const addUser = async (
  key: string,
  fields: { name: string; role?: UserRole; isActive?: boolean; permissions?: Permission[] },
): Promise<void> => {
  const user = await UserModel.create({
    role: UserRole.Editor,
    permissions: [],
    email: `${key}@tasks.iaa.test`,
    passwordHash,
    ...fields,
  });
  ids[key] = user.id as string;
};

// Five logins in this file, well inside the shared login limiter (20 per 15 minutes).
const login = async (key: string): Promise<void> => {
  const result = await request(ctx.app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', '10.31.0.1')
    .send({ email: `${key}@tasks.iaa.test`, password });
  tokens[key] = result.body.tokens.accessToken as string;
};

// Each test calls from its own address, so the API-wide limiter (120 requests a
// minute per address) never trips across tests. The app trusts one proxy hop,
// as in production.
let ip = '10.30.0.1';
let ipCount = 0;
beforeEach(() => {
  ipCount += 1;
  ip = `10.30.${Math.floor(ipCount / 200)}.${(ipCount % 200) + 1}`;
});

const as = (key: string) => {
  const auth = { Authorization: `Bearer ${tokens[key]}`, 'X-Forwarded-For': ip };
  return {
    get: (url: string) => request(ctx.app).get(`/api/admin/tasks${url}`).set(auth),
    post: (url: string, body: unknown) =>
      request(ctx.app)
        .post(`/api/admin/tasks${url}`)
        .set(auth)
        .send(body as object),
    patch: (url: string, body: unknown) =>
      request(ctx.app)
        .patch(`/api/admin/tasks${url}`)
        .set(auth)
        .send(body as object),
    delete: (url: string) => request(ctx.app).delete(`/api/admin/tasks${url}`).set(auth),
  };
};

const createTask = async (body: Record<string, unknown>, who = 'editor'): Promise<Task> => {
  const response = await as(who).post('', body);
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body as Task;
};

const listKeys = async (query: string, who = 'editor'): Promise<string[]> => {
  const response = await as(who).get(`?pageSize=100&${query}`);
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  return (response.body as Paginated<TaskListItem>).items.map((item) => item.key);
};

const day = (key: string): string => `${key}T12:00:00.000Z`;

beforeAll(async () => {
  ctx = await createTestContext();
  passwordHash = await new PasswordService().hash(password);
  await addUser('admin', {
    name: 'Adwoa Admin',
    role: UserRole.Admin,
    permissions: ROLE_TEMPLATES.admin,
  });
  await addUser('editor', {
    name: 'Esi Editor',
    permissions: ['tasks:read', 'tasks:create', 'tasks:update'],
  });
  await addUser('colleague', {
    name: 'Kofi Colleague',
    permissions: ['tasks:read', 'tasks:create', 'tasks:update'],
  });
  await addUser('reader', { name: 'Rita Reader', permissions: ['tasks:read'] });
  await addUser('outsider', { name: 'Osei Outsider', permissions: ['projects:read'] });
  await addUser('former', { name: 'Fiifi Former', isActive: false });
  for (const key of ['admin', 'editor', 'colleague', 'reader', 'outsider']) {
    await login(key);
  }

  const project = await ProjectModel.create({
    title: 'Girls in STEM',
    slug: 'girls-in-stem',
    summary: 'Coding clubs in three regions.',
    status: 'active',
    milestones: [{ id: 'launch', title: 'Launch event' }],
  });
  activeProject = project.id as string;
  const other = await ProjectModel.create({
    title: 'Clean water',
    slug: 'clean-water',
    summary: 'Boreholes in the north.',
    status: 'active',
    milestones: [{ id: 'survey', title: 'Site survey' }],
  });
  otherProject = other.id as string;
  const archived = await ProjectModel.create({
    title: 'Old programme',
    slug: 'old-programme',
    summary: 'Finished long ago.',
    status: 'archived',
    archivedAt: new Date(),
  });
  archivedProject = archived.id as string;
}, 120_000);

afterAll(async () => {
  publish.mockRestore();
  await ctx?.teardown();
});

describe('access', () => {
  it('asks for a token', async () => {
    expect((await request(ctx.app).get('/api/admin/tasks')).status).toBe(401);
    expect((await request(ctx.app).post('/api/admin/tasks').send({ title: 'Nope' })).status).toBe(
      401,
    );
  });

  it('checks the permission behind each route', async () => {
    const task = await createTask({ title: 'Guarded task' });
    expect((await as('outsider').get('')).status).toBe(403);
    expect((await as('outsider').get('/summary')).status).toBe(403);
    expect((await as('outsider').get(`/${task.key}`)).status).toBe(403);
    expect((await as('reader').get('')).status).toBe(200);
    expect((await as('reader').post('', { title: 'Reader task' })).status).toBe(403);
    expect((await as('reader').patch(`/${task.id}`, { title: 'Renamed' })).status).toBe(403);
    expect(
      (await as('reader').patch(`/${task.id}/move`, { status: 'done', boardOrder: 1 })).status,
    ).toBe(403);
    expect((await as('reader').post(`/${task.id}/comments`, { body: 'Hello' })).status).toBe(403);
    expect((await as('reader').post(`/${task.id}/checklist`, { text: 'Step' })).status).toBe(403);
    expect((await as('reader').patch(`/${task.id}/archive`, { archived: true })).status).toBe(403);
    expect(
      (await as('reader').post(`/${task.id}/attachments`, { name: 'Nope', file: {} })).status,
    ).toBe(403);
    expect((await as('reader').delete(`/${task.id}/checklist/any`)).status).toBe(403);
    expect((await as('reader').delete(`/${task.id}/attachments/any`)).status).toBe(403);
    expect(
      (await as('reader').patch(`/${task.id}/comments/64b7f0c2a1b2c3d4e5f60799`, { body: 'x' }))
        .status,
    ).toBe(403);
    expect((await as('outsider').get('/board')).status).toBe(403);
    expect((await as('outsider').get(`/${task.id}/activity`)).status).toBe(403);
    expect((await as('outsider').get(`/${task.id}/comments`)).status).toBe(403);
    // Editors never hold delete (plan D2).
    expect((await as('editor').delete(`/${task.id}`)).status).toBe(403);
  });
});

describe('validation and lookups', () => {
  it('reports bad input as 400', async () => {
    const short = await as('editor').post('', { title: 'No' });
    expect(short.status).toBe(400);
    expect(short.body.error.code).toBe('VALIDATION_ERROR');
    expect((await as('editor').get('?due=soon')).status).toBe(400);
    expect((await as('editor').get('?status=todo,someday')).status).toBe(400);
    expect((await as('editor').patch('/not-an-id', { title: 'Renamed' })).status).toBe(400);
    expect(
      (
        await as('editor').post('', {
          title: 'Late start',
          startDate: day('2026-10-09'),
          dueDate: day('2026-10-01'),
        })
      ).status,
    ).toBe(400);
  });

  it('checks every id a task names', async () => {
    const inactive = await as('editor').post('', {
      title: 'For someone who left',
      assigneeIds: [ids.former],
    });
    expect(inactive.status).toBe(400);
    // Named by field, so the task form can go back to the step that holds it.
    expect(inactive.body.error.details).toEqual([
      { path: 'assigneeIds', message: expect.any(String), ids: [ids.former] },
    ]);

    const wrongMilestone = await as('editor').post('', {
      title: 'Wrong milestone',
      projectId: activeProject,
      milestoneId: 'survey',
    });
    expect(wrongMilestone.status).toBe(400);
    expect(wrongMilestone.body.error.details[0].path).toBe('milestoneId');

    const noProject = await as('editor').post('', {
      title: 'Loose milestone',
      milestoneId: 'launch',
    });
    expect(noProject.status).toBe(400);

    const archived = await as('editor').post('', {
      title: 'On an archived project',
      projectId: archivedProject,
    });
    expect(archived.status).toBe(400);
    expect(archived.body.error.details[0].path).toBe('projectId');

    const missingParent = await as('editor').post('', {
      title: 'Orphan',
      parentTaskId: '64b7f0c2a1b2c3d4e5f60799',
    });
    expect(missingParent.status).toBe(400);
    const missingDependency = await as('editor').post('', {
      title: 'Waiting on nothing',
      dependencyIds: ['64b7f0c2a1b2c3d4e5f60799'],
    });
    expect(missingDependency.status).toBe(400);
  });

  it('answers 404 for tasks that do not exist', async () => {
    expect((await as('editor').get('/IAA-999999')).status).toBe(404);
    expect((await as('editor').get('/not-a-key')).status).toBe(404);
    expect((await as('editor').patch('/64b7f0c2a1b2c3d4e5f60799', { title: 'Ghost' })).status).toBe(
      404,
    );
    expect((await as('editor').get('/64b7f0c2a1b2c3d4e5f60799/comments')).status).toBe(404);
    expect((await as('editor').get('/64b7f0c2a1b2c3d4e5f60799/activity')).status).toBe(404);
  });
});

describe('creating and editing', () => {
  it('numbers a task, links it and finds it by id or key in any case', async () => {
    publish.mockClear();
    const task = await createTask({
      title: 'Book the launch venue',
      description: 'Somewhere near the **university**.',
      priority: 'high',
      assigneeIds: [ids.editor, ids.colleague],
      projectId: activeProject,
      milestoneId: 'launch',
      startDate: day('2026-10-01'),
      // A date sent at midnight UTC is stored at noon of that day (plan D6).
      dueDate: '2026-10-05T00:00:00.000Z',
      labels: ['Venue', 'venue', 'Logistics'],
      checklist: [
        { id: 'call', text: 'Call the hall', done: true },
        { id: 'deposit', text: 'Pay the deposit' },
      ],
    });
    expect(task.key).toMatch(/^IAA-\d+$/);
    expect(task.key).toBe(formatTaskKey(task.number));
    expect(task.status).toBe('todo');
    expect(task.reporter?.name).toBe('Esi Editor');
    expect(task.assignees.map((person) => person.name)).toEqual(['Esi Editor', 'Kofi Colleague']);
    expect(task.project).toMatchObject({ id: activeProject, title: 'Girls in STEM' });
    expect(task.milestone).toEqual({ id: 'launch', title: 'Launch event' });
    expect(task.dueDate).toBe(day('2026-10-05'));
    expect(task.labels).toEqual(['Venue', 'Logistics']);
    expect(task.checklist[0]).toMatchObject({ done: true, doneBy: { name: 'Esi Editor' } });
    expect(task.checklist[0]?.doneAt).toBeTruthy();
    expect(task.commentCount).toBe(0);

    const byKey = await as('reader').get(`/${task.key.toLowerCase()}`);
    expect(byKey.status).toBe(200);
    expect(byKey.body.id).toBe(task.id);
    expect((await as('reader').get(`/${task.id}`)).body.key).toBe(task.key);

    expect(published('task.assigned')).toHaveLength(1);
    expect(published('task.assigned')[0]).toMatchObject({
      taskKey: task.key,
      actorId: ids.editor,
      assigneeIds: [ids.editor, ids.colleague],
    });
  });

  it('places new cards at the bottom of their column', async () => {
    const first = await createTask({ title: 'First in review', status: 'review' });
    const second = await createTask({ title: 'Second in review', status: 'review' });
    expect(second.boardOrder).toBeGreaterThan(first.boardOrder);
  });

  it('keeps completedAt in step with the status and announces what changed', async () => {
    const task = await createTask({ title: 'Send the invitations', assigneeIds: [ids.editor] });
    publish.mockClear();

    const done = await as('editor').patch(`/${task.id}`, {
      status: 'done',
      dueDate: day('2026-10-07'),
      assigneeIds: [ids.colleague],
    });
    expect(done.status).toBe(200);
    expect(done.body.completedAt).toBeTruthy();
    expect(done.body.updatedBy.name).toBe('Esi Editor');
    expect(published('task.status-changed')[0]).toMatchObject({ from: 'todo', to: 'done' });
    expect(published('task.due-changed')[0]).toMatchObject({ from: null, to: day('2026-10-07') });
    expect(published('task.assigned')[0]).toMatchObject({ assigneeIds: [ids.colleague] });
    expect(published('task.unassigned')[0]).toMatchObject({ assigneeIds: [ids.editor] });

    const reopened = await as('editor').patch(`/${task.id}`, { status: 'in-progress' });
    expect(reopened.body.completedAt).toBeNull();

    // Clearing a date with null removes it.
    const cleared = await as('editor').patch(`/${task.id}`, { dueDate: null });
    expect(cleared.body.dueDate).toBeNull();
  });

  it('never fails a save because the events boundary did', async () => {
    const task = await createTask({ title: 'Survives a broken publisher' });
    publish.mockRejectedValueOnce(new Error('Notifications are down'));
    const response = await as('editor').patch(`/${task.id}`, { status: 'review' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('review');
  });

  it('keeps a milestone inside its project', async () => {
    const task = await createTask({
      title: 'Survey the sites',
      projectId: activeProject,
      milestoneId: 'launch',
    });
    const wrong = await as('editor').patch(`/${task.id}`, {
      projectId: otherProject,
      milestoneId: 'launch',
    });
    expect(wrong.status).toBe(400);

    const moved = await as('editor').patch(`/${task.id}`, { projectId: otherProject });
    expect(moved.body.projectId).toBe(otherProject);
    // The old project's milestone cannot follow the task to the new one.
    expect(moved.body.milestoneId).toBeNull();

    const linked = await as('editor').patch(`/${task.id}`, { milestoneId: 'survey' });
    expect(linked.body.milestone).toEqual({ id: 'survey', title: 'Site survey' });

    const loose = await as('editor').patch(`/${task.id}`, { projectId: null });
    expect(loose.body.projectId).toBeNull();
    expect(loose.body.milestoneId).toBeNull();
  });

  it('refuses a parent loop and a task that depends on itself', async () => {
    const parent = await createTask({ title: 'Plan the conference' });
    const child = await createTask({ title: 'Plan the catering', parentTaskId: parent.id });
    const grandchild = await createTask({ title: 'Choose a caterer', parentTaskId: child.id });

    const detail = await as('editor').get(`/${parent.key}`);
    expect(detail.body.subtasks.map((ref: { key: string }) => ref.key)).toEqual([child.key]);
    expect((await as('editor').get(`/${child.key}`)).body.parent.key).toBe(parent.key);

    expect((await as('editor').patch(`/${parent.id}`, { parentTaskId: parent.id })).status).toBe(
      400,
    );
    const loop = await as('editor').patch(`/${parent.id}`, { parentTaskId: grandchild.id });
    expect(loop.status).toBe(400);
    expect(loop.body.error.details[0].path).toBe('parentTaskId');

    expect((await as('editor').patch(`/${parent.id}`, { dependencyIds: [parent.id] })).status).toBe(
      400,
    );
    const depends = await as('editor').patch(`/${grandchild.id}`, { dependencyIds: [parent.id] });
    expect(depends.status).toBe(200);
    expect(depends.body.dependencies).toEqual([
      { id: parent.id, key: parent.key, title: parent.title, status: 'todo' },
    ]);
  });
});

describe('filters', () => {
  const today = '2026-10-05';
  const keys: Record<string, string> = {};

  beforeAll(async () => {
    const make = async (name: string, body: Record<string, unknown>) => {
      keys[name] = (
        await createTask({ title: `Filter ${name}`, labels: ['filters'], ...body })
      ).key;
    };
    await make('overdue', {
      assigneeIds: [ids.colleague],
      dueDate: day('2026-10-01'),
      priority: 'low',
    });
    await make('today', { assigneeIds: [ids.colleague], dueDate: day(today), priority: 'urgent' });
    await make('upcoming', { assigneeIds: [ids.colleague], dueDate: day('2026-10-09') });
    await make('none', { assigneeIds: [ids.colleague], projectId: otherProject });
    await make('finished', {
      assigneeIds: [ids.colleague],
      dueDate: day('2026-10-02'),
      status: 'done',
    });
    await make('unassigned', { dueDate: day('2026-10-02'), labels: ['filters', 'Finance'] });
  });

  it('buckets due dates against the caller’s day', async () => {
    const mine = `label=filters&assigneeId=me&today=${today}`;
    expect(await listKeys(`${mine}&due=overdue`, 'colleague')).toEqual([keys.overdue]);
    expect(await listKeys(`${mine}&due=today`, 'colleague')).toEqual([keys.today]);
    expect(await listKeys(`${mine}&due=upcoming`, 'colleague')).toEqual([keys.upcoming]);
    expect(await listKeys(`${mine}&due=none`, 'colleague')).toEqual([keys.none]);
    // Finished work is never overdue, even when done tasks are asked for.
    expect(await listKeys(`${mine}&due=overdue&includeDone=true`, 'colleague')).toEqual([
      keys.overdue,
    ]);
  });

  it('hides done work unless it is asked for', async () => {
    const all = await listKeys('label=filters&sort=key&order=asc');
    expect(all).not.toContain(keys.finished);
    expect(await listKeys('label=filters&includeDone=true')).toContain(keys.finished);
    expect(await listKeys('label=filters&status=done')).toEqual([keys.finished]);
  });

  it('filters by person, project, label and text', async () => {
    expect(await listKeys('label=filters&assigneeId=none')).toEqual([keys.unassigned]);
    expect(
      await listKeys(`label=filters&assigneeId=${ids.colleague}&projectId=${otherProject}`),
    ).toEqual([keys.none]);
    const outside = await listKeys('label=filters&projectId=none');
    expect(outside).not.toContain(keys.none);
    expect(outside).toContain(keys.overdue);
    expect(await listKeys('label=finance')).toEqual([keys.unassigned]);
    expect(await listKeys(`q=${keys.today?.toLowerCase()}`)).toContain(keys.today);
  });

  it('sorts by priority rank and by due date, dated work first', async () => {
    const byPriority = await listKeys('label=filters&sort=priority&order=desc');
    expect(byPriority[0]).toBe(keys.today);
    expect(byPriority[byPriority.length - 1]).toBe(keys.overdue);
    const byDue = await listKeys('label=filters&sort=due&order=asc');
    expect(byDue[0]).toBe(keys.overdue);
    expect(byDue[byDue.length - 1]).toBe(keys.none);
  });

  it('pages the list on the server', async () => {
    const page = await as('editor').get('?label=filters&pageSize=2&page=2&sort=key&order=asc');
    expect(page.body).toMatchObject({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
    expect(page.body.items).toHaveLength(2);
    expect(page.body.items[0]).toMatchObject({ checklistTotal: 0, attachmentCount: 0 });
  });

  it('counts the caller’s own open work for the badge, as the list would', async () => {
    const summary = await as('colleague').get(`/summary?today=${today}`);
    expect(summary.status).toBe(200);
    const total = async (query: string): Promise<number> =>
      (await as('colleague').get(`?assigneeId=me&today=${today}&${query}`)).body.total as number;
    expect(summary.body).toEqual({
      overdue: await total('due=overdue'),
      dueToday: await total('due=today'),
      upcoming: await total('due=upcoming'),
      open: await total(''),
    });
    // The filter tasks alone put one in each bucket.
    expect(summary.body.overdue).toBeGreaterThanOrEqual(1);
    expect(summary.body.dueToday).toBeGreaterThanOrEqual(1);
    // Another person's summary does not include the colleague's work.
    const reader = await as('reader').get(`/summary?today=${today}`);
    expect(reader.body).toEqual({ overdue: 0, dueToday: 0, upcoming: 0, open: 0 });
  });
});

describe('the board', () => {
  it('returns every column in order, each capped with its full total', async () => {
    const project = await ProjectModel.create({
      title: 'Board test',
      slug: 'board-test',
      summary: 'Lots of cards.',
    });
    const base = 900_000;
    await TaskModel.insertMany(
      Array.from({ length: TASK_BOARD_COLUMN_LIMIT + 2 }, (_, index) => ({
        key: formatTaskKey(base + index),
        number: base + index,
        title: `Backlog card ${index}`,
        status: 'backlog',
        projectId: project._id,
        // Inserted in reverse so the board has to sort them.
        boardOrder: (TASK_BOARD_COLUMN_LIMIT + 2 - index) * 10,
      })),
    );
    await createTask({ title: 'Board review card', status: 'review', projectId: project.id });
    await createTask({ title: 'Board done card', status: 'done', projectId: project.id });

    const response = await as('reader').get(`/board?projectId=${project.id}`);
    expect(response.status).toBe(200);
    const board = response.body as TaskBoard;
    expect(board.columns.map((column) => column.status)).toEqual(TASK_BOARD_COLUMNS);
    const backlog = board.columns[0]!;
    expect(backlog.total).toBe(TASK_BOARD_COLUMN_LIMIT + 2);
    expect(backlog.items).toHaveLength(TASK_BOARD_COLUMN_LIMIT);
    const orders = backlog.items.map((item) => item.boardOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(board.columns.find((column) => column.status === 'done')?.total).toBe(1);

    const withoutDone = (await as('reader').get(`/board?projectId=${project.id}&includeDone=false`))
      .body as TaskBoard;
    expect(withoutDone.columns.find((column) => column.status === 'done')?.total).toBe(0);
    const reviewOnly = (await as('reader').get(`/board?projectId=${project.id}&status=review`))
      .body as TaskBoard;
    expect(reviewOnly.columns.map((column) => column.total)).toEqual([0, 0, 0, 0, 1, 0]);
  });

  it('moves a card idempotently, keeping its completion time', async () => {
    const task = await createTask({ title: 'Move me' });
    const first = await as('editor').patch(`/${task.id}/move`, {
      status: 'done',
      boardOrder: 12.5,
    });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ status: 'done', boardOrder: 12.5 });
    const completedAt = first.body.completedAt as string;
    expect(completedAt).toBeTruthy();

    const again = await as('editor').patch(`/${task.id}/move`, {
      status: 'done',
      boardOrder: 12.5,
    });
    expect(again.body.completedAt).toBe(completedAt);
    expect(again.body.updatedAt).toBe(first.body.updatedAt);

    const reordered = await as('editor').patch(`/${task.id}/move`, {
      status: 'done',
      boardOrder: 3,
    });
    expect(reordered.body.completedAt).toBe(completedAt);

    expect(
      (await as('editor').patch(`/${task.id}/move`, { status: 'later', boardOrder: 1 })).status,
    ).toBe(400);

    const moves = await AuditEventModel.countDocuments({
      entityId: task.id,
      action: 'status-changed',
    });
    expect(moves).toBe(1);
  });
});

describe('checklist and attachments', () => {
  it('adds, ticks, rewords and removes checklist lines one at a time', async () => {
    const task = await createTask({ title: 'Prepare the report' });
    const added = await as('editor').post(`/${task.id}/checklist`, { text: 'Draft the summary' });
    expect(added.status).toBe(201);
    const item = (added.body as Task).checklist[0]!;
    expect(item).toMatchObject({ text: 'Draft the summary', done: false });

    const ticked = await as('colleague').patch(`/${task.id}/checklist/${item.id}`, { done: true });
    expect(ticked.body.checklist[0]).toMatchObject({
      done: true,
      doneBy: { name: 'Kofi Colleague' },
    });
    const doneAt = ticked.body.checklist[0].doneAt as string;
    const retried = await as('colleague').patch(`/${task.id}/checklist/${item.id}`, { done: true });
    expect(retried.body.checklist[0].doneAt).toBe(doneAt);

    const unticked = await as('editor').patch(`/${task.id}/checklist/${item.id}`, {
      done: false,
      text: 'Draft the executive summary',
    });
    expect(unticked.body.checklist[0]).toMatchObject({
      text: 'Draft the executive summary',
      done: false,
      doneAt: null,
      doneBy: null,
    });

    expect((await as('editor').patch(`/${task.id}/checklist/missing`, { done: true })).status).toBe(
      404,
    );
    expect(
      (await as('editor').patch(`/${task.id}/checklist/${item.id}`, { done: 'yes' })).status,
    ).toBe(400);

    const removed = await as('editor').delete(`/${task.id}/checklist/${item.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.checklist).toEqual([]);
    // A retried delete finds nothing to remove and still succeeds.
    expect((await as('editor').delete(`/${task.id}/checklist/${item.id}`)).status).toBe(200);
  });

  it('stops at the checklist limit', async () => {
    const task = await createTask({ title: 'A very long list' });
    await TaskModel.updateOne(
      { _id: task.id },
      {
        $set: {
          checklist: Array.from({ length: TASK_CHECKLIST_LIMIT }, (_, index) => ({
            id: `line-${index}`,
            text: `Line ${index}`,
            done: false,
          })),
        },
      },
    );
    expect((await as('editor').post(`/${task.id}/checklist`, { text: 'One more' })).status).toBe(
      409,
    );
  });

  it('attaches and removes documents, up to the limit', async () => {
    const task = await createTask({ title: 'Collect the receipts' });
    const file = {
      url: 'https://res.cloudinary.com/iaa/raw/upload/v1/iaa/documents/receipt.pdf',
      publicId: 'iaa/documents/receipt',
      format: 'pdf',
      bytes: 2048,
      resourceType: 'raw',
    };
    const added = await as('editor').post(`/${task.id}/attachments`, { name: 'Receipt', file });
    expect(added.status).toBe(201);
    const attachment = (added.body as Task).attachments[0]!;
    expect(attachment).toMatchObject({ name: 'Receipt', addedBy: { name: 'Esi Editor' } });

    const unsafe = await as('editor').post(`/${task.id}/attachments`, {
      name: 'Script',
      file: { ...file, url: 'javascript:alert(1)' },
    });
    expect(unsafe.status).toBe(400);

    const list = await listKeys('q=Collect%20the%20receipts');
    expect(list).toHaveLength(1);
    const row = (await as('editor').get('?q=Collect%20the%20receipts')).body.items[0];
    expect(row.attachmentCount).toBe(1);

    const removed = await as('editor').delete(`/${task.id}/attachments/${attachment.id}`);
    expect(removed.body.attachments).toEqual([]);

    await TaskModel.updateOne(
      { _id: task.id },
      {
        $set: {
          attachments: Array.from({ length: TASK_ATTACHMENT_LIMIT }, (_, index) => ({
            id: `file-${index}`,
            name: `File ${index}`,
            file,
            addedAt: new Date(),
          })),
        },
      },
    );
    expect(
      (await as('editor').post(`/${task.id}/attachments`, { name: 'One more', file })).status,
    ).toBe(409);
  });
});

describe('comments', () => {
  it('stores mentions, counts comments and keeps edits to their author', async () => {
    const task = await createTask({ title: 'Agree the budget' });
    publish.mockClear();
    const body = `Can you check this, ${mentionToken({ id: ids.colleague!, name: 'Kofi Colleague' })}?`;
    const created = await as('editor').post(`/${task.id}/comments`, { body });
    expect(created.status).toBe(201);
    const comment = created.body as TaskComment;
    expect(comment).toMatchObject({
      body,
      mentions: [ids.colleague],
      author: { name: 'Esi Editor' },
    });
    expect(published('task.commented')).toHaveLength(1);
    expect(published('task.mentioned')[0]).toMatchObject({ mentionedIds: [ids.colleague] });

    const former = await as('editor').post(`/${task.id}/comments`, {
      body: `Ask ${mentionToken({ id: ids.former!, name: 'Fiifi Former' })}`,
    });
    expect(former.status).toBe(400);
    expect(former.body.error.details[0]).toMatchObject({ path: 'body', ids: [ids.former] });

    await as('colleague').post(`/${task.id}/comments`, { body: 'Looks right to me.' });
    expect((await as('editor').get(`/${task.id}`)).body.commentCount).toBe(2);

    const page = await as('reader').get(`/${task.id}/comments?pageSize=1`);
    expect(page.body).toMatchObject({ total: 2, totalPages: 2 });
    expect(page.body.items[0].id).toBe(comment.id);

    const notMine = await as('colleague').patch(`/${task.id}/comments/${comment.id}`, {
      body: 'Hijacked',
    });
    expect(notMine.status).toBe(403);
    const edited = await as('editor').patch(`/${task.id}/comments/${comment.id}`, {
      body: 'Checked it myself.',
    });
    expect(edited.status).toBe(200);
    expect(edited.body.editedAt).toBeTruthy();
    expect(edited.body.mentions).toEqual([]);

    expect((await as('colleague').delete(`/${task.id}/comments/${comment.id}`)).status).toBe(403);
    expect((await as('admin').delete(`/${task.id}/comments/${comment.id}`)).status).toBe(204);
    expect((await as('admin').delete(`/${task.id}/comments/${comment.id}`)).status).toBe(404);
    expect((await as('editor').get(`/${task.id}`)).body.commentCount).toBe(1);

    const otherTask = await createTask({ title: 'Somewhere else' });
    const [remaining] = (await as('editor').get(`/${task.id}/comments`)).body
      .items as TaskComment[];
    expect(
      (await as('colleague').patch(`/${otherTask.id}/comments/${remaining!.id}`, { body: 'Moved' }))
        .status,
    ).toBe(404);
  });
});

describe('activity, archive and delete', () => {
  it('logs each change with a readable summary', async () => {
    const task = await createTask({ title: 'Write the newsletter', assigneeIds: [ids.colleague] });
    await as('editor').patch(`/${task.id}`, {
      status: 'in-progress',
      title: 'Write the October newsletter',
    });
    await as('editor').post(`/${task.id}/comments`, { body: 'First draft is in the drive.' });

    const activity = await as('reader').get(`/${task.id}/activity`);
    expect(activity.status).toBe(200);
    const summaries = (activity.body.items as { summary: string; action: string }[]).map(
      (entry) => entry.summary,
    );
    expect(summaries).toEqual(
      expect.arrayContaining([
        `Created ${task.key}: Write the newsletter`,
        'Assigned Kofi Colleague',
        'Moved from To do to In progress',
        'Changed the title',
        'Commented',
      ]),
    );
    expect(activity.body.items[0].actor.name).toBe('Esi Editor');
  });

  it('names projects, tasks and days in the change list rather than ids', async () => {
    const parent = await createTask({ title: 'Run the open day' });
    const task = await createTask({
      title: 'Print the open day signs',
      projectId: activeProject,
      milestoneId: 'launch',
    });
    await as('editor').patch(`/${task.id}`, {
      projectId: otherProject,
      milestoneId: 'survey',
      parentTaskId: parent.id,
      dueDate: day('2026-11-03'),
    });
    const activity = await as('reader').get(`/${task.id}/activity`);
    const edit = (activity.body.items as { action: string; changes?: { field: string }[] }[]).find(
      (entry) => entry.action === 'updated',
    );
    expect(edit?.changes).toEqual(
      expect.arrayContaining([
        { field: 'project', from: 'Girls in STEM', to: 'Clean water' },
        { field: 'milestone', from: 'Launch event', to: 'Site survey' },
        { field: 'parentTask', from: null, to: parent.key },
        { field: 'dueDate', from: null, to: '3 Nov 2026' },
      ]),
    );
  });

  it('archives out of sight and restores', async () => {
    const task = await createTask({ title: 'Archive me', labels: ['archive-test'] });
    const archived = await as('editor').patch(`/${task.id}/archive`, { archived: true });
    expect(archived.body.archivedAt).toBeTruthy();
    expect(await listKeys('label=archive-test')).toEqual([]);
    expect(await listKeys('label=archive-test&includeArchived=true')).toEqual([task.key]);
    expect((await as('editor').get(`/${task.key}`)).status).toBe(200);
    const restored = await as('editor').patch(`/${task.id}/archive`, { archived: false });
    expect(restored.body.archivedAt).toBeNull();
    expect(await listKeys('label=archive-test')).toEqual([task.key]);
  });

  it('deletes a task with its comments and unhooks the tasks that pointed at it', async () => {
    const task = await createTask({ title: 'Delete me' });
    const subtask = await createTask({ title: 'Child of a deleted task', parentTaskId: task.id });
    const dependent = await createTask({
      title: 'Waiting on a deleted task',
      dependencyIds: [task.id],
    });
    await as('editor').post(`/${task.id}/comments`, { body: 'This will go too.' });
    expect(await TaskCommentModel.countDocuments({ taskId: task.id })).toBe(1);

    expect((await as('admin').delete(`/${task.id}`)).status).toBe(204);
    expect((await as('admin').get(`/${task.key}`)).status).toBe(404);
    expect(await TaskCommentModel.countDocuments({ taskId: task.id })).toBe(0);
    expect((await as('admin').get(`/${subtask.key}`)).body.parentTaskId).toBeNull();
    expect((await as('admin').get(`/${dependent.key}`)).body.dependencyIds).toEqual([]);
    expect((await as('admin').delete(`/${task.id}`)).status).toBe(404);
  });
});

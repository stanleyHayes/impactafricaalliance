import {
  APPLICATION_REFERENCE_PATTERN,
  DRAFT_TOKEN_HEADER,
  PREVIEW_TOKEN_HEADER,
  ROLE_TEMPLATES,
  toCalendarDateIso,
  todayKey,
  UserRole,
  type AdminApplication,
  type ApplicationCounts,
  type DraftSession,
  type FormDefinition,
  type ImpactStory,
  type Paginated,
  type Permission,
  type Project,
  type PublicForm,
  type PublicImpactStory,
  type PublicImpactStoryListItem,
  type SignedApplicationUpload,
  type Task,
  type TaskSummary,
} from '@iaa/shared';
import { v2 as cloudinary } from 'cloudinary';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

/**
 * The expansion end to end at API level (plan §7): the paths a real team
 * takes through several modules at once, so a seam between two modules breaks
 * here even when each module's own tests pass.
 */

// Cloudinary is configured so an applicant's upload can be signed, which is
// local. The one call that would reach Cloudinary, asking what it holds for a
// file on submit, is replaced in the test that submits.
process.env.CLOUDINARY_CLOUD_NAME = 'iaa-flow-cloud';
process.env.CLOUDINARY_API_KEY = 'flow-key';
process.env.CLOUDINARY_API_SECRET = 'flow-secret';

let ctx: TestContext;
const password = 'TestFlows2026!';
const people: Record<'admin' | 'editor', { id: string; token: string }> = {
  admin: { id: '', token: '' },
  editor: { id: '', token: '' },
};

// Each flow sends its requests from its own address, so the per-address
// limiters (the API-wide one and the applicant ones) never trip across flows.
// The app trusts one proxy hop, as in production.
let address = '10.77.0.1';

type Method = 'get' | 'post' | 'patch' | 'delete';

const call = (method: Method, path: string, who?: keyof typeof people) => {
  const pending = request(ctx.app)[method](path).set('X-Forwarded-For', address);
  return who ? pending.set('Authorization', `Bearer ${people[who].token}`) : pending;
};

// Two logins in this file, well inside the shared login limiter.
const addPerson = async (
  who: keyof typeof people,
  role: UserRole,
  permissions: Permission[],
): Promise<void> => {
  const email = `${who}.flows@iaa.org`;
  const user = await UserModel.create({
    name: who === 'admin' ? 'Adjoa Admin' : 'Efua Editor',
    email,
    role,
    permissions,
    passwordHash: await new PasswordService().hash(password),
  });
  const result = await request(ctx.app).post('/api/auth/login').send({ email, password });
  expect(result.status).toBe(200);
  people[who] = { id: user.id as string, token: result.body.tokens.accessToken as string };
};

beforeAll(async () => {
  ctx = await createTestContext();
  await addPerson('admin', UserRole.Admin, ROLE_TEMPLATES.admin);
  // The editor template: create and update on the work modules, read on the
  // rest except applications, and never delete.
  await addPerson('editor', UserRole.Editor, ROLE_TEMPLATES.editor);
}, 60_000);

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await ctx?.teardown();
});

const image = (name: string, alt: string) => ({
  url: `https://res.cloudinary.com/iaa/image/upload/v1/iaa/projects/${name}.jpg`,
  publicId: `iaa/projects/${name}`,
  alt,
});

describe('from project to published impact story', () => {
  it('moves a project to 100% as its tasks finish, then publishes a story written from it', async () => {
    address = '10.77.1.1';
    const today = todayKey();

    // An administrator sets up the project with the editor leading it.
    const createdProject = await call('post', '/api/admin/projects', 'admin').send({
      title: 'Coding clubs in Tamale',
      slug: 'flow-coding-clubs',
      summary: 'After-school coding clubs for girls in three Tamale schools.',
      description: 'The clubs met twice a week in borrowed classrooms.',
      status: 'active',
      programme: 'digital-skills',
      country: 'Ghana',
      leadId: people.editor.id,
      cover: image('clubs-cover', 'Girls at laptops in a Tamale classroom'),
      metrics: [{ id: 'girls', label: 'Girls taught', value: 40, suffix: '+' }],
      partners: [{ name: 'Tamale Tech Hub', url: 'https://tamaletech.example' }],
    });
    expect(createdProject.status).toBe(201);
    const project = createdProject.body as Project;
    expect(project.lead?.id).toBe(people.editor.id);
    expect(project.progress).toMatchObject({ value: null, source: 'none' });

    const photo = await call('post', `/api/admin/projects/${project.id}/media`, 'admin').send({
      image: image('club-day', 'A club session in progress'),
      caption: 'Club day',
      shareable: true,
    });
    expect(photo.status).toBe(201);

    // The project pickers find it with the queries they send: the task
    // pickers' (sorted by title) and the story editor's (archived included).
    for (const query of [
      'pageSize=20&sort=title&q=Coding',
      'pageSize=20&includeArchived=true&q=Tamale',
    ]) {
      const found = await call('get', `/api/admin/projects?${query}`, 'editor');
      expect(found.status, query).toBe(200);
      expect(found.body.items.map((item: { id: string }) => item.id)).toEqual([project.id]);
    }

    // Two tasks for the editor, both due today.
    const taskIds: string[] = [];
    for (const title of ['Book the classrooms', 'Collect attendance sheets']) {
      const created = await call('post', '/api/admin/tasks', 'admin').send({
        title,
        projectId: project.id,
        assigneeIds: [people.editor.id],
        dueDate: toCalendarDateIso(today),
      });
      expect(created.status).toBe(201);
      const task = created.body as Task;
      expect(task.key).toMatch(/^IAA-\d+$/);
      expect(task.assignees.map((person) => person.id)).toEqual([people.editor.id]);
      taskIds.push(task.id);
    }

    const started = await call('get', `/api/admin/projects/${project.id}`, 'admin');
    expect(started.body.taskCounts).toMatchObject({ total: 2, done: 0, open: 2 });
    expect(started.body.progress).toMatchObject({ value: 0, done: 0, total: 2 });

    // The editor's badge and My tasks see the work.
    const summaryBefore = await call('get', `/api/admin/tasks/summary?today=${today}`, 'editor');
    expect(summaryBefore.status).toBe(200);
    expect(summaryBefore.body as TaskSummary).toMatchObject({ dueToday: 2, open: 2 });
    const mine = await call('get', '/api/admin/tasks?assigneeId=me', 'editor');
    expect((mine.body as Paginated<Task>).items.map((task) => task.id).sort()).toEqual(
      [...taskIds].sort(),
    );
    const onProject = await call('get', `/api/admin/tasks/board?projectId=${project.id}`, 'editor');
    expect(onProject.status).toBe(200);

    // The editor finishes both; progress follows.
    const first = await call('patch', `/api/admin/tasks/${taskIds[0]}`, 'editor').send({
      status: 'done',
    });
    expect(first.status).toBe(200);
    expect(first.body.completedAt).toEqual(expect.any(String));
    const halfway = await call('get', `/api/admin/projects/${project.id}`, 'editor');
    expect(halfway.body.progress).toMatchObject({ value: 50, done: 1, total: 2 });

    const second = await call('patch', `/api/admin/tasks/${taskIds[1]}`, 'editor').send({
      status: 'done',
    });
    expect(second.status).toBe(200);
    const finished = await call('get', `/api/admin/projects/${project.id}`, 'editor');
    expect(finished.body.progress).toMatchObject({ value: 100, done: 2, total: 2 });
    expect(finished.body.taskCounts).toMatchObject({ total: 2, done: 2, open: 0 });

    const summaryAfter = await call('get', `/api/admin/tasks/summary?today=${today}`, 'editor');
    expect(summaryAfter.body as TaskSummary).toMatchObject({ overdue: 0, dueToday: 0, open: 0 });

    // The editor writes a story from the project and sends it for review.
    const fromProject = await call(
      'post',
      `/api/admin/impact-stories/from-project/${project.id}`,
      'editor',
    );
    expect(fromProject.status).toBe(201);
    const story = fromProject.body as ImpactStory;
    expect(story).toMatchObject({
      status: 'draft',
      title: 'Coding clubs in Tamale',
      projectId: project.id,
    });
    expect(story.cover?.publicId).toBe('iaa/projects/clubs-cover');
    const gallery = story.blocks.find((block) => block.type === 'gallery');
    expect(gallery).toBeDefined();

    // A second story on the same project that nobody publishes.
    const hidden = await call('post', '/api/admin/impact-stories', 'editor').send({
      title: 'Coding clubs: the unfinished draft',
      slug: 'flow-unfinished-draft',
      excerpt: 'A draft that must never reach the public site.',
      projectId: project.id,
      cover: image('draft-cover', 'An empty classroom'),
      blocks: [{ id: 'text-1', type: 'rich-text', data: { markdown: 'Not ready yet.' } }],
    });
    expect(hidden.status).toBe(201);

    // The project's Impact tab lists both, in any status.
    const onImpactTab = await call(
      'get',
      `/api/admin/impact-stories?view=all&projectId=${project.id}&page=1&pageSize=50`,
      'editor',
    );
    expect(onImpactTab.status).toBe(200);
    expect(onImpactTab.body.total).toBe(2);
    const withStories = await call('get', `/api/admin/projects/${project.id}`, 'editor');
    expect(withStories.body.storyCount).toBe(2);

    // A preview link points at the marketing preview route, with the token
    // after '#', and the token reads the unpublished story.
    const preview = await call('post', `/api/admin/impact-stories/${story.id}/preview`, 'editor');
    expect(preview.status).toBe(200);
    const previewUrl = new URL(preview.body.url as string);
    expect(`${previewUrl.origin}${previewUrl.pathname}`).toBe(
      `${ctx.config.siteUrl.replace(/\/+$/, '')}/impact/stories/preview`,
    );
    const previewToken = previewUrl.hash.slice(1);
    const previewed = await call('get', '/api/impact-stories/preview').set(
      PREVIEW_TOKEN_HEADER,
      previewToken,
    );
    expect(previewed.status).toBe(200);
    expect(previewed.body.slug).toBe(story.slug);

    const inReview = await call(
      'patch',
      `/api/admin/impact-stories/${story.id}/status`,
      'editor',
    ).send({ status: 'in-review' });
    expect(inReview.status).toBe(200);
    expect(inReview.body.status).toBe('in-review');
    expect(
      (
        await call('patch', `/api/admin/impact-stories/${story.id}/status`, 'editor').send({
          status: 'published',
        })
      ).status,
    ).toBe(403);

    const published = await call(
      'patch',
      `/api/admin/impact-stories/${story.id}/status`,
      'admin',
    ).send({ status: 'published' });
    expect(published.status).toBe(200);
    expect(published.body.publishedAt).toEqual(expect.any(String));

    // The public site shows the published story and nothing else.
    const list = await call('get', '/api/impact-stories');
    expect(list.status).toBe(200);
    const listed = (list.body as Paginated<PublicImpactStoryListItem>).items.map(
      (item) => item.slug,
    );
    expect(listed).toEqual([story.slug]);

    const detail = await call('get', `/api/impact-stories/${story.slug}`);
    expect(detail.status).toBe(200);
    const shown = detail.body as PublicImpactStory;
    expect(shown.title).toBe('Coding clubs in Tamale');
    expect(shown).not.toHaveProperty('projectId');
    expect(shown).not.toHaveProperty('createdBy');
    expect(shown).not.toHaveProperty('status');

    expect((await call('get', '/api/impact-stories/flow-unfinished-draft')).status).toBe(404);

    // With tasks and stories pointing at it, the project can only be archived.
    const deleted = await call('delete', `/api/admin/projects/${project.id}`, 'admin');
    expect(deleted.status).toBe(409);
  });
});

/** Every answer the speaker application asks for, except the headshot. */
const speakerAnswers = [
  { fieldId: 'full-name', value: 'Ama Mensah' },
  { fieldId: 'email', value: 'ama.mensah@example.org' },
  { fieldId: 'country', value: 'Ghana' },
  { fieldId: 'organisation', value: 'Accra Tech Hub' },
  { fieldId: 'role', value: 'Programme Director' },
  { fieldId: 'session-title', value: 'Teaching code with borrowed laptops' },
  {
    fieldId: 'abstract',
    value:
      'How a small team taught forty girls to program with six borrowed laptops, what worked, what did not, and how others can start the same thing next term.',
  },
  { fieldId: 'format', value: 'workshop' },
  { fieldId: 'audience-level', value: 'all-levels' },
  { fieldId: 'topics', value: ['digital-skills', 'women-empowerment'] },
  { fieldId: 'spoken-before', value: 'no' },
  {
    fieldId: 'bio',
    value: 'Ama Mensah runs after-school coding clubs across the Greater Accra Region.',
  },
  { fieldId: 'travel-support', value: 'no' },
  { fieldId: 'privacy-consent', value: true },
];

describe('from speaker form to accepted application', () => {
  it('publishes a template form, takes an application through drafts, and reviews it to accepted', async () => {
    address = '10.77.2.1';

    // An administrator builds the form from the template and publishes it.
    const created = await call('post', '/api/admin/forms', 'admin').send({
      title: 'Speakers for the 2027 summit',
      slug: 'flow-summit-speakers',
      template: 'speaker-application',
    });
    expect(created.status).toBe(201);
    const form = created.body as FormDefinition;
    expect(form.type).toBe('speaker-application');
    expect(form.steps.map((step) => step.id)).toEqual([
      'about-you',
      'your-session',
      'experience',
      'logistics',
      'consent',
    ]);

    // The staff preview goes to the marketing preview route.
    const preview = await call('post', `/api/admin/forms/${form.id}/preview`, 'admin');
    expect(preview.status).toBe(200);
    const previewUrl = new URL(preview.body.url as string);
    expect(`${previewUrl.origin}${previewUrl.pathname}`).toBe(
      `${ctx.config.siteUrl.replace(/\/+$/, '')}/apply/preview`,
    );
    const previewed = await call('get', '/api/forms/preview').set(
      PREVIEW_TOKEN_HEADER,
      previewUrl.hash.slice(1),
    );
    expect(previewed.status).toBe(200);

    // Unpublished forms are not public.
    expect((await call('get', `/api/forms/${form.slug}`)).status).toBe(404);
    const published = await call('patch', `/api/admin/forms/${form.id}/status`, 'admin').send({
      status: 'published',
    });
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('published');

    // The applicant opens the form and begins.
    const opened = await call('get', `/api/forms/${form.slug}`);
    expect(opened.status).toBe(200);
    expect((opened.body as PublicForm).window).toBe('open');

    const begun = await call('post', `/api/forms/${form.slug}/draft`).send({});
    expect(begun.status).toBe(201);
    const session = begun.body as DraftSession;
    const withToken = (method: Method, path: string) =>
      call(method, path).set(DRAFT_TOKEN_HEADER, session.token);

    // Autosave part-way through, then pick it up again.
    const saved = await withToken('patch', `/api/forms/${form.slug}/draft`).send({
      answers: speakerAnswers.slice(0, 5),
      currentStepId: 'your-session',
    });
    expect(saved.status).toBe(200);
    const resumed = await withToken('get', `/api/forms/${form.slug}/draft`);
    expect(resumed.status).toBe(200);
    expect(resumed.body).toMatchObject({ status: 'draft', currentStepId: 'your-session' });
    expect(resumed.body.answers).toHaveLength(5);

    // The headshot: signed for this draft, uploaded (as the browser would),
    // then described back the way the marketing flow maps Cloudinary's reply.
    const signed = await withToken('post', `/api/forms/${form.slug}/draft/uploads/sign`).send({
      fieldId: 'headshot',
      filename: 'Ama headshot.jpg',
      bytes: 2048,
    });
    expect(signed.status).toBe(200);
    const upload = signed.body as SignedApplicationUpload;
    expect(upload.fields).toMatchObject({ type: 'authenticated', public_id: expect.any(String) });
    expect(upload.publicId.startsWith(`${upload.folder}/headshot-`)).toBe(true);
    const resource = vi
      .spyOn(cloudinary.api, 'resource')
      .mockResolvedValue({ bytes: 2048, format: 'jpg', resource_type: 'image' } as never);
    const headshot = {
      fieldId: 'headshot',
      value: [
        {
          publicId: upload.publicId,
          url: `https://res.cloudinary.com/iaa-flow-cloud/image/authenticated/v1/${upload.publicId}.jpg`,
          name: 'Ama headshot.jpg',
          format: 'jpg',
          bytes: 2048,
          resourceType: 'image',
        },
      ],
    };

    const submitted = await withToken('post', `/api/forms/${form.slug}/draft/submit`).send({
      answers: [...speakerAnswers, headshot],
    });
    expect(submitted.status).toBe(201);
    expect(submitted.body.reference).toMatch(APPLICATION_REFERENCE_PATTERN);
    expect(resource).toHaveBeenCalledTimes(1);
    // A submitted draft stops answering to its token.
    expect((await withToken('get', `/api/forms/${form.slug}/draft`)).status).toBe(404);
    // The acknowledgement goes to the applicant (best-effort, after the reply).
    await vi.waitFor(() =>
      expect(ctx.emailSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ama.mensah@example.org' }),
      ),
    );

    // The badge counts it as new.
    const newCounts = await call('get', '/api/admin/applications/counts', 'admin');
    expect((newCounts.body as ApplicationCounts).submitted).toBe(1);

    // Staff find it, read it with the questions it answered, and review it.
    const listed = await call('get', `/api/admin/applications?formId=${form.id}`, 'admin');
    expect(listed.status).toBe(200);
    expect(listed.body.items).toHaveLength(1);
    const applicationId = listed.body.items[0].id as string;
    expect(listed.body.items[0]).toMatchObject({
      reference: submitted.body.reference,
      applicant: { name: 'Ama Mensah', email: 'ama.mensah@example.org' },
      status: 'submitted',
    });

    const read = await call('get', `/api/admin/applications/${applicationId}`, 'admin');
    expect(read.status).toBe(200);
    const application = read.body as AdminApplication;
    expect(application.definition.steps.map((step) => step.id)).toEqual(
      form.steps.map((step) => step.id),
    );
    expect(application.answers.find((answer) => answer.fieldId === 'full-name')).toMatchObject({
      label: 'Full name',
      value: 'Ama Mensah',
    });
    // Files come back as signed download links, made when the application is
    // read and good for an hour, so a copied link does not open a CV for good.
    const file = application.answers.find((answer) => answer.fieldId === 'headshot')?.value as {
      url: string;
    }[];
    const link = new URL(file[0]?.url ?? '');
    expect(link.origin + link.pathname).toBe(
      'https://api.cloudinary.com/v1_1/iaa-flow-cloud/image/download',
    );
    expect(link.searchParams.get('type')).toBe('authenticated');
    expect(link.searchParams.get('signature')).toBeTruthy();
    const expiresAt = Number(link.searchParams.get('expires_at'));
    expect(expiresAt - Date.now() / 1000).toBeGreaterThan(55 * 60);
    expect(expiresAt - Date.now() / 1000).toBeLessThanOrEqual(60 * 60);

    const reviewed = await call(
      'post',
      `/api/admin/applications/${applicationId}/reviews`,
      'admin',
    ).send({ notes: 'Strong practical session.', recommendation: 'yes', score: 4 });
    expect(reviewed.status).toBe(201);
    expect(reviewed.body.reviews).toHaveLength(1);

    for (const status of ['under-review', 'shortlisted', 'accepted']) {
      const moved = await call(
        'patch',
        `/api/admin/applications/${applicationId}/status`,
        'admin',
      ).send({ status, note: `Moved to ${status}` });
      expect(moved.status, status).toBe(200);
    }

    const final = await call('get', `/api/admin/applications/${applicationId}`, 'admin');
    const history = (final.body as AdminApplication).statusHistory;
    // The submission itself opens the history; the three review moves follow.
    expect(history.map((change) => `${change.from}>${change.to}`)).toEqual([
      'draft>submitted',
      'submitted>under-review',
      'under-review>shortlisted',
      'shortlisted>accepted',
    ]);
    expect(history.slice(1).every((change) => change.by?.id === people.admin.id)).toBe(true);

    const counts = (await call('get', '/api/admin/applications/counts', 'admin'))
      .body as ApplicationCounts;
    expect(counts).toMatchObject({ submitted: 0, 'under-review': 0, shortlisted: 0, accepted: 1 });

    // Applicant data stays with people who were given it: the editor
    // template does not carry applications:read.
    expect((await call('get', '/api/admin/applications', 'editor')).status).toBe(403);
  });
});

import {
  APPLICATION_REFERENCE_PATTERN,
  DRAFT_TOKEN_HEADER,
  PREVIEW_TOKEN_HEADER,
  ROLE_TEMPLATES,
  UserRole,
  type DraftSession,
  type FormDefinition,
  type FormStep,
  type Permission,
  type PublicForm,
  type SignedApplicationUpload,
} from '@iaa/shared';
import { v2 as cloudinary } from 'cloudinary';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { FormSubmissionModel } from '../../src/modules/forms/form-submission.model.js';
import { FormVersionModel } from '../../src/modules/forms/form-version.model.js';
import { FormModel } from '../../src/modules/forms/form.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

// Cloudinary is configured for this file so upload signing can be exercised.
// Signing is local; the one call that would reach Cloudinary, asking what it
// holds for a file, is replaced below.
process.env.CLOUDINARY_CLOUD_NAME = 'iaa-test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

let ctx: TestContext;
let admin: string;
let editor: string;
let reader: string;
let outsider: string;
const password = 'TestForms2026!';

type Method = 'get' | 'post' | 'patch' | 'delete';

// Every test gets its own address, so the per-address limiters (120 requests a
// minute across the API, ten submissions a quarter hour) never trip across
// tests. The app trusts one proxy hop, as in production.
let ip = '10.20.0.1';
let ipCount = 0;
beforeEach(() => {
  ipCount += 1;
  ip = `10.20.${Math.floor(ipCount / 200)}.${(ipCount % 200) + 1}`;
});

const call = (method: Method, path: string, token?: string) => {
  const pending = request(ctx.app)[method](path).set('X-Forwarded-For', ip);
  return token ? pending.set('Authorization', `Bearer ${token}`) : pending;
};

// Four logins in this file, well inside the shared login limiter.
const login = async (email: string, role: UserRole, permissions: Permission[]): Promise<string> => {
  await UserModel.create({
    name: email.split('@')[0],
    email,
    role,
    permissions,
    passwordHash: await new PasswordService().hash(password),
  });
  const result = await request(ctx.app).post('/api/auth/login').send({ email, password });
  return result.body.tokens.accessToken as string;
};

let slugCount = 0;
const uniqueSlug = (base: string): string => {
  slugCount += 1;
  return `${base}-${slugCount}`;
};

const steps: FormStep[] = [
  {
    id: 'about',
    title: 'About you',
    fields: [
      {
        id: 'name',
        type: 'short-text',
        label: 'Full name',
        required: true,
        options: [],
        mapsTo: 'applicant-name',
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        required: true,
        options: [],
        mapsTo: 'applicant-email',
      },
      {
        id: 'attending',
        type: 'radio',
        label: 'Will you attend?',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        id: 'reason',
        type: 'long-text',
        label: 'Why not?',
        required: true,
        options: [],
        visibility: {
          match: 'all',
          rules: [{ fieldId: 'attending', operator: 'equals', value: 'no' }],
        },
      },
    ],
  },
  {
    id: 'files',
    title: 'Files',
    fields: [
      {
        id: 'cv',
        type: 'file',
        label: 'CV',
        required: false,
        options: [],
        validation: { fileKinds: ['pdf'], maxFiles: 1, maxSizeMB: 2 },
      },
    ],
  },
  {
    id: 'consent',
    title: 'Consent',
    fields: [
      {
        id: 'agree',
        type: 'consent',
        label: 'Consent',
        required: true,
        options: [],
        consentText: 'I agree that you may keep these answers.',
      },
    ],
  },
];

const goodAnswers = [
  { fieldId: 'name', value: 'Ama Mensah' },
  { fieldId: 'email', value: 'Ama.Mensah@example.org' },
  { fieldId: 'attending', value: 'yes' },
  { fieldId: 'agree', value: true },
];

/** A form made through the API; published unless told otherwise. */
const makeForm = async (
  settings: Record<string, unknown> = {},
  { publish = true, slug = uniqueSlug('apply') } = {},
): Promise<FormDefinition> => {
  const created = await call('post', '/api/admin/forms', admin).send({
    title: 'Volunteer call',
    slug,
    type: 'volunteer',
    settings: { allowDrafts: true, acknowledgeApplicant: true, ...settings },
    steps,
  });
  expect(created.status).toBe(201);
  if (!publish) {
    return created.body as FormDefinition;
  }
  const published = await call('patch', `/api/admin/forms/${created.body.id}/status`, admin).send({
    status: 'published',
  });
  expect(published.status).toBe(200);
  return published.body as FormDefinition;
};

const startDraft = async (slug: string, answers?: unknown[]): Promise<DraftSession> => {
  const response = await call('post', `/api/forms/${slug}/draft`).send(answers ? { answers } : {});
  expect(response.status).toBe(201);
  return response.body as DraftSession;
};

beforeAll(async () => {
  ctx = await createTestContext();
  await Promise.all([FormModel.init(), FormSubmissionModel.init(), FormVersionModel.init()]);
  admin = await login('forms.admin@iaa.org', UserRole.Admin, ROLE_TEMPLATES.admin);
  editor = await login('forms.editor@iaa.org', UserRole.Editor, [
    'forms:read',
    'forms:create',
    'forms:update',
  ]);
  reader = await login('forms.reader@iaa.org', UserRole.Editor, ['forms:read']);
  outsider = await login('forms.outsider@iaa.org', UserRole.Editor, ['projects:read']);
}, 60_000);

afterAll(async () => {
  vi.restoreAllMocks();
  await ctx?.teardown();
});

describe('building forms', () => {
  it('guards every admin route', async () => {
    expect((await call('get', '/api/admin/forms')).status).toBe(401);
    expect((await call('get', '/api/admin/forms', outsider)).status).toBe(403);
    expect(
      (await call('post', '/api/admin/forms', reader).send({ title: 'Nope', slug: 'nope' })).status,
    ).toBe(403);
    const form = await makeForm({}, { publish: false });
    expect((await call('patch', `/api/admin/forms/${form.id}`, reader).send({})).status).toBe(403);
    expect((await call('delete', `/api/admin/forms/${form.id}`, editor)).status).toBe(403);
    expect((await call('get', '/api/admin/forms/not-an-id', admin)).status).toBe(400);
  });

  it('creates, reads, lists and edits a form, and refuses a taken address', async () => {
    const bad = await call('post', '/api/admin/forms', editor).send({
      title: 'x',
      slug: 'Bad Slug',
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');

    const slug = uniqueSlug('mentors');
    const created = await call('post', '/api/admin/forms', editor).send({ title: 'Mentors', slug });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      title: 'Mentors',
      slug,
      status: 'draft',
      version: 1,
      submissionCount: 0,
      settings: { allowDrafts: true },
    });
    expect(created.body.createdBy.email).toBe('forms.editor@iaa.org');

    const clash = await call('post', '/api/admin/forms', editor).send({ title: 'Again', slug });
    expect(clash.status).toBe(409);

    // The public site's preview page lives at /apply/preview, so no form may.
    const reserved = await call('post', '/api/admin/forms', editor).send({
      title: 'Preview',
      slug: 'preview',
    });
    expect(reserved.status).toBe(400);
    expect(reserved.body.error.details[0].path).toBe('slug');

    const read = await call('get', `/api/admin/forms/${created.body.id}`, reader);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe('Mentors');

    const edited = await call('patch', `/api/admin/forms/${created.body.id}`, editor).send({
      title: 'Mentor programme',
      description: 'For the spring cohort',
      steps,
    });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ title: 'Mentor programme', version: 1 });
    expect(edited.body.steps).toHaveLength(3);

    const cleared = await call('patch', `/api/admin/forms/${created.body.id}`, editor).send({
      description: null,
    });
    expect(cleared.body.description).toBeUndefined();

    const repeatedIds = await call('patch', `/api/admin/forms/${created.body.id}`, editor).send({
      steps: [{ id: 'a', title: 'A', fields: [{ id: 'a', type: 'short-text', label: 'A' }] }],
    });
    expect(repeatedIds.status).toBe(400);

    const list = await call('get', '/api/admin/forms?q=mentor%20prog', reader);
    expect(list.status).toBe(200);
    expect(list.body.items.map((item: { id: string }) => item.id)).toContain(created.body.id);
    expect(list.body.items[0]).toMatchObject({ stepCount: 3, fieldCount: 6, submissionCount: 0 });
  });

  it('starts from the speaker application template', async () => {
    const created = await call('post', '/api/admin/forms', admin).send({
      title: 'Speakers 2027',
      slug: uniqueSlug('speakers'),
      template: 'speaker-application',
    });
    expect(created.status).toBe(201);
    expect(created.body.type).toBe('speaker-application');
    expect(created.body.title).toBe('Speakers 2027');
    expect(created.body.steps.map((step: FormStep) => step.id)).toEqual([
      'about-you',
      'your-session',
      'experience',
      'logistics',
      'consent',
    ]);
  });

  it('lets only an administrator publish, and lists what blocks publishing', async () => {
    const empty = await call('post', '/api/admin/forms', editor).send({
      title: 'Empty form',
      slug: uniqueSlug('empty'),
    });
    const byEditor = await call('patch', `/api/admin/forms/${empty.body.id}/status`, editor).send({
      status: 'published',
    });
    expect(byEditor.status).toBe(403);
    expect(byEditor.body.error.message).toMatch(/administrator/);

    const blocked = await call('patch', `/api/admin/forms/${empty.body.id}/status`, admin).send({
      status: 'published',
    });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.details).toContainEqual({
      path: 'form',
      message: 'Add at least one question.',
    });

    const pastClose = await makeForm(
      { closesAt: new Date(Date.now() - 60_000).toISOString() },
      { publish: false },
    );
    const late = await call('patch', `/api/admin/forms/${pastClose.id}/status`, admin).send({
      status: 'published',
    });
    expect(late.status).toBe(400);
    expect(JSON.stringify(late.body.error.details)).toMatch(/closing date has passed/);
  });

  it('publishes, snapshots and versions a form edited while live', async () => {
    const form = await makeForm();
    expect(form).toMatchObject({ status: 'published', version: 1 });
    expect(form.publishedAt).toBeTruthy();
    expect(await FormVersionModel.countDocuments({ formId: form.id })).toBe(1);

    // A retried publish changes nothing.
    const again = await call('patch', `/api/admin/forms/${form.id}/status`, admin).send({
      status: 'published',
    });
    expect(again.body.version).toBe(1);

    const renamed = await call('patch', `/api/admin/forms/${form.id}`, editor).send({
      title: 'Volunteer call 2027',
    });
    expect(renamed.body.version).toBe(1);

    const changedSteps = steps.map((step) =>
      step.id === 'about'
        ? {
            ...step,
            fields: step.fields.map((f) => (f.id === 'name' ? { ...f, label: 'Your name' } : f)),
          }
        : step,
    );
    const edited = await call('patch', `/api/admin/forms/${form.id}`, editor).send({
      steps: changedSteps,
    });
    expect(edited.status).toBe(200);
    expect(edited.body.version).toBe(2);
    const snapshots = await FormVersionModel.find({ formId: form.id }).sort({ version: 1 }).lean();
    expect(snapshots.map((snapshot) => snapshot.version)).toEqual([1, 2]);
    expect(snapshots[0]?.steps[0]?.fields[0]?.label).toBe('Full name');
    expect(snapshots[1]?.steps[0]?.fields[0]?.label).toBe('Your name');

    // Sending the same questions again is not a change.
    const same = await call('patch', `/api/admin/forms/${form.id}`, editor).send({
      steps: changedSteps,
    });
    expect(same.body.version).toBe(2);
  });

  it('keeps a live form ready to publish, and repairs a missing snapshot on a repeat publish', async () => {
    const form = await makeForm();
    const emptied = await call('patch', `/api/admin/forms/${form.id}`, editor).send({
      steps: [{ id: 'about', title: 'About you', fields: [] }],
    });
    expect(emptied.status).toBe(400);
    expect(emptied.body.error.details).toContainEqual({
      path: 'steps',
      message: 'Add at least one question.',
    });

    const backwards = await call('patch', `/api/admin/forms/${form.id}`, editor).send({
      settings: {
        allowDrafts: true,
        opensAt: '2027-03-01T09:00:00.000Z',
        closesAt: '2027-02-01T09:00:00.000Z',
      },
    });
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.details).toContainEqual({
      path: 'settings.closesAt',
      message: 'The closing date must be after the opening date.',
    });

    const unchanged = await call('get', `/api/admin/forms/${form.id}`, reader);
    expect(unchanged.body).toMatchObject({ version: 1, status: 'published' });
    expect(unchanged.body.steps[0].fields).toHaveLength(4);

    // Edits that publishing does not depend on go through as before.
    const noted = await call('patch', `/api/admin/forms/${form.id}`, editor).send({
      description: 'Shared with partners on Monday',
    });
    expect(noted.status).toBe(200);

    // A draft may still be saved half-built.
    const draft = await makeForm({}, { publish: false });
    const halfBuilt = await call('patch', `/api/admin/forms/${draft.id}`, editor).send({
      steps: [{ id: 'about', title: 'About you', fields: [] }],
    });
    expect(halfBuilt.status).toBe(200);

    await FormVersionModel.deleteMany({ formId: form.id });
    const again = await call('patch', `/api/admin/forms/${form.id}/status`, admin).send({
      status: 'published',
    });
    expect(again.status).toBe(200);
    expect(await FormVersionModel.countDocuments({ formId: form.id, version: 1 })).toBe(1);
  });

  it('closes, archives, restores and duplicates', async () => {
    const form = await makeForm();
    const refused = await call('patch', `/api/admin/forms/${form.id}/archive`, editor).send({
      archived: true,
    });
    expect(refused.status).toBe(409);

    const closeByEditor = await call('patch', `/api/admin/forms/${form.id}/status`, editor).send({
      status: 'closed',
    });
    expect(closeByEditor.status).toBe(403);
    const closed = await call('patch', `/api/admin/forms/${form.id}/status`, admin).send({
      status: 'closed',
    });
    expect(closed.body).toMatchObject({ status: 'closed' });
    expect(closed.body.closedAt).toBeTruthy();

    const archived = await call('patch', `/api/admin/forms/${form.id}/archive`, editor).send({
      archived: true,
    });
    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).toBeTruthy();

    const active = await call('get', `/api/admin/forms?q=${form.slug}`, reader);
    expect(active.body.items).toHaveLength(0);
    const archivedList = await call('get', `/api/admin/forms?archived=true&q=${form.slug}`, reader);
    expect(archivedList.body.items.map((item: { id: string }) => item.id)).toEqual([form.id]);
    expect((await call('get', `/api/forms/${form.slug}`)).status).toBe(404);

    const restored = await call('patch', `/api/admin/forms/${form.id}/archive`, editor).send({
      archived: false,
    });
    expect(restored.body.archivedAt).toBeNull();

    const copy = await call('post', `/api/admin/forms/${form.id}/duplicate`, editor);
    expect(copy.status).toBe(201);
    expect(copy.body).toMatchObject({
      slug: `${form.slug}-copy`,
      status: 'draft',
      version: 1,
      title: 'Volunteer call (copy)',
    });
    expect(copy.body.publishedAt).toBeNull();
    const second = await call('post', `/api/admin/forms/${form.id}/duplicate`, editor);
    expect(second.body.slug).toBe(`${form.slug}-copy-2`);
  });

  it('deletes an unanswered form with its drafts and versions, and refuses once answered', async () => {
    const answered = await makeForm();
    const session = await startDraft(answered.slug);
    const submitted = await call('post', `/api/forms/${answered.slug}/draft/submit`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({ answers: goodAnswers });
    expect(submitted.status).toBe(201);
    const refused = await call('delete', `/api/admin/forms/${answered.id}`, admin);
    expect(refused.status).toBe(409);
    const toDraft = await call('patch', `/api/admin/forms/${answered.id}/status`, admin).send({
      status: 'draft',
    });
    expect(toDraft.status).toBe(409);

    const unanswered = await makeForm();
    await startDraft(unanswered.slug, [{ fieldId: 'name', value: 'Kofi' }]);
    const deleted = await call('delete', `/api/admin/forms/${unanswered.id}`, admin);
    expect(deleted.status).toBe(204);
    expect(await FormModel.exists({ _id: unanswered.id })).toBeNull();
    expect(await FormVersionModel.countDocuments({ formId: unanswered.id })).toBe(0);
    expect(await FormSubmissionModel.countDocuments({ formId: unanswered.id })).toBe(0);
  });

  it('previews a draft form on the public site with a preview token', async () => {
    const draft = await makeForm({}, { publish: false });
    const link = await call('post', `/api/admin/forms/${draft.id}/preview`, reader);
    expect(link.status).toBe(200);
    expect(link.body.url).toContain('/apply/preview#');
    const token = (link.body.url as string).split('#')[1] ?? '';

    const preview = await call('get', '/api/forms/preview').set(PREVIEW_TOKEN_HEADER, token);
    expect(preview.status).toBe(200);
    expect((preview.body as PublicForm).slug).toBe(draft.slug);
    expect(preview.body).not.toHaveProperty('id');

    expect((await call('get', '/api/forms/preview').set(PREVIEW_TOKEN_HEADER, 'nope')).status).toBe(
      404,
    );
    expect((await call('get', '/api/forms/preview')).status).toBe(404);
  });
});

describe('the public form', () => {
  it('is not found while in draft, and says when it opens or has closed', async () => {
    const draft = await makeForm({}, { publish: false });
    expect((await call('get', `/api/forms/${draft.slug}`)).status).toBe(404);
    expect((await call('post', `/api/forms/${draft.slug}/draft`).send({})).status).toBe(404);
    expect((await call('get', '/api/forms/no-such-form')).status).toBe(404);

    const future = await makeForm({ opensAt: new Date(Date.now() + 86_400_000).toISOString() });
    const page = await call('get', `/api/forms/${future.slug}`);
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ window: 'not-yet-open', title: 'Volunteer call' });
    expect(page.body.settings).not.toHaveProperty('notifyEmails');
    const early = await call('post', `/api/forms/${future.slug}/draft`).send({});
    expect(early.status).toBe(409);
    expect(early.body.error.details).toEqual({ reason: 'not-yet-open' });

    const open = await makeForm();
    await call('patch', `/api/admin/forms/${open.id}/status`, admin).send({ status: 'closed' });
    expect((await call('get', `/api/forms/${open.slug}`)).body.window).toBe('closed');
    const late = await call('post', `/api/forms/${open.slug}/draft`).send({});
    expect(late.status).toBe(409);
    expect(late.body.error.details).toEqual({ reason: 'closed' });
  });

  it('starts, reads and autosaves a draft reached only by its token', async () => {
    const form = await makeForm();
    const session = await startDraft(form.slug, [{ fieldId: 'name', value: 'Ama' }]);
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(session.draft).toMatchObject({ formSlug: form.slug, status: 'draft', formVersion: 1 });
    expect(session.draft).not.toHaveProperty('id');
    expect(session.draft.expiresAt).toBeTruthy();

    const read = await call('get', `/api/forms/${form.slug}/draft`).set(
      DRAFT_TOKEN_HEADER,
      session.token,
    );
    expect(read.status).toBe(200);
    expect(read.body.answers).toEqual([{ fieldId: 'name', value: 'Ama' }]);

    const saved = await call('patch', `/api/forms/${form.slug}/draft`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({
        answers: [
          { fieldId: 'name', value: 'Ama Mensah' },
          { fieldId: 'email', value: 'ama@exam' },
          { fieldId: 'ghost', value: 'dropped' },
        ],
        currentStepId: 'files',
      });
    expect(saved.status).toBe(200);
    expect(saved.body.currentStepId).toBe('files');
    // Half-typed answers are kept; answers to questions the form lacks are not.
    expect(saved.body.answers).toEqual([
      { fieldId: 'name', value: 'Ama Mensah' },
      { fieldId: 'email', value: 'ama@exam' },
    ]);

    const wrongShape = await call('patch', `/api/forms/${form.slug}/draft`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({ answers: [{ fieldId: 'attending', value: ['yes'] }] });
    expect(wrongShape.status).toBe(400);
    expect(wrongShape.body.error.details[0].path).toBe('answers.attending');

    const other = 'A'.repeat(43);
    const wrong = await call('get', `/api/forms/${form.slug}/draft`).set(DRAFT_TOKEN_HEADER, other);
    const missing = await call('get', `/api/forms/${form.slug}/draft`);
    expect(wrong.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(wrong.body).toEqual(missing.body);
  });

  it('refuses autosave on a form that keeps no drafts', async () => {
    const form = await makeForm({ allowDrafts: false });
    const session = await startDraft(form.slug, [{ fieldId: 'name', value: 'Not kept' }]);
    expect(session.draft.answers).toEqual([]);
    const save = await call('patch', `/api/forms/${form.slug}/draft`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({ answers: [] });
    expect(save.status).toBe(409);
    expect(save.body.error.details).toEqual({ reason: 'drafts-off' });
  });

  it('maps submit problems to their questions and skips hidden required ones', async () => {
    const form = await makeForm();
    const session = await startDraft(form.slug);
    const invalid = await call('post', `/api/forms/${form.slug}/draft/submit`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({
        answers: [
          { fieldId: 'name', value: 'Ama' },
          { fieldId: 'email', value: 'not-an-email' },
          { fieldId: 'attending', value: 'no' },
        ],
      });
    expect(invalid.status).toBe(400);
    const paths = invalid.body.error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toEqual(['answers.email', 'answers.reason', 'answers.agree']);
    expect(invalid.body.error.details[1]).toMatchObject({ stepId: 'about' });

    // "Why not?" is required but hidden unless the answer is no; its stale
    // answer is dropped rather than stored.
    const submitted = await call('post', `/api/forms/${form.slug}/draft/submit`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({
        answers: [...goodAnswers, { fieldId: 'reason', value: 'Left over from before' }],
      });
    expect(submitted.status).toBe(201);
    expect(submitted.body.reference).toMatch(APPLICATION_REFERENCE_PATTERN);
    expect(submitted.body).not.toHaveProperty('id');

    const stored = await FormSubmissionModel.findOne({
      reference: submitted.body.reference,
    }).lean();
    expect(stored?.status).toBe('submitted');
    expect(stored?.answers.map((answer) => answer.fieldId)).toEqual([
      'name',
      'email',
      'attending',
      'agree',
    ]);
    expect(stored?.applicant).toEqual({ name: 'Ama Mensah', email: 'ama.mensah@example.org' });
    expect(stored?.consent?.version).toBeTruthy();
    expect(stored?.tokenHashes ?? []).toHaveLength(0);
    expect(stored?.statusHistory).toMatchObject([{ from: 'draft', to: 'submitted' }]);

    // The token stops working once the application is in.
    const after = await call('get', `/api/forms/${form.slug}/draft`).set(
      DRAFT_TOKEN_HEADER,
      session.token,
    );
    expect(after.status).toBe(404);
    const resave = await call('patch', `/api/forms/${form.slug}/draft`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({ answers: [] });
    expect(resave.status).toBe(404);
  });

  it('emails the applicant and the team without the answers', async () => {
    ctx.emailSend.mockClear();
    const form = await makeForm({ notifyEmails: ['intake@iaa.org'] });
    const session = await startDraft(form.slug);
    const submitted = await call('post', `/api/forms/${form.slug}/draft/submit`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({ answers: goodAnswers });
    expect(submitted.status).toBe(201);
    const messages = ctx.emailSend.mock.calls.map(([message]) => message);
    const acknowledgement = messages.find((message) => message.to === 'ama.mensah@example.org');
    const notice = messages.find((message) => message.to === 'intake@iaa.org');
    expect(acknowledgement.html).toContain(submitted.body.reference);
    expect(notice.html).toContain('/applications/');
    expect(notice.html).toContain('Ama Mensah');
    expect(notice.html).not.toContain('ama.mensah@example.org');
  });

  it('stops taking applications at the submission limit', async () => {
    const form = await makeForm({ submissionLimit: 1 });
    const session = await startDraft(form.slug);
    expect(
      (
        await call('post', `/api/forms/${form.slug}/draft/submit`)
          .set(DRAFT_TOKEN_HEADER, session.token)
          .send({ answers: goodAnswers })
      ).status,
    ).toBe(201);
    const full = await call('post', `/api/forms/${form.slug}/draft`).send({});
    expect(full.status).toBe(409);
    expect(full.body.error.details).toEqual({ reason: 'limit-reached' });
  });

  it('always accepts a resume-link request, and rotates in a fresh token', async () => {
    ctx.emailSend.mockClear();
    const form = await makeForm();
    const session = await startDraft(form.slug);

    const unknown = await call('post', `/api/forms/${form.slug}/draft/resume-link`)
      .set(DRAFT_TOKEN_HEADER, 'B'.repeat(43))
      .send({ email: 'someone@example.org' });
    expect(unknown.status).toBe(202);
    expect(ctx.emailSend).not.toHaveBeenCalled();

    const badEmail = await call('post', `/api/forms/${form.slug}/draft/resume-link`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({ email: 'nope' });
    expect(badEmail.status).toBe(400);

    const sent = await call('post', `/api/forms/${form.slug}/draft/resume-link`)
      .set(DRAFT_TOKEN_HEADER, session.token)
      .send({ email: 'Kofi@Example.org' });
    expect(sent.status).toBe(202);
    expect(sent.body).toEqual(unknown.body);
    const message = ctx.emailSend.mock.calls[0]?.[0];
    expect(message.to).toBe('kofi@example.org');
    const fresh = /#resume=([A-Za-z0-9_-]{43})/.exec(message.html as string)?.[1] ?? '';
    expect(fresh).not.toBe(session.token);

    for (const token of [session.token, fresh]) {
      const read = await call('get', `/api/forms/${form.slug}/draft`).set(
        DRAFT_TOKEN_HEADER,
        token,
      );
      expect(read.status).toBe(200);
    }
    const stored = await FormSubmissionModel.findOne({ formId: form.id }).lean();
    expect(stored?.tokenHashes).toHaveLength(2);
    expect(stored?.applicant?.email).toBe('kofi@example.org');
  });
});

describe('applicant files', () => {
  const folderOf = async (slug: string, token: string): Promise<SignedApplicationUpload> => {
    const signed = await call('post', `/api/forms/${slug}/draft/uploads/sign`)
      .set(DRAFT_TOKEN_HEADER, token)
      .send({ fieldId: 'cv', filename: 'My CV.pdf', bytes: 1024 });
    expect(signed.status).toBe(200);
    return signed.body as SignedApplicationUpload;
  };

  const fileAnswer = (publicId: string, cloud = 'iaa-test-cloud') => ({
    fieldId: 'cv',
    value: [
      {
        publicId,
        url: `https://res.cloudinary.com/${cloud}/image/authenticated/v1/${publicId}.pdf`,
        name: 'My CV.pdf',
        format: 'pdf',
        bytes: 1024,
        resourceType: 'image',
      },
    ],
  });

  it('signs uploads into the draft folder, only for file questions and allowed files', async () => {
    const form = await makeForm();
    const session = await startDraft(form.slug);
    const signed = await folderOf(form.slug, session.token);
    expect(signed.folder).toMatch(new RegExp(`^iaa/applications/${form.id}/[a-f0-9]{24}$`));
    expect(signed.publicId.startsWith(`${signed.folder}/cv-`)).toBe(true);
    expect(signed.allowedFormats).toEqual(['pdf']);
    expect(signed.maxBytes).toBe(2 * 1024 * 1024);
    expect(signed.fields).toMatchObject({ type: 'authenticated', overwrite: 'false' });
    expect(signed.fields).not.toHaveProperty('api_secret');

    const sign = (body: Record<string, unknown>) =>
      call('post', `/api/forms/${form.slug}/draft/uploads/sign`)
        .set(DRAFT_TOKEN_HEADER, session.token)
        .send(body);
    expect(
      (await sign({ fieldId: 'name', filename: 'a.pdf', bytes: 10 })).body.error.details,
    ).toEqual([{ path: 'fieldId', message: 'This question does not take files.' }]);
    expect((await sign({ fieldId: 'cv', filename: 'a.exe', bytes: 10 })).status).toBe(400);
    expect((await sign({ fieldId: 'cv', filename: 'a.pdf', bytes: 3 * 1024 * 1024 })).status).toBe(
      400,
    );
    const noToken = await call('post', `/api/forms/${form.slug}/draft/uploads/sign`).send({
      fieldId: 'cv',
      filename: 'a.pdf',
      bytes: 10,
    });
    expect(noToken.status).toBe(404);
  });

  it('refuses a file from outside the draft folder or another account, and checks the stored file', async () => {
    const resource = vi
      .spyOn(cloudinary.api, 'resource')
      .mockResolvedValue({ bytes: 2048, format: 'pdf', resource_type: 'image' } as never);
    const form = await makeForm();
    const session = await startDraft(form.slug);
    const signed = await folderOf(form.slug, session.token);
    const submit = (answer: ReturnType<typeof fileAnswer>) =>
      call('post', `/api/forms/${form.slug}/draft/submit`)
        .set(DRAFT_TOKEN_HEADER, session.token)
        .send({ answers: [...goodAnswers, answer] });

    const otherDraft = `iaa/applications/${form.id}/${'0'.repeat(24)}/cv-0123456789abcdef`;
    const escaped = await submit(fileAnswer(otherDraft));
    expect(escaped.status).toBe(400);
    expect(escaped.body.error.details[0]).toMatchObject({ path: 'answers.cv', stepId: 'files' });

    const foreign = await submit(fileAnswer(signed.publicId, 'someone-else'));
    expect(foreign.status).toBe(400);

    // A checked id carrying a link to some other file in the account.
    const swapped = fileAnswer(signed.publicId);
    for (const item of swapped.value) {
      item.url = 'https://res.cloudinary.com/iaa-test-cloud/image/upload/v1/iaa/site/logo.png';
    }
    expect((await submit(swapped)).status).toBe(400);
    expect(resource).not.toHaveBeenCalled();

    const accepted = await submit(fileAnswer(signed.publicId));
    expect(accepted.status).toBe(201);
    expect(resource).toHaveBeenCalledWith(
      signed.publicId,
      expect.objectContaining({ type: 'authenticated', resource_type: 'image' }),
    );
    const stored = await FormSubmissionModel.findOne({ reference: accepted.body.reference }).lean();
    const cv = stored?.answers.find((answer) => answer.fieldId === 'cv')?.value as {
      bytes: number;
    }[];
    // The stored size is what Cloudinary reported, not what the browser said.
    expect(cv[0]?.bytes).toBe(2048);
    resource.mockRestore();
  });
});

import {
  DRAFT_TOKEN_HEADER,
  REVIEWABLE_APPLICATION_STATUSES,
  ROLE_TEMPLATES,
  UserRole,
  type AdminApplication,
  type ApplicationListItem,
  type FormDefinition,
  type FormStep,
  type Permission,
} from '@iaa/shared';
import { v2 as cloudinary } from 'cloudinary';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditEventModel } from '../../src/modules/audit/audit.model.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import { FormSubmissionModel } from '../../src/modules/forms/form-submission.model.js';
import { FormVersionModel } from '../../src/modules/forms/form-version.model.js';
import { FormModel } from '../../src/modules/forms/form.model.js';
import { PrivacyRequestModel } from '../../src/modules/privacy/privacy-request.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

// Configured so file answers come back with signed links; signing is local.
process.env.CLOUDINARY_CLOUD_NAME = 'iaa-test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

let ctx: TestContext;
let admin: string;
let reviewer: string;
let readOnly: string;
let editor: string;
let form: FormDefinition;
let otherForm: FormDefinition;
const ids: Record<string, string> = {};
const password = 'TestApplications2026!';

type Method = 'get' | 'post' | 'patch' | 'delete';

// One address per test keeps the per-address limiters out of the way.
let ip = '10.30.0.1';
let ipCount = 0;
beforeEach(() => {
  ipCount += 1;
  ip = `10.30.${Math.floor(ipCount / 200)}.${(ipCount % 200) + 1}`;
});

const call = (method: Method, path: string, token?: string) => {
  const pending = request(ctx.app)[method](path).set('X-Forwarded-For', ip);
  return token ? pending.set('Authorization', `Bearer ${token}`) : pending;
};

// Four logins in this file, well inside the shared login limiter.
const login = async (email: string, role: UserRole, permissions: Permission[]): Promise<string> => {
  const user = await UserModel.create({
    name: email.split('@')[0],
    email,
    role,
    permissions,
    passwordHash: await new PasswordService().hash(password),
  });
  ids[email] = user.id as string;
  const result = await request(ctx.app).post('/api/auth/login').send({ email, password });
  return result.body.tokens.accessToken as string;
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
    ],
  },
  {
    id: 'more',
    title: 'More',
    fields: [
      {
        id: 'topics',
        type: 'multi-select',
        label: 'Topics',
        required: false,
        options: [
          { value: 'ai', label: 'Artificial intelligence' },
          { value: 'stem', label: 'STEM, for girls' },
        ],
      },
      { id: 'pitch', type: 'long-text', label: 'Your pitch', required: false, options: [] },
      { id: 'onsite', type: 'checkbox', label: 'Can attend', required: false, options: [] },
      {
        id: 'cv',
        type: 'file',
        label: 'CV',
        required: false,
        options: [],
        validation: { fileKinds: ['pdf'] },
      },
    ],
  },
];

const makePublishedForm = async (slug: string): Promise<FormDefinition> => {
  const created = await call('post', '/api/admin/forms', admin).send({
    title: `Call ${slug}`,
    slug,
    steps,
  });
  const published = await call('patch', `/api/admin/forms/${created.body.id}/status`, admin).send({
    status: 'published',
  });
  expect(published.status).toBe(200);
  return published.body as FormDefinition;
};

/** An application through the real applicant endpoints. */
const apply = async (target: FormDefinition, answers: unknown[]): Promise<string> => {
  const draft = await call('post', `/api/forms/${target.slug}/draft`).send({});
  const submitted = await call('post', `/api/forms/${target.slug}/draft/submit`)
    .set(DRAFT_TOKEN_HEADER, draft.body.token as string)
    .send({ answers });
  expect(submitted.status).toBe(201);
  const stored = await FormSubmissionModel.findOne({ reference: submitted.body.reference }).lean();
  return stored!._id.toString();
};

beforeAll(async () => {
  ctx = await createTestContext();
  await Promise.all([FormModel.init(), FormSubmissionModel.init(), FormVersionModel.init()]);
  admin = await login('apps.admin@iaa.org', UserRole.Admin, ROLE_TEMPLATES.admin);
  reviewer = await login('apps.reviewer@iaa.org', UserRole.Editor, [
    'applications:read',
    'applications:update',
  ]);
  readOnly = await login('apps.reader@iaa.org', UserRole.Editor, ['applications:read']);
  // The editor template: forms yes, applications no (plan D2).
  editor = await login('apps.editor@iaa.org', UserRole.Editor, ROLE_TEMPLATES.editor);

  form = await makePublishedForm('speakers-call');
  otherForm = await makePublishedForm('mentors-call');
  ids.ama = await apply(form, [
    { fieldId: 'name', value: 'Ama Mensah' },
    { fieldId: 'email', value: 'ama@example.org' },
    { fieldId: 'topics', value: ['ai', 'stem'] },
    { fieldId: 'pitch', value: '=HYPERLINK("http://evil.example","Click") and "quotes", commas' },
    { fieldId: 'onsite', value: true },
  ]);
  ids.kofi = await apply(form, [
    { fieldId: 'name', value: 'Kofi Boateng' },
    { fieldId: 'email', value: 'kofi@example.org' },
  ]);
  ids.esi = await apply(otherForm, [
    { fieldId: 'name', value: 'Esi Owusu' },
    { fieldId: 'email', value: 'esi@example.org' },
  ]);
  // A draft in progress, which no reviewer should ever see.
  await call('post', `/api/forms/${form.slug}/draft`).send({
    answers: [{ fieldId: 'name', value: 'Still Typing' }],
  });
}, 120_000);

afterAll(async () => {
  await ctx?.teardown();
});

describe('who can see applications', () => {
  it('needs applications:read to look and applications:update to act', async () => {
    expect((await call('get', '/api/admin/applications')).status).toBe(401);
    for (const path of [
      '/api/admin/applications',
      '/api/admin/applications/counts',
      `/api/admin/applications/export?formId=${form.id}`,
      `/api/admin/applications/${ids.ama}`,
    ]) {
      expect((await call('get', path, editor)).status).toBe(403);
    }
    expect((await call('get', '/api/admin/applications', readOnly)).status).toBe(200);
    expect(
      (
        await call('patch', `/api/admin/applications/${ids.ama}/status`, readOnly).send({
          status: 'under-review',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call('post', `/api/admin/applications/${ids.ama}/reviews`, readOnly).send({
          notes: 'x',
        })
      ).status,
    ).toBe(403);
  });
});

describe('the application lists', () => {
  it('lists submitted applications with their form, never drafts', async () => {
    const list = await call('get', '/api/admin/applications?pageSize=50', readOnly);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(3);
    const items = list.body.items as ApplicationListItem[];
    expect(items.every((item) => item.status !== 'draft')).toBe(true);
    expect(items.map((item) => item.applicant.name)).not.toContain('Still Typing');
    const ama = items.find((item) => item.id === ids.ama);
    expect(ama).toMatchObject({
      form: { id: form.id, title: form.title, slug: form.slug },
      applicant: { name: 'Ama Mensah', email: 'ama@example.org' },
      status: 'submitted',
      reviewCount: 0,
    });
    expect(ama).not.toHaveProperty('answers');
  });

  it('filters by form, status, text and submission day, and sorts', async () => {
    const byForm = await call('get', `/api/admin/applications?formId=${otherForm.id}`, readOnly);
    expect(byForm.body.items.map((item: ApplicationListItem) => item.id)).toEqual([ids.esi]);

    const byName = await call('get', '/api/admin/applications?q=kofi', readOnly);
    expect(byName.body.items.map((item: ApplicationListItem) => item.id)).toEqual([ids.kofi]);

    const reference = byName.body.items[0].reference as string;
    const byReference = await call(
      'get',
      `/api/admin/applications?q=${reference.toLowerCase()}`,
      readOnly,
    );
    expect(byReference.body.total).toBe(1);

    const regex = await call('get', '/api/admin/applications?q=.*', readOnly);
    expect(regex.body.total).toBe(0);

    const today = new Date().toISOString().slice(0, 10);
    const inRange = await call(
      'get',
      `/api/admin/applications?from=${today}&to=${today}`,
      readOnly,
    );
    expect(inRange.body.total).toBe(3);
    const before = await call('get', '/api/admin/applications?to=2020-01-01', readOnly);
    expect(before.body.total).toBe(0);
    expect((await call('get', '/api/admin/applications?from=2026-02-30', readOnly)).status).toBe(
      400,
    );

    const oldest = await call('get', '/api/admin/applications?order=asc&pageSize=1', readOnly);
    expect(oldest.body.items[0].id).toBe(ids.ama);
    expect(oldest.body.totalPages).toBe(3);

    expect((await call('get', '/api/admin/applications?status=draft', readOnly)).status).toBe(400);
    const queue = await call(
      'get',
      '/api/admin/applications?statuses=submitted,under-review&order=asc',
      readOnly,
    );
    expect(queue.body.total).toBe(3);
    expect(
      (await call('get', '/api/admin/applications?statuses=accepted,rejected', readOnly)).body
        .total,
    ).toBe(0);
  });

  it('counts applications by status', async () => {
    const counts = await call('get', '/api/admin/applications/counts', readOnly);
    expect(counts.status).toBe(200);
    expect(counts.body).toEqual({
      submitted: 3,
      'under-review': 0,
      shortlisted: 0,
      accepted: 0,
      rejected: 0,
    });
  });

  // The status tabs sit beside a filtered list, so they count what it shows.
  it('counts only what the form, search and date filters select, when given them', async () => {
    const submittedFor = async (query: string): Promise<number> => {
      const counts = await call('get', `/api/admin/applications/counts?${query}`, readOnly);
      expect(counts.status).toBe(200);
      return counts.body.submitted as number;
    };
    expect(await submittedFor(`formId=${otherForm.id}`)).toBe(1);
    expect(await submittedFor(`formId=${form.id}`)).toBe(2);
    expect(await submittedFor('q=kofi')).toBe(1);
    expect(await submittedFor('to=2020-01-01')).toBe(0);
    const today = new Date().toISOString().slice(0, 10);
    expect(await submittedFor(`from=${today}&formId=${form.id}`)).toBe(2);
    expect((await call('get', '/api/admin/applications/counts?formId=nope', readOnly)).status).toBe(
      400,
    );
  });
});

describe('one application', () => {
  it('shows answers in the order and wording the applicant saw', async () => {
    // Renaming a question later must not rewrite what the applicant was asked.
    const renamed = steps.map((step) => ({
      ...step,
      fields: step.fields.map((field) =>
        field.id === 'name' ? { ...field, label: 'Name, as on your passport' } : field,
      ),
    }));
    const edited = await call('patch', `/api/admin/forms/${form.id}`, admin).send({
      steps: renamed,
    });
    expect(edited.body.version).toBe(2);

    const detail = await call('get', `/api/admin/applications/${ids.ama}`, readOnly);
    expect(detail.status).toBe(200);
    const application = detail.body as AdminApplication;
    expect(application.formVersion).toBe(1);
    expect(application.definition.version).toBe(1);
    expect(application.answers.map((answer) => [answer.fieldId, answer.stepId])).toEqual([
      ['name', 'about'],
      ['email', 'about'],
      ['topics', 'more'],
      ['pitch', 'more'],
      ['onsite', 'more'],
    ]);
    expect(application.answers[0]?.label).toBe('Full name');
    expect(application.statusHistory).toEqual([
      expect.objectContaining({ from: 'draft', to: 'submitted', by: null }),
    ]);
    expect(application.consent).toBeUndefined();

    expect((await call('get', `/api/admin/applications/${'0'.repeat(24)}`, readOnly)).status).toBe(
      404,
    );
    const draft = await FormSubmissionModel.findOne({ status: 'draft' }).lean();
    expect((await call('get', `/api/admin/applications/${draft!._id}`, readOnly)).status).toBe(404);
  });

  it('gives file answers a signed link in place of the stored one', async () => {
    const stored = await FormSubmissionModel.create({
      formId: form.id,
      formVersion: 1,
      status: 'submitted',
      reference: 'APP-FILE22',
      submittedAt: new Date(),
      applicant: { name: 'Yaw File' },
      answers: [
        {
          fieldId: 'cv',
          value: [
            {
              publicId: `iaa/applications/${form.id}/abc/cv-0011`,
              url: 'https://res.cloudinary.com/iaa-test-cloud/image/authenticated/v1/x.pdf',
              name: 'cv.pdf',
              format: 'pdf',
              resourceType: 'image',
            },
          ],
        },
      ],
    });
    try {
      const detail = await call('get', `/api/admin/applications/${stored.id}`, readOnly);
      const file = (detail.body.answers[0].value as { url: string }[])[0];
      // A link Cloudinary will check, made now, never the stored one: a signed
      // delivery URL (`s--…`) or a signed, expiring download (`signature=`).
      expect(file?.url).not.toBe(
        'https://res.cloudinary.com/iaa-test-cloud/image/authenticated/v1/x.pdf',
      );
      expect(file?.url).toMatch(
        /^https:\/\/(res|api)\.cloudinary\.com\/(v1_1\/)?iaa-test-cloud\/image\/.*(s--|signature=)/,
      );
    } finally {
      // Removed whatever happens, so the counts and export below still hold.
      await FormSubmissionModel.deleteOne({ _id: stored._id });
    }
  });

  it('moves an application through its statuses and keeps the history', async () => {
    const moved = await call('patch', `/api/admin/applications/${ids.kofi}/status`, reviewer).send({
      status: 'under-review',
      note: 'Strong session idea',
    });
    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe('under-review');
    expect(moved.body.statusHistory[1]).toMatchObject({
      from: 'submitted',
      to: 'under-review',
      note: 'Strong session idea',
      by: { email: 'apps.reviewer@iaa.org' },
    });

    // A retried request changes nothing.
    const repeat = await call('patch', `/api/admin/applications/${ids.kofi}/status`, reviewer).send(
      {
        status: 'under-review',
      },
    );
    expect(repeat.body.statusHistory).toHaveLength(2);

    const toDraft = await call(
      'patch',
      `/api/admin/applications/${ids.kofi}/status`,
      reviewer,
    ).send({
      status: 'draft',
    });
    expect(toDraft.status).toBe(400);

    const accepted = await call(
      'patch',
      `/api/admin/applications/${ids.kofi}/status`,
      reviewer,
    ).send({
      status: 'accepted',
    });
    expect(accepted.body.statusHistory.map((change: { to: string }) => change.to)).toEqual([
      'submitted',
      'under-review',
      'accepted',
    ]);
    const audit = await AuditEventModel.find({
      entityId: ids.kofi,
      action: 'status-changed',
    }).lean();
    expect(audit).toHaveLength(2);

    const counts = await call('get', '/api/admin/applications/counts', readOnly);
    expect(counts.body).toMatchObject({ submitted: 2, accepted: 1 });
  });

  it('keeps internal reviews, removable by their author or an administrator', async () => {
    const bad = await call('post', `/api/admin/applications/${ids.ama}/reviews`, reviewer).send({
      notes: '',
      score: 9,
    });
    expect(bad.status).toBe(400);

    const added = await call('post', `/api/admin/applications/${ids.ama}/reviews`, reviewer).send({
      notes: 'Clear and relevant.',
      recommendation: 'yes',
      score: 4,
    });
    expect(added.status).toBe(201);
    const review = added.body.reviews[0];
    expect(review).toMatchObject({
      notes: 'Clear and relevant.',
      recommendation: 'yes',
      score: 4,
      reviewer: { email: 'apps.reviewer@iaa.org' },
    });

    const second = await call('post', `/api/admin/applications/${ids.ama}/reviews`, admin).send({
      notes: 'Agree, but short on detail.',
      recommendation: 'maybe',
    });
    const adminReview = second.body.reviews[1];

    const list = await call('get', `/api/admin/applications?q=ama`, readOnly);
    expect(list.body.items[0]).toMatchObject({ reviewCount: 2, lastRecommendation: 'maybe' });

    // Only the author, or an administrator, may remove a review.
    const notYours = await call(
      'delete',
      `/api/admin/applications/${ids.ama}/reviews/${adminReview.id}`,
      reviewer,
    );
    expect(notYours.status).toBe(403);
    const byAdmin = await call(
      'delete',
      `/api/admin/applications/${ids.ama}/reviews/${review.id}`,
      admin,
    );
    expect(byAdmin.status).toBe(204);
    const missing = await call(
      'delete',
      `/api/admin/applications/${ids.ama}/reviews/${review.id}`,
      admin,
    );
    expect(missing.status).toBe(404);
    const reviewed = await AuditEventModel.countDocuments({
      entityId: ids.ama,
      action: 'reviewed',
    });
    expect(reviewed).toBe(2);
  });
});

describe('exporting applications', () => {
  it('returns a guarded CSV of every submitted application to one form', async () => {
    expect((await call('get', '/api/admin/applications/export', readOnly)).status).toBe(400);
    expect(
      (await call('get', `/api/admin/applications/export?formId=${'0'.repeat(24)}`, readOnly))
        .status,
    ).toBe(404);

    const exported = await call(
      'get',
      `/api/admin/applications/export?formId=${form.id}`,
      readOnly,
    );
    expect(exported.status).toBe(200);
    expect(exported.body.filename).toMatch(/^speakers-call-applications-\d{4}-\d{2}-\d{2}\.csv$/);
    const lines = (exported.body.csv as string).split('\r\n');
    // The current wording heads the column.
    expect(lines[0]).toBe(
      'Reference,Status,Submitted at,Applicant name,Applicant email,Applicant phone,' +
        '"Name, as on your passport",Email,Topics,Your pitch,Can attend,CV',
    );
    expect(lines).toHaveLength(3);
    const ama = lines.find((line) => line.includes('Ama Mensah')) ?? '';
    // Choices by their label, several joined by semicolons, quoted for the comma.
    expect(ama).toContain('"Artificial intelligence; STEM, for girls"');
    expect(ama).toContain(
      `"'=HYPERLINK(""http://evil.example"",""Click"") and ""quotes"", commas"`,
    );
    expect(ama).toContain(',Yes,');
    expect(exported.body.csv).not.toContain('Still Typing');
  });
});

describe('the list indexes', () => {
  /** Every stage named anywhere in a query plan. */
  const stagesOf = (plan: unknown): string[] => {
    if (Array.isArray(plan)) return plan.flatMap(stagesOf);
    if (!plan || typeof plan !== 'object') return [];
    const node = plan as Record<string, unknown>;
    return [
      ...(typeof node.stage === 'string' ? [node.stage] : []),
      ...Object.values(node).flatMap(stagesOf),
    ];
  };

  it('reads the list and export order from an index, never sorting every match in memory', async () => {
    await FormSubmissionModel.syncIndexes();
    const reviewable = { $in: [...REVIEWABLE_APPLICATION_STATUSES] };
    const formId = new Types.ObjectId(form.id);
    const cases = [
      [{ status: reviewable }, { submittedAt: -1, _id: -1 }],
      [{ status: reviewable }, { submittedAt: 1, _id: 1 }],
      [{ status: 'submitted' }, { submittedAt: -1, _id: -1 }],
      [
        { formId, status: reviewable },
        { submittedAt: -1, _id: -1 },
      ],
      // The CSV export: one form, oldest first.
      [
        { formId, status: reviewable },
        { submittedAt: 1, _id: 1 },
      ],
    ] as const;
    for (const [filter, sort] of cases) {
      const explained: unknown = await FormSubmissionModel.find(filter)
        .sort(sort)
        .limit(5)
        .explain('queryPlanner');
      const winning = (Array.isArray(explained) ? explained[0] : explained) as {
        queryPlanner: { winningPlan: unknown };
      };
      const stages = stagesOf(winning.queryPlanner.winningPlan);
      expect(stages, JSON.stringify({ filter, sort })).toContain('IXSCAN');
      expect(stages, JSON.stringify({ filter, sort })).not.toContain('SORT');
    }
  });
});

describe('privacy requests and applications (plan D2)', () => {
  const address = 'privacy.person@example.org';
  let applicationId = '';

  beforeAll(async () => {
    applicationId = await apply(otherForm, [
      { fieldId: 'name', value: 'Abena Privacy' },
      { fieldId: 'email', value: address },
      { fieldId: 'pitch', value: 'A private pitch' },
    ]);
  });

  it('leaves applications out of an editor export, saying how many were left out', async () => {
    const byEditor = await call(
      'get',
      `/api/admin/privacy-requests/export?email=${encodeURIComponent('Privacy.Person@example.org')}`,
      editor,
    );
    expect(byEditor.status).toBe(200);
    expect(byEditor.body.applications).toEqual([]);
    expect(byEditor.body.applicationsWithheld).toBe(1);
    expect(JSON.stringify(byEditor.body)).not.toContain('A private pitch');

    const byAdmin = await call('get', `/api/admin/privacy-requests/export?email=${address}`, admin);
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.applications).toHaveLength(1);
    expect(byAdmin.body.applications[0].answers).toContainEqual({
      question: 'Your pitch',
      value: 'A private pitch',
    });
    expect(byAdmin.body).not.toHaveProperty('applicationsWithheld');
  });

  it('lets only someone who may erase applications fulfil a deletion that reaches them', async () => {
    const privacyRequest = await PrivacyRequestModel.create({
      email: address,
      type: 'delete',
      status: 'pending',
    });
    const path = `/api/admin/privacy-requests/${privacyRequest.id as string}`;

    const refused = await call('patch', path, editor).send({ status: 'fulfilled' });
    expect(refused.status).toBe(403);
    expect(refused.body.error.message).toMatch(/erase applications/);
    // Nothing was erased, and the request is still open.
    expect(await FormSubmissionModel.exists({ _id: applicationId })).not.toBeNull();
    expect((await PrivacyRequestModel.findById(privacyRequest.id).lean())?.status).toBe('pending');

    // Cloudinary's Admin API is never reached from a test.
    const removeFolder = vi
      .spyOn(cloudinary.api, 'delete_resources_by_prefix')
      .mockResolvedValue({ deleted: {} } as never);
    try {
      const fulfilled = await call('patch', path, admin).send({ status: 'fulfilled' });
      expect(fulfilled.status).toBe(200);
      expect(await FormSubmissionModel.exists({ _id: applicationId })).toBeNull();
      // The whole folder goes, not only the files the answers still name.
      expect(removeFolder).toHaveBeenCalledWith(
        `iaa/applications/${otherForm.id}/${applicationId}/`,
        expect.objectContaining({ type: 'authenticated' }),
      );
    } finally {
      removeFolder.mockRestore();
    }
  });
});

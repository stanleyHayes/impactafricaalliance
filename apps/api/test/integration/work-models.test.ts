import {
  formCreateSchema,
  formTemplate,
  impactStoryInputSchema,
  PROGRAMME_KEYS,
  projectInputSchema,
  storyFromProject,
  taskInputSchema,
} from '@iaa/shared';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuditEventModel } from '../../src/modules/audit/audit.model.js';
import { FormSubmissionModel } from '../../src/modules/forms/form-submission.model.js';
import { FormVersionModel } from '../../src/modules/forms/form-version.model.js';
import { FormModel } from '../../src/modules/forms/form.model.js';
import { ImpactStoryModel } from '../../src/modules/impact-stories/impact-story.model.js';
import { ProjectModel } from '../../src/modules/projects/project.model.js';
import { TaskCommentModel } from '../../src/modules/tasks/task-comment.model.js';
import { TaskModel } from '../../src/modules/tasks/task.model.js';

/**
 * The models against the shared contracts. Mongoose quietly drops any field a
 * schema does not declare, so a missing sub-schema field would lose data with
 * no error; each test saves what the shared schema produces and checks every
 * value comes back.
 */

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT ??= '60000';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Index builds are asynchronous in tests; the duplicate checks need them done.
  await Promise.all(
    [
      ProjectModel,
      TaskModel,
      FormModel,
      FormVersionModel,
      FormSubmissionModel,
      ImpactStoryModel,
    ].map((model) => model.init()),
  );
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

// A stored document as JSON, which is how the values would reach a client.
const readBack = async (model: mongoose.Model<never>, id: unknown): Promise<unknown> =>
  JSON.parse(JSON.stringify(await model.findById(id).lean().exec()));

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const isDuplicateKey = (error: unknown): boolean => (error as { code?: number }).code === 11000;

const image = {
  url: 'https://res.cloudinary.com/demo/image/upload/v1/iaa/projects/hub.jpg',
  publicId: 'iaa/projects/hub',
  width: 1200,
  height: 800,
  alt: 'Learners at the hub',
};
const personId = new Types.ObjectId().toHexString();

describe('Project model', () => {
  it('keeps every field of a full project', async () => {
    const input = projectInputSchema.parse({
      title: 'Digital skills hubs',
      slug: 'digital-skills-hubs',
      code: 'DSH-2026',
      summary: 'Community hubs teaching digital skills to young people.',
      description: '## Why\nBecause.',
      status: 'active',
      priority: 'high',
      leadId: personId,
      memberIds: [personId],
      programme: PROGRAMME_KEYS[0],
      startDate: '2026-10-05T12:00:00.000Z',
      endDate: '2027-03-31T12:00:00.000Z',
      country: 'Ghana',
      region: 'Northern',
      locationText: 'Tamale and surrounding districts',
      objectives: ['Train 500 learners'],
      partners: [{ name: 'Tech Partner', role: 'Curriculum', url: 'https://partner.example' }],
      tags: ['digital'],
      sdgs: [4, 8],
      cover: image,
      milestones: [
        {
          id: 'launch',
          kind: 'milestone',
          title: 'Launch the first hub',
          description: 'Opening day',
          dueDate: '2026-11-01T12:00:00.000Z',
          status: 'done',
          completedAt: '2026-10-30T09:00:00.000Z',
        },
      ],
      metrics: [{ id: 'learners', label: 'Learners', value: 120, target: 500, suffix: '+' }],
      risks: [
        { id: 'power', title: 'Power cuts', level: 'high', mitigation: 'Solar', status: 'open' },
      ],
      progressOverride: { value: 40, reason: 'Field visits not yet logged' },
    });
    const created = await ProjectModel.create({
      ...input,
      media: [
        {
          id: 'photo-1',
          image,
          caption: 'Opening day',
          takenOn: '2026-10-30T12:00:00.000Z',
          shareable: true,
          addedBy: personId,
          addedAt: '2026-10-30T15:00:00.000Z',
        },
      ],
      documents: [
        {
          id: 'budget',
          name: 'Budget',
          file: {
            url: 'https://res.cloudinary.com/demo/raw/upload/v1/iaa/documents/budget.xlsx',
            publicId: 'iaa/documents/budget.xlsx',
            format: 'xlsx',
            bytes: 2048,
            resourceType: 'raw',
            originalFilename: 'budget-final',
          },
          addedBy: personId,
          addedAt: '2026-10-30T15:00:00.000Z',
        },
      ],
      createdBy: personId,
      updatedBy: personId,
      archivedAt: '2026-12-01T00:00:00.000Z',
    });
    expect(await readBack(ProjectModel as never, created._id)).toMatchObject(
      plain({
        ...input,
        media: [
          {
            id: 'photo-1',
            image,
            caption: 'Opening day',
            takenOn: '2026-10-30T12:00:00.000Z',
            shareable: true,
            addedBy: personId,
            addedAt: '2026-10-30T15:00:00.000Z',
          },
        ],
        documents: [
          { id: 'budget', name: 'Budget', file: { format: 'xlsx', resourceType: 'raw' } },
        ],
        createdBy: personId,
        archivedAt: '2026-12-01T00:00:00.000Z',
      }) as object,
    );
    // Clients see `id`, never `_id`, and sub-items carry only their stable ids.
    const json = created.toJSON() as unknown as Record<string, unknown>;
    expect(json.id).toBe(created._id.toString());
    expect(json).not.toHaveProperty('_id');
    expect((json.milestones as object[])[0]).not.toHaveProperty('_id');
  });

  it('refuses a second project with the same slug', async () => {
    const base = { title: 'Twin', slug: 'twin-project', summary: 'A summary long enough.' };
    await ProjectModel.create(base);
    await expect(ProjectModel.create(base)).rejects.toSatisfy(isDuplicateKey);
  });
});

describe('Task models', () => {
  it('keeps every field of a full task', async () => {
    const input = taskInputSchema.parse({
      title: 'Book the venue',
      description: 'Call the district office.',
      status: 'in-progress',
      priority: 'urgent',
      assigneeIds: [personId],
      projectId: new Types.ObjectId().toHexString(),
      milestoneId: 'launch',
      startDate: '2026-10-05T12:00:00.000Z',
      dueDate: '2026-10-09T12:00:00.000Z',
      estimateHours: 3.5,
      labels: ['logistics'],
      checklist: [{ id: 'call', text: 'Call them', done: true }],
      parentTaskId: new Types.ObjectId().toHexString(),
      dependencyIds: [new Types.ObjectId().toHexString()],
    });
    const extra = {
      key: 'IAA-1',
      number: 1,
      boardOrder: 1536.5,
      commentCount: 2,
      checklist: [{ ...input.checklist[0], doneAt: '2026-10-06T10:00:00.000Z', doneBy: personId }],
      attachments: [
        {
          id: 'quote',
          name: 'Venue quote',
          file: { url: image.url, publicId: image.publicId, format: 'jpg', bytes: 10 },
          addedBy: personId,
          addedAt: '2026-10-06T10:00:00.000Z',
        },
      ],
      completedAt: '2026-10-07T10:00:00.000Z',
      createdBy: personId,
    };
    const created = await TaskModel.create({ ...input, ...extra });
    expect(await readBack(TaskModel as never, created._id)).toMatchObject(
      plain({ ...input, ...extra }) as object,
    );
  });

  it('refuses a second task with the same key or number', async () => {
    await TaskModel.create({ key: 'IAA-900', number: 900, title: 'First' });
    await expect(
      TaskModel.create({ key: 'IAA-900', number: 901, title: 'Clash' }),
    ).rejects.toSatisfy(isDuplicateKey);
    await expect(
      TaskModel.create({ key: 'IAA-902', number: 900, title: 'Clash' }),
    ).rejects.toSatisfy(isDuplicateKey);
  });

  it('keeps a comment with its mentions', async () => {
    const comment = await TaskCommentModel.create({
      taskId: new Types.ObjectId(),
      authorId: personId,
      body: 'Over to you @Ama',
      mentions: [personId],
      editedAt: '2026-10-06T11:00:00.000Z',
    });
    expect(await readBack(TaskCommentModel as never, comment._id)).toMatchObject({
      body: 'Over to you @Ama',
      mentions: [personId],
      authorId: personId,
      editedAt: '2026-10-06T11:00:00.000Z',
    });
  });
});

describe('Form models', () => {
  const buildForm = () => {
    const template = formTemplate('speaker-application');
    const firstField = template.steps[0]?.fields[0]?.id ?? 'name';
    const parsed = formCreateSchema.parse({
      ...template,
      slug: 'speakers-2026',
      description: 'Internal note',
      settings: {
        ...template.settings,
        opensAt: '2026-10-01T09:00:00.000Z',
        closesAt: '2026-11-01T17:00:00.000Z',
        successMessage: 'Thank you.',
        submissionLimit: 200,
        notifyEmails: ['events@iaa.org'],
        acknowledgeApplicant: true,
      },
      steps: [
        ...template.steps,
        {
          id: 'extra',
          title: 'Supporting material',
          description: 'Anything else',
          image,
          visibility: { match: 'any', rules: [{ fieldId: firstField, operator: 'is-not-empty' }] },
          fields: [
            {
              id: 'portfolio',
              type: 'file',
              label: 'Portfolio',
              helpText: 'PDF or images',
              placeholder: 'Choose files',
              required: true,
              validation: { maxFiles: 2, fileKinds: ['pdf', 'image'], maxSizeMB: 5 },
              visibility: {
                match: 'all',
                rules: [{ fieldId: firstField, operator: 'equals', value: 'yes' }],
              },
              mapsTo: null,
            },
            {
              id: 'topic',
              type: 'select',
              label: 'Topic',
              options: [{ value: 'skills', label: 'Skills' }],
              validation: { minLength: 1, maxLength: 20, min: 1, max: 3 },
              consentText: 'Unused here',
              mapsTo: 'applicant-name',
            },
          ],
        },
      ],
    });
    // Only a create request carries the template key; the stored form never does.
    delete parsed.template;
    return parsed;
  };

  it('keeps every step, question and setting of a form built from the template', async () => {
    const definition = buildForm();
    const created = await FormModel.create({ ...definition, createdBy: personId });
    const stored = (await readBack(FormModel as never, created._id)) as Record<string, unknown>;
    expect(stored).toMatchObject(plain(definition) as object);
    expect(stored.steps).toEqual(plain(definition.steps));
    expect(stored.version).toBe(1);
    expect(stored.status).toBe('draft');
  });

  it('snapshots a version and refuses a second snapshot of the same version', async () => {
    const definition = buildForm();
    const form = await FormModel.create({ ...definition, slug: 'speakers-versioned' });
    const snapshot = {
      formId: form._id,
      version: 1,
      title: definition.title,
      intro: definition.intro,
      steps: definition.steps,
    };
    const created = await FormVersionModel.create(snapshot);
    expect(await readBack(FormVersionModel as never, created._id)).toMatchObject(
      plain(snapshot) as object,
    );
    await expect(FormVersionModel.create(snapshot)).rejects.toSatisfy(isDuplicateKey);
  });

  it('keeps answers of every shape, reviews and history', async () => {
    const fileAnswer = {
      publicId: 'iaa/applications/f/d/cv-0123456789abcdef',
      url: 'https://res.cloudinary.com/demo/image/authenticated/s--abcdefgh--/v1/iaa/applications/f/d/cv.pdf',
      name: 'cv.pdf',
      format: 'pdf',
      bytes: 1024,
      resourceType: 'image',
    };
    const application = {
      reference: 'APP-7K2Q9M',
      formId: new Types.ObjectId(),
      formVersion: 2,
      status: 'shortlisted',
      applicant: { name: 'Kofi Mensah', email: 'kofi@example.org', phone: '+233201234567' },
      answers: [
        { fieldId: 'name', value: 'Kofi Mensah' },
        { fieldId: 'topics', value: ['skills', 'jobs'] },
        { fieldId: 'agree', value: true },
        { fieldId: 'travel', value: false },
        { fieldId: 'years', value: 7 },
        { fieldId: 'cv', value: [fileAnswer] },
        { fieldId: 'skipped', value: null },
      ],
      currentStepId: 'about',
      tokenHashes: ['a'.repeat(64)],
      consent: { version: 'privacy-2026-09', at: '2026-10-02T10:00:00.000Z' },
      submittedAt: '2026-10-02T10:00:00.000Z',
      reviews: [
        {
          id: 'review-1',
          reviewerId: personId,
          notes: 'Strong',
          recommendation: 'strong-yes',
          score: 5,
          createdAt: '2026-10-03T10:00:00.000Z',
        },
      ],
      statusHistory: [
        { from: 'draft', to: 'submitted', at: '2026-10-02T10:00:00.000Z' },
        {
          from: 'submitted',
          to: 'shortlisted',
          note: 'Great fit',
          byId: personId,
          at: '2026-10-03T11:00:00.000Z',
        },
      ],
    };
    // Through the constructor rather than `create`, whose typings pin every
    // literal to its enum; the point here is what the store keeps.
    const created = await new FormSubmissionModel(application).save();
    expect(await readBack(FormSubmissionModel as never, created._id)).toMatchObject(
      plain(application) as object,
    );
  });

  it('lets any number of drafts go without a reference, but never share one', async () => {
    const formId = new Types.ObjectId();
    await FormSubmissionModel.create({ formId, formVersion: 1 });
    await FormSubmissionModel.create({ formId, formVersion: 1 });
    await FormSubmissionModel.create({ formId, formVersion: 1, reference: 'APP-AAAAAA' });
    await expect(
      FormSubmissionModel.create({ formId, formVersion: 1, reference: 'APP-AAAAAA' }),
    ).rejects.toSatisfy(isDuplicateKey);
  });
});

describe('Impact story model', () => {
  it('keeps every block of a story made from a project', async () => {
    const input = impactStoryInputSchema.parse({
      ...storyFromProject({
        id: new Types.ObjectId().toHexString(),
        title: 'Digital skills hubs',
        slug: 'digital-skills-hubs',
        summary: 'Community hubs teaching digital skills to young people.',
        description: 'How the hubs came to be.',
        cover: image,
        metrics: [{ label: 'Learners', value: 120, suffix: '+' }],
        partners: [{ name: 'Tech Partner', url: 'https://partner.example' }],
        media: [{ image, caption: 'Opening day', shareable: true }],
        programme: PROGRAMME_KEYS[0],
        country: 'Ghana',
        tags: ['digital'],
      }),
      seo: { title: 'Hubs', description: 'Digital hubs in the north', image },
    });
    const created = await ImpactStoryModel.create({ ...input, createdBy: personId });
    const stored = (await readBack(ImpactStoryModel as never, created._id)) as Record<
      string,
      unknown
    >;
    expect(stored).toMatchObject(plain(input) as object);
    expect(stored.blocks).toEqual(plain(input.blocks));
    expect(stored.schemaVersion).toBe(1);
    expect(stored.status).toBe('draft');
  });

  it('refuses a second story with the same slug', async () => {
    const base = { title: 'Twin story', slug: 'twin-story', excerpt: 'Long enough excerpt.' };
    await ImpactStoryModel.create(base);
    await expect(ImpactStoryModel.create(base)).rejects.toSatisfy(isDuplicateKey);
  });
});

describe('Audit event model', () => {
  it('keeps a change that cleared a value', async () => {
    const created = await AuditEventModel.create({
      module: 'projects',
      entityType: 'project',
      entityId: personId,
      action: 'updated',
      summary: 'Cleared the country',
      changes: [{ field: 'country', from: 'Ghana', to: null }],
    });
    expect(await readBack(AuditEventModel as never, created._id)).toMatchObject({
      changes: [{ field: 'country', from: 'Ghana', to: null }],
    });
  });
});

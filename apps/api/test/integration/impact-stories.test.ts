import { PREVIEW_TOKEN_HEADER, ROLE_TEMPLATES, type Permission } from '@iaa/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { signPreviewToken } from '../../src/common/preview-token.js';
import { AuditEventModel } from '../../src/modules/audit/audit.model.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import { ImpactStoryModel } from '../../src/modules/impact-stories/impact-story.model.js';
import { ProjectModel } from '../../src/modules/projects/project.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

// Five logins in this file, well under the shared 20-per-15-minutes login limit.
let ctx: TestContext;
let admin: string;
let editor: string;
let outsider: string;
let storiesOnly: string;
let reader: string;

const password = 'TestStories2026!';
const ADMIN_PATH = '/api/admin/impact-stories';
const PUBLIC_PATH = '/api/impact-stories';

const login = async (
  email: string,
  role: 'admin' | 'editor',
  permissions: Permission[],
): Promise<string> => {
  await UserModel.create({
    name: `Stories ${role}`,
    email,
    role,
    permissions,
    passwordHash: await new PasswordService().hash(password),
  });
  const result = await request(ctx.app).post('/api/auth/login').send({ email, password });
  return result.body.tokens.accessToken as string;
};

const bearer = (token: string): [string, string] => ['Authorization', `Bearer ${token}`];

const image = (name: string, alt = 'Students at a coding workshop in Tamale') => ({
  url: `https://res.cloudinary.com/iaa/image/upload/${name}.jpg`,
  publicId: `iaa/${name}`,
  alt,
});

/** A story with everything publishing asks for. */
const completeStory = (slug: string) => ({
  title: 'Girls in code: year one',
  slug,
  excerpt: 'How forty girls in Tamale wrote their first programs.',
  cover: image(`${slug}-cover`),
  blocks: [
    {
      id: 'hero-1',
      type: 'hero',
      data: { heading: 'Girls in code', image: image(`${slug}-hero`) },
    },
    { id: 'text-1', type: 'rich-text', data: { markdown: 'It began with a borrowed laptop.' } },
  ],
  tags: ['education'],
  country: 'Ghana',
  programme: 'digital-skills',
});

const create = async (token: string, body: object): Promise<request.Response> =>
  request(ctx.app)
    .post(ADMIN_PATH)
    .set(...bearer(token))
    .send(body);

const move = async (token: string, id: string, status: string): Promise<request.Response> =>
  request(ctx.app)
    .patch(`${ADMIN_PATH}/${id}/status`)
    .set(...bearer(token))
    .send({ status });

beforeAll(async () => {
  ctx = await createTestContext();
  admin = await login('stories-admin@iaa.org', 'admin', ROLE_TEMPLATES.admin);
  editor = await login('stories-editor@iaa.org', 'editor', ROLE_TEMPLATES.editor);
  outsider = await login('stories-outsider@iaa.org', 'editor', ['events:read']);
  storiesOnly = await login('stories-only@iaa.org', 'editor', [
    'impact-stories:read',
    'impact-stories:create',
  ]);
  reader = await login('stories-reader@iaa.org', 'editor', ['impact-stories:read']);
  // The unique slug index builds in the background; the 409 tests need it.
  await ImpactStoryModel.init();
}, 60000);

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await ctx?.teardown();
});

/**
 * Make the service's next read of a story return `snapshot`, as if it had
 * read the story just before someone else changed it.
 */
const readStale = (snapshot: unknown): void => {
  vi.spyOn(ImpactStoryModel, 'findById').mockReturnValueOnce({
    lean: () => ({ exec: async () => snapshot }),
  } as unknown as ReturnType<typeof ImpactStoryModel.findById>);
};

describe('impact story access', () => {
  it('asks for a sign-in and refuses people without the permission', async () => {
    expect((await request(ctx.app).get(ADMIN_PATH)).status).toBe(401);
    expect((await request(ctx.app).post(ADMIN_PATH).send({})).status).toBe(401);

    const outsiderList = await request(ctx.app)
      .get(ADMIN_PATH)
      .set(...bearer(outsider));
    expect(outsiderList.status).toBe(403);
    expect((await create(outsider, completeStory('outsider-story'))).status).toBe(403);
    expect((await create(reader, completeStory('reader-story'))).status).toBe(403);
  });

  it('refuses a draft that breaks the contract', async () => {
    const response = await create(editor, {
      ...completeStory('broken-video'),
      blocks: [{ id: 'video-1', type: 'video', data: { url: 'https://evil.example/clip' } }],
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');

    const badId = await request(ctx.app)
      .get(`${ADMIN_PATH}/not-an-id`)
      .set(...bearer(editor));
    expect(badId.status).toBe(400);
  });
});

describe('writing and publishing', () => {
  it('lets an editor write and submit for review, but only an administrator publish', async () => {
    const created = await create(editor, completeStory('girls-in-code'));
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('draft');
    expect(created.body.createdBy.email).toBe('stories-editor@iaa.org');
    const id = created.body.id as string;

    const duplicate = await create(admin, completeStory('girls-in-code'));
    expect(duplicate.status).toBe(409);

    const edited = await request(ctx.app)
      .patch(`${ADMIN_PATH}/${id}`)
      .set(...bearer(editor))
      .send({ title: 'Girls in code: the first year', country: null });
    expect(edited.status).toBe(200);
    expect(edited.body.title).toBe('Girls in code: the first year');
    expect(edited.body.country).toBeUndefined();

    expect((await move(editor, id, 'in-review')).body.status).toBe('in-review');
    expect((await move(editor, id, 'published')).status).toBe(403);
    expect((await move(editor, id, 'archived')).status).toBe(403);
    expect((await move(reader, id, 'draft')).status).toBe(403);

    const published = await move(admin, id, 'published');
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('published');
    expect(published.body.publishedAt).toEqual(expect.any(String));

    // Once live, changing it is publishing, which stays with administrators.
    const editorEdit = await request(ctx.app)
      .patch(`${ADMIN_PATH}/${id}`)
      .set(...bearer(editor))
      .send({ excerpt: 'A quieter summary of the first year.' });
    expect(editorEdit.status).toBe(403);
    const unpublishable = await request(ctx.app)
      .patch(`${ADMIN_PATH}/${id}`)
      .set(...bearer(admin))
      .send({ blocks: [] });
    expect(unpublishable.status).toBe(400);

    const activity = await AuditEventModel.find({ entityType: 'impact-story', entityId: id })
      .sort({ at: 1 })
      .lean();
    expect(activity.map((event) => event.action)).toEqual([
      'created',
      'updated',
      'status-changed',
      'published',
    ]);
    expect(activity[3]?.actorEmail).toBe('stories-admin@iaa.org');
  });

  it('refuses to publish an unfinished story and says why', async () => {
    const created = await create(editor, {
      ...completeStory('no-pictures'),
      cover: null,
      blocks: [{ id: 'text-1', type: 'rich-text', data: { markdown: 'Words only.' } }],
    });
    const response = await move(admin, created.body.id, 'published');
    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([
      { path: 'story', message: 'Add a cover image, or an image to the hero block.' },
    ]);
  });

  it('refuses a move the workflow does not allow', async () => {
    const created = await create(admin, completeStory('archive-then-publish'));
    expect((await move(admin, created.body.id, 'archived')).status).toBe(200);
    expect((await move(admin, created.body.id, 'published')).status).toBe(409);
  });

  it('filters the dashboard list by view, search, programme and project', async () => {
    const drafts = await request(ctx.app)
      .get(`${ADMIN_PATH}?view=drafts&q=${encodeURIComponent('year one')}`)
      .set(...bearer(reader));
    expect(drafts.status).toBe(200);
    expect(drafts.body.items.map((item: { slug: string }) => item.slug)).toEqual(['no-pictures']);

    const search = await request(ctx.app)
      .get(`${ADMIN_PATH}?view=all&q=${encodeURIComponent('Girls in code (')}`)
      .set(...bearer(reader));
    expect(search.status).toBe(200);
    expect(search.body.items).toEqual([]);

    const published = await request(ctx.app)
      .get(`${ADMIN_PATH}?view=published&programme=digital-skills`)
      .set(...bearer(reader));
    expect(published.body.items.map((item: { slug: string }) => item.slug)).toEqual([
      'girls-in-code',
    ]);
    expect(published.body.items[0]).toMatchObject({ status: 'published', blockCount: 2 });
  });
});

describe('the public site', () => {
  it('shows published stories only, without internal fields', async () => {
    await create(editor, completeStory('still-a-draft'));
    const inReview = await create(editor, completeStory('waiting-for-review'));
    await move(editor, inReview.body.id, 'in-review');
    const archived = await create(admin, completeStory('old-and-archived'));
    await move(admin, archived.body.id, 'published');
    await move(admin, archived.body.id, 'archived');

    const list = await request(ctx.app).get(PUBLIC_PATH);
    expect(list.status).toBe(200);
    expect(list.headers['cache-control']).toBe('public, max-age=60');
    const slugs = list.body.items.map((item: { slug: string }) => item.slug);
    expect(slugs).toEqual(['girls-in-code']);

    for (const slug of ['still-a-draft', 'waiting-for-review', 'old-and-archived']) {
      const hidden = await request(ctx.app).get(`${PUBLIC_PATH}/${slug}`);
      expect(hidden.status).toBe(404);
      // A miss is never cached, so a story published a moment later shows at once.
      expect(hidden.headers['cache-control']).not.toBe('public, max-age=60');
    }

    const story = await request(ctx.app).get(`${PUBLIC_PATH}/girls-in-code`);
    expect(story.status).toBe(200);
    expect(story.body.blocks).toHaveLength(2);
    for (const hidden of ['projectId', 'createdBy', 'updatedBy', 'status', 'schemaVersion']) {
      expect(story.body).not.toHaveProperty(hidden);
      expect(list.body.items[0]).not.toHaveProperty(hidden);
    }

    const filtered = await request(ctx.app).get(
      `${PUBLIC_PATH}?country=ghana&programme=stem-learning`,
    );
    expect(filtered.body.items).toEqual([]);
  });

  it('opens a draft through a preview link and nothing else', async () => {
    const draft = await create(editor, completeStory('preview-me'));
    const link = await request(ctx.app)
      .post(`${ADMIN_PATH}/${draft.body.id}/preview`)
      .set(...bearer(reader));
    expect(link.status).toBe(200);
    expect(link.body.url).toContain('/impact/stories/preview#');
    const token = (link.body.url as string).split('#')[1] ?? '';

    const preview = await request(ctx.app)
      .get(`${PUBLIC_PATH}/preview`)
      .set(PREVIEW_TOKEN_HEADER, token);
    expect(preview.status).toBe(200);
    expect(preview.body.slug).toBe('preview-me');
    expect(preview.body).not.toHaveProperty('status');
    expect(preview.headers['cache-control']).toBe('private, no-store');

    const formToken = signPreviewToken({ kind: 'form', id: draft.body.id }, ctx.config).token;
    const tampered = `${token.slice(0, -4)}AAAA`;
    // An access token is signed with the same secret, but is not a preview.
    for (const bad of [formToken, tampered, 'not-a-token', reader]) {
      const response = await request(ctx.app)
        .get(`${PUBLIC_PATH}/preview`)
        .set(PREVIEW_TOKEN_HEADER, bad);
      expect(response.status).toBe(404);
    }
    expect((await request(ctx.app).get(`${PUBLIC_PATH}/preview`)).status).toBe(404);

    // Nor is a preview token a way into the dashboard.
    const asBearer = await request(ctx.app)
      .get(ADMIN_PATH)
      .set(...bearer(token));
    expect(asBearer.status).toBe(401);
  });
});

describe('starting from a project', () => {
  it('copies the project into a draft, with shareable photos only', async () => {
    const project = await ProjectModel.create({
      title: 'Coding clubs in Tamale',
      slug: 'coding-clubs',
      summary: 'After-school coding clubs for girls in three Tamale schools.',
      description: 'The clubs met twice a week.',
      programme: 'digital-skills',
      country: 'Ghana',
      cover: image('clubs-cover'),
      metrics: [{ id: 'girls', label: 'Girls taught', value: 40, suffix: '+' }],
      partners: [{ name: 'Tamale Tech Hub', url: 'https://tamaletech.example' }],
      media: [
        { id: 'shared', image: image('shared-photo'), caption: 'Club day', shareable: true },
        { id: 'private', image: image('private-photo'), shareable: false },
      ],
    });
    const path = `${ADMIN_PATH}/from-project/${project.id}`;

    expect(
      (
        await request(ctx.app)
          .post(path)
          .set(...bearer(storiesOnly))
      ).status,
    ).toBe(403);

    const created = await request(ctx.app)
      .post(path)
      .set(...bearer(editor));
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      title: 'Coding clubs in Tamale',
      slug: 'coding-clubs-story',
      status: 'draft',
      projectId: project.id,
      project: { id: project.id, title: 'Coding clubs in Tamale' },
    });
    const gallery = created.body.blocks.find((block: { type: string }) => block.type === 'gallery');
    expect(
      gallery.data.images.map((item: { image: { publicId: string } }) => item.image.publicId),
    ).toEqual(['iaa/shared-photo']);

    const second = await request(ctx.app)
      .post(path)
      .set(...bearer(editor));
    expect(second.body.slug).toBe('coding-clubs-story-2');

    await ProjectModel.updateOne(
      { _id: project._id },
      { title: 'Renamed project', summary: 'Changed later on.' },
    );
    const reread = await request(ctx.app)
      .get(`${ADMIN_PATH}/${created.body.id}`)
      .set(...bearer(editor));
    expect(reread.body.title).toBe('Coding clubs in Tamale');
    expect(reread.body.excerpt).toBe(
      'After-school coding clubs for girls in three Tamale schools.',
    );

    const missing = await request(ctx.app)
      .post(`${ADMIN_PATH}/from-project/${'a'.repeat(24)}`)
      .set(...bearer(editor));
    expect(missing.status).toBe(404);
  });

  it('refuses a link to a project that does not exist', async () => {
    const response = await create(editor, {
      ...completeStory('orphan-story'),
      projectId: 'b'.repeat(24),
    });
    expect(response.status).toBe(400);
  });
});

describe('deleting', () => {
  it('deletes a draft but keeps anything that was ever published', async () => {
    const draft = await create(editor, completeStory('delete-me'));
    expect(
      (
        await request(ctx.app)
          .delete(`${ADMIN_PATH}/${draft.body.id}`)
          .set(...bearer(editor))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(ctx.app)
          .delete(`${ADMIN_PATH}/${draft.body.id}`)
          .set(...bearer(admin))
      ).status,
    ).toBe(204);

    const once = await create(admin, completeStory('was-live'));
    await move(admin, once.body.id, 'published');
    await move(admin, once.body.id, 'draft');
    const refused = await request(ctx.app)
      .delete(`${ADMIN_PATH}/${once.body.id}`)
      .set(...bearer(admin));
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toContain('Archive it instead');
  });
});

describe('the activity log', () => {
  it('names only what an edit changed, even when every block is sent again', async () => {
    const story = completeStory('logged-edits');
    const created = await create(editor, story);
    const id = created.body.id as string;

    const same = await request(ctx.app)
      .patch(`${ADMIN_PATH}/${id}`)
      .set(...bearer(editor))
      .send({ title: 'Girls in code: logged', blocks: created.body.blocks });
    expect(same.status).toBe(200);
    const [unchangedBlocks] = await AuditEventModel.find({ entityId: id, action: 'updated' })
      .sort({ at: -1 })
      .lean();
    expect(unchangedBlocks?.summary).toBe('Edited title');

    const fewer = await request(ctx.app)
      .patch(`${ADMIN_PATH}/${id}`)
      .set(...bearer(editor))
      .send({ blocks: created.body.blocks.slice(0, 1) });
    expect(fewer.status).toBe(200);
    const [changedBlocks] = await AuditEventModel.find({ entityId: id, action: 'updated' })
      .sort({ at: -1, _id: -1 })
      .lean();
    expect(changedBlocks?.summary).toBe('Edited blocks');
    expect(changedBlocks?.changes).toEqual([{ field: 'blocks', from: '2 blocks', to: '1 block' }]);
  });
});

describe('addresses and concurrent changes', () => {
  it('keeps a story off an address the website already uses', async () => {
    const reserved = await create(editor, completeStory('preview'));
    expect(reserved.status).toBe(400);
    expect(reserved.body.error.details[0].path).toBe('slug');

    const created = await create(editor, completeStory('not-yet-reserved'));
    const renamed = await request(ctx.app)
      .patch(`${ADMIN_PATH}/${created.body.id}`)
      .set(...bearer(editor))
      .send({ slug: 'preview' });
    expect(renamed.status).toBe(400);
  });

  it('refuses an editor’s save that would land on a story published in the meantime', async () => {
    const created = await create(editor, completeStory('published-meanwhile'));
    const id = created.body.id as string;
    const draft = await ImpactStoryModel.findById(id).lean().exec();
    expect((await move(admin, id, 'published')).status).toBe(200);

    readStale(draft);
    const save = await request(ctx.app)
      .patch(`${ADMIN_PATH}/${id}`)
      .set(...bearer(editor))
      .send({ excerpt: 'Rewritten after it went live, without anyone publishing it.' });
    expect(save.status).toBe(409);
    const live = await ImpactStoryModel.findById(id).lean().exec();
    expect(live?.excerpt).toBe('How forty girls in Tamale wrote their first programs.');
  });

  it('never deletes a story that was published after it was read', async () => {
    const created = await create(admin, completeStory('deleted-meanwhile'));
    const id = created.body.id as string;
    const draft = await ImpactStoryModel.findById(id).lean().exec();
    expect((await move(admin, id, 'published')).status).toBe(200);

    readStale(draft);
    const refused = await request(ctx.app)
      .delete(`${ADMIN_PATH}/${id}`)
      .set(...bearer(admin));
    expect(refused.status).toBe(409);
    expect(await ImpactStoryModel.exists({ _id: id })).not.toBeNull();
  });
});

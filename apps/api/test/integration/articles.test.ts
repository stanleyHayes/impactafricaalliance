import { UserRole } from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
let accessToken: string;

const seedAdmin = async (): Promise<void> => {
  const passwordHash = await new PasswordService().hash('Sup3rSecret!');
  await UserModel.create({
    name: 'Admin',
    email: 'admin@iaa.org',
    passwordHash,
    role: UserRole.Admin,
  });
};

beforeAll(async () => {
  ctx = await createTestContext();
  await seedAdmin();
  const login = await request(ctx.app)
    .post('/api/auth/login')
    .send({ email: 'admin@iaa.org', password: 'Sup3rSecret!' });
  accessToken = login.body.tokens.accessToken;
}, 60_000);

afterAll(async () => {
  await ctx?.teardown();
});

describe('Articles content module', () => {
  it('rejects unauthenticated writes', async () => {
    const res = await request(ctx.app).post('/api/admin/articles').send({});
    expect(res.status).toBe(401);
  });

  it('creates an article as admin and exposes it publicly once published', async () => {
    const create = await request(ctx.app)
      .post('/api/admin/articles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'IAA launches Digital Skills Hub',
        slug: 'iaa-launches-digital-skills-hub',
        excerpt: 'A new cohort begins this month across West Africa.',
        body: 'The full story of the launch and what it means for the region.',
        status: 'published',
        tags: ['launch', 'digital-skills'],
      });
    expect(create.status).toBe(201);
    expect(create.body.id).toBeDefined();

    const publicList = await request(ctx.app).get('/api/articles');
    expect(publicList.status).toBe(200);
    expect(publicList.body.total).toBe(1);

    const bySlug = await request(ctx.app).get('/api/articles/iaa-launches-digital-skills-hub');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.title).toContain('Digital Skills Hub');
  });

  it('hides draft articles from the public surface', async () => {
    await request(ctx.app)
      .post('/api/admin/articles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Unpublished draft',
        slug: 'unpublished-draft',
        excerpt: 'This should remain hidden from the public site.',
        body: 'Draft body content goes here for the editors only.',
        status: 'draft',
      });

    const draftPublic = await request(ctx.app).get('/api/articles/unpublished-draft');
    expect(draftPublic.status).toBe(404);
  });

  it('validates the request body and returns field-level errors', async () => {
    const res = await request(ctx.app)
      .post('/api/admin/articles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

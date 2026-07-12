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
  const login = await request(ctx.app).post('/api/auth/login').send({
    email: 'admin@iaa.org',
    password: 'Sup3rSecret!',
  });
  accessToken = login.body.tokens.accessToken;
}, 60_000);

afterAll(async () => {
  await ctx?.teardown();
});

describe('Site settings module', () => {
  it('exposes default settings publicly', async () => {
    const res = await request(ctx.app).get('/api/site-settings');
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('site');
    expect(res.body.siteName).toBe('Impact Africa Alliance');
  });

  it('allows admin to update settings', async () => {
    const update = await request(ctx.app)
      .patch('/api/admin/site-settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        siteName: 'Alliance Updated',
        contactEmail: 'new@iaa.org',
        socials: { x: 'https://x.com/iaa' },
      });
    expect(update.status).toBe(200);
    expect(update.body.siteName).toBe('Alliance Updated');
    expect(update.body.contactEmail).toBe('new@iaa.org');
    expect(update.body.socials.x).toBe('https://x.com/iaa');
  });

  it('returns public updates on the public endpoint', async () => {
    const res = await request(ctx.app).get('/api/site-settings');
    expect(res.status).toBe(200);
    expect(res.body.siteName).toBe('Alliance Updated');
  });

  it('rejects unauthenticated admin writes', async () => {
    const res = await request(ctx.app).patch('/api/admin/site-settings').send({ siteName: 'Hack' });
    expect(res.status).toBe(401);
  });

  it('validates the request body', async () => {
    const res = await request(ctx.app)
      .patch('/api/admin/site-settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ contactEmail: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

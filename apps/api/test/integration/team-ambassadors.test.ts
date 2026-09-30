import { UserRole } from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { TeamMemberModel } from '../../src/modules/content/models/team.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
let token: string;

const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  ctx = await createTestContext();
  await UserModel.create({
    name: 'Admin',
    email: 'admin@iaa.org',
    passwordHash: await new PasswordService().hash('Sup3rSecret!'),
    role: UserRole.Admin,
  });
  const login = await request(ctx.app)
    .post('/api/auth/login')
    .send({ email: 'admin@iaa.org', password: 'Sup3rSecret!' });
  token = login.body.tokens.accessToken;
}, 60_000);

afterAll(async () => {
  await ctx?.teardown();
});

describe('ambassadors on the team', () => {
  it('refuses a new ambassador without a country', async () => {
    const res = await request(ctx.app)
      .post('/api/admin/team')
      .set(auth())
      .send({ name: 'Kadiatou Ouattara', role: 'Ambassador', tier: 'ambassador' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'country' })]),
    );
  });

  it('keeps the country and shows it publicly', async () => {
    const created = await request(ctx.app)
      .post('/api/admin/team')
      .set(auth())
      .send({ name: 'Jamie Burt', role: 'Ambassador', tier: 'ambassador', country: 'ZA' });
    expect(created.status).toBe(201);
    const listed = await request(ctx.app).get('/api/team');
    const jamie = listed.body.items.find((item: { name: string }) => item.name === 'Jamie Burt');
    expect(jamie).toMatchObject({ tier: 'ambassador', country: 'ZA' });
  });

  it('refuses moving someone into Ambassadors without a country, and clearing an ambassador’s', async () => {
    const member = await TeamMemberModel.create({
      name: 'Paul Lamptey',
      role: 'Ambassador',
      tier: 'board',
    });
    const moved = await request(ctx.app)
      .patch(`/api/admin/team/${member.id}`)
      .set(auth())
      .send({ tier: 'ambassador' });
    expect(moved.status).toBe(400);

    const withCountry = await request(ctx.app)
      .patch(`/api/admin/team/${member.id}`)
      .set(auth())
      .send({ tier: 'ambassador', country: 'GH' });
    expect(withCountry.status).toBe(200);

    const cleared = await request(ctx.app)
      .patch(`/api/admin/team/${member.id}`)
      .set(auth())
      .send({ country: null });
    expect(cleared.status).toBe(400);
  });

  it('removes a cleared country from someone who is not an ambassador', async () => {
    const member = await TeamMemberModel.create({
      name: 'Jemimah Opata',
      role: 'Country Director, Ghana',
      tier: 'executive',
      country: 'GH',
    });
    const res = await request(ctx.app)
      .patch(`/api/admin/team/${member.id}`)
      .set(auth())
      .send({ country: null });
    expect(res.status).toBe(200);
    const stored = await TeamMemberModel.findById(member.id).lean();
    expect(stored).not.toHaveProperty('country');
  });

  it('lets an edit that does not touch the rule through', async () => {
    const member = await TeamMemberModel.create({
      name: 'Nathan Lartey',
      role: 'Ambassador',
      tier: 'ambassador',
      country: 'GH',
    });
    const res = await request(ctx.app)
      .patch(`/api/admin/team/${member.id}`)
      .set(auth())
      .send({ order: 4 });
    expect(res.status).toBe(200);
    expect(res.body.order).toBe(4);
  });
});

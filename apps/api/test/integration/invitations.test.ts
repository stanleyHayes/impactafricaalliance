import { ROLE_TEMPLATES, UserRole } from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { UserInvitationModel } from '../../src/modules/users/invitation.model.js';
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
    permissions: ROLE_TEMPLATES[UserRole.Admin],
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

describe('Invitation flow', () => {
  it('creates an invitation and sends an email', async () => {
    const res = await request(ctx.app)
      .post('/api/admin/invitations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'new.editor@iaa.org', role: UserRole.Editor });

    expect(res.status).toBe(202);
    expect(res.body.email).toBe('new.editor@iaa.org');
    expect(res.body.role).toBe(UserRole.Editor);
    expect(res.body.token).toBeDefined();

    expect(ctx.emailSend).toHaveBeenCalledOnce();
    const message = ctx.emailSend.mock.calls[0][0];
    expect(message.to).toBe('new.editor@iaa.org');
    expect(message.html).toContain('/accept-invitation?token=');
  });

  it('rejects inviting an email that already has an account', async () => {
    const passwordHash = await new PasswordService().hash('Sup3rSecret!');
    await UserModel.create({
      name: 'Existing',
      email: 'existing@iaa.org',
      passwordHash,
      role: UserRole.Editor,
      permissions: ROLE_TEMPLATES[UserRole.Editor],
    });

    const res = await request(ctx.app)
      .post('/api/admin/invitations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'existing@iaa.org', role: UserRole.Editor });

    expect(res.status).toBe(409);
  });

  it('accepts an invitation and creates a user with the seeded permissions', async () => {
    const invite = await request(ctx.app)
      .post('/api/admin/invitations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'invited@iaa.org', role: UserRole.Editor });

    const token = invite.body.token;
    expect(token).toBeDefined();

    const accept = await request(ctx.app).post('/api/auth/accept-invitation').send({
      token,
      name: 'Invited Editor',
      password: 'NewSecurePass123!',
      confirmPassword: 'NewSecurePass123!',
    });

    expect(accept.status).toBe(201);
    expect(accept.body.user.email).toBe('invited@iaa.org');
    expect(accept.body.user.role).toBe(UserRole.Editor);
    expect(accept.body.user.permissions).toEqual(ROLE_TEMPLATES[UserRole.Editor]);
    expect(accept.body.tokens.accessToken).toBeDefined();

    const used = await UserInvitationModel.findOne({ email: 'invited@iaa.org' }).exec();
    expect(used?.usedAt).toBeDefined();
  });

  it('allows permissions to be updated independently per user', async () => {
    const passwordHash = await new PasswordService().hash('Sup3rSecret!');
    const user = await UserModel.create({
      name: 'Custom',
      email: 'custom@iaa.org',
      passwordHash,
      role: UserRole.Editor,
      permissions: ROLE_TEMPLATES[UserRole.Editor],
    });

    const customPermissions = ['articles:read', 'articles:update'];
    const res = await request(ctx.app)
      .patch(`/api/admin/users/${user.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: UserRole.Editor, permissions: customPermissions });

    expect(res.status).toBe(200);
    expect(res.body.permissions).toEqual(customPermissions);
  });
});

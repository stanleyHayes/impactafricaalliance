import { ROLE_TEMPLATES, UserRole, type Permission, type PersonSummary } from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
let editorToken: string;
let outsiderToken: string;
const password = 'TestPeople2026!';
const ids: Record<string, string> = {};

// Hashing is slow on purpose; one hash serves every account in this file.
let passwordHash: string;

const addUser = async (
  key: string,
  fields: {
    name: string;
    email: string;
    role?: UserRole;
    isActive?: boolean;
    permissions?: Permission[];
  },
): Promise<void> => {
  const user = await UserModel.create({
    role: UserRole.Editor,
    permissions: [],
    ...fields,
    passwordHash,
  });
  ids[key] = user.id as string;
};

// Two logins in this file, well inside the shared login limiter.
const login = async (email: string): Promise<string> => {
  const result = await request(ctx.app).post('/api/auth/login').send({ email, password });
  return result.body.tokens.accessToken as string;
};

const directory = (token: string, query = '') =>
  request(ctx.app).get(`/api/admin/people${query}`).set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  ctx = await createTestContext();
  passwordHash = await new PasswordService().hash(password);
  await addUser('editor', {
    name: 'Esi Editor',
    email: 'esi.editor@iaa.org',
    permissions: ROLE_TEMPLATES.editor,
  });
  // Can read articles but none of the work modules.
  await addUser('outsider', {
    name: 'Olu Outsider',
    email: 'olu@iaa.org',
    permissions: ['articles:read'],
  });
  await addUser('ama', { name: 'Ama Boateng', email: 'ama@iaa.org' });
  await addUser('tunde', {
    name: 'tunde Bello',
    email: 'tunde@partner.example',
    role: UserRole.Admin,
  });
  await addUser('gone', { name: 'Gone Away', email: 'gone@iaa.org', isActive: false });
  await addUser('literal', { name: 'Literal .* Name', email: 'literal@iaa.org' });
  editorToken = await login('esi.editor@iaa.org');
  outsiderToken = await login('olu@iaa.org');
}, 60_000);

afterAll(async () => {
  await ctx?.teardown();
});

describe('people directory', () => {
  it('needs a signed-in user', async () => {
    expect((await request(ctx.app).get('/api/admin/people')).status).toBe(401);
  });

  it('refuses a user who can read none of the work modules', async () => {
    const res = await directory(outsiderToken);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lists active colleagues by name for an editor with the default permissions', async () => {
    const res = await directory(editorToken);
    expect(res.status).toBe(200);
    const names = (res.body.items as PersonSummary[]).map((person) => person.name);
    expect(names).toEqual([
      'Ama Boateng',
      'Esi Editor',
      'Literal .* Name',
      'Olu Outsider',
      'tunde Bello',
    ]);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 5, totalPages: 1 });
  });

  it('never shows deactivated accounts, passwords or permissions', async () => {
    const res = await directory(editorToken, '?pageSize=100');
    const items = res.body.items as Record<string, unknown>[];
    expect(items.map((item) => item.email)).not.toContain('gone@iaa.org');
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(['email', 'id', 'name', 'role']);
    }
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('permissions');
    expect(body).not.toContain('refreshTokens');
  });

  it('looks up the people attached to a record by id, leaving out inactive ones', async () => {
    const res = await directory(editorToken, `?ids=${ids.ama},${ids.gone},${ids.tunde}`);
    expect(res.status).toBe(200);
    expect((res.body.items as PersonSummary[]).map((person) => person.id).sort()).toEqual(
      [ids.ama, ids.tunde].sort(),
    );
    expect(res.body.items).toContainEqual({
      id: ids.tunde,
      name: 'tunde Bello',
      email: 'tunde@partner.example',
      role: 'admin',
    });
  });

  it('matches part of a name or an email, in any case', async () => {
    const byName = await directory(editorToken, '?q=BOAT');
    expect((byName.body.items as PersonSummary[]).map((person) => person.name)).toEqual([
      'Ama Boateng',
    ]);
    const byEmail = await directory(editorToken, '?q=partner.example');
    expect((byEmail.body.items as PersonSummary[]).map((person) => person.name)).toEqual([
      'tunde Bello',
    ]);
  });

  it('treats search text literally, so a pattern matches only itself', async () => {
    const res = await directory(editorToken, `?q=${encodeURIComponent('.*')}`);
    expect(res.status).toBe(200);
    expect((res.body.items as PersonSummary[]).map((person) => person.name)).toEqual([
      'Literal .* Name',
    ]);
    const hostile = await directory(editorToken, `?q=${encodeURIComponent('(a+)+$')}`);
    expect(hostile.status).toBe(200);
    expect(hostile.body.items).toEqual([]);
  });

  it('pages through the directory', async () => {
    const res = await directory(editorToken, '?pageSize=2&page=2');
    expect(res.status).toBe(200);
    expect((res.body.items as PersonSummary[]).map((person) => person.name)).toEqual([
      'Literal .* Name',
      'Olu Outsider',
    ]);
    expect(res.body).toMatchObject({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
  });

  it('rejects malformed ids and oversized pages with a validation error', async () => {
    const badId = await directory(editorToken, '?ids=not-an-id');
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('VALIDATION_ERROR');
    const bigPage = await directory(editorToken, '?pageSize=500');
    expect(bigPage.status).toBe(400);
  });
});

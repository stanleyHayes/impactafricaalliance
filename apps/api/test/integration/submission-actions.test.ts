import { ROLE_TEMPLATES, type Permission } from '@iaa/shared';
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import {
  SubmissionModel,
  SubscriberModel,
} from '../../src/modules/submissions/submission.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
let admin: string;
let reader: string;
let subscriberOnly: string;
const password = 'TestActions2026!';
const login = async (email: string, permissions: Permission[]): Promise<string> => {
  await UserModel.create({
    name: 'Actions tester',
    email,
    role: 'admin',
    permissions,
    passwordHash: await new PasswordService().hash(password),
  });
  const result = await request(ctx.app).post('/api/auth/login').send({ email, password });
  return result.body.tokens.accessToken as string;
};
beforeAll(async () => {
  ctx = await createTestContext();
  admin = await login('actions@iaa.org', ROLE_TEMPLATES.admin);
  reader = await login('reader@iaa.org', ['submissions:read']);
  subscriberOnly = await login('subscriber@iaa.org', ['subscribers:read', 'subscribers:update']);
}, 60000);
afterAll(async () => {
  await ctx?.teardown();
});

const payload = {
  name: 'Joseph Boffah',
  email: 'joseph@example.org',
  country: 'Ghana',
  expertise: 'Training and Coaching',
  availabilityHoursPerMonth: 5,
  message: 'I would like to volunteer with the team.',
};

describe('submission actions and permissions', () => {
  it('views every field, validates edits, preserves consent and deletes', async () => {
    const item = await SubmissionModel.create({
      type: 'volunteer',
      payload,
      consent: true,
      consentVersion: 'original',
      consentedAt: new Date(),
    });
    const url = `/api/admin/submissions/${item.id}`;
    const read = await request(ctx.app).get(url).set('Authorization', `Bearer ${reader}`);
    expect(read.status).toBe(200);
    expect(read.body.payload).toEqual(payload);
    expect(read.body.consentVersion).toBe('original');
    expect(
      (
        await request(ctx.app)
          .patch(url)
          .set('Authorization', `Bearer ${reader}`)
          .send({ status: 'read' })
      ).status,
    ).toBe(403);
    expect(
      (await request(ctx.app).delete(url).set('Authorization', `Bearer ${reader}`)).status,
    ).toBe(403);
    expect(
      (
        await request(ctx.app)
          .patch(url)
          .set('Authorization', `Bearer ${admin}`)
          .send({ status: 'read', payload: { ...payload, email: 'bad' } })
      ).status,
    ).toBe(400);
    const updatedPayload = { ...payload, availabilityHoursPerMonth: undefined };
    const updated = await request(ctx.app)
      .patch(url)
      .set('Authorization', `Bearer ${admin}`)
      .send({
        status: 'read',
        payload: {
          ...updatedPayload,
          message: 'Updated message with full details.',
          consent: false,
        },
      });
    expect(updated.status).toBe(200);
    expect(updated.body.payload.message).toContain('Updated message');
    expect(updated.body.payload.availabilityHoursPerMonth).toBeUndefined();
    expect(updated.body.consent).toBe(true);
    expect(updated.body.consentVersion).toBe('original');
    expect(
      (await request(ctx.app).delete(url).set('Authorization', `Bearer ${admin}`)).status,
    ).toBe(204);
    expect((await request(ctx.app).get(url).set('Authorization', `Bearer ${admin}`)).status).toBe(
      404,
    );
  });
  it.each([
    {
      type: 'contact',
      payload: {
        name: 'Contact person',
        email: 'contact@example.org',
        subject: 'A complete enquiry',
        message: 'The complete contact message.',
      },
    },
    {
      type: 'partner',
      payload: {
        organizationName: 'Partner organisation',
        name: 'Partner person',
        email: 'partner@example.org',
        country: 'Ghana',
        partnershipInterest: 'Programme funding',
        message: 'The complete partnership proposal.',
      },
    },
    {
      type: 'job',
      payload: {
        jobSlug: 'programme-officer',
        jobTitle: 'Programme officer',
        name: 'Job applicant',
        email: 'applicant@example.org',
        phone: '+233201234567',
        country: 'Ghana',
        linkedInUrl: '',
        portfolioUrl: 'https://example.org/portfolio',
        coverLetter: 'The complete cover letter for this application.',
        resumeUrl: 'https://example.org/resume.pdf',
        resumePublicId: 'applications/resume',
      },
    },
  ])('preserves every $type field through view and edit', async ({ type, payload: fields }) => {
    const item = await SubmissionModel.create({ type, payload: fields, consent: true });
    const url = `/api/admin/submissions/${item.id}`;
    const result = await request(ctx.app)
      .patch(url)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'read', payload: fields });
    expect(result.status).toBe(200);
    expect(result.body.payload).toEqual(fields);
    const detail = await request(ctx.app).get(url).set('Authorization', `Bearer ${admin}`);
    expect(detail.body.payload).toEqual(fields);
  });

  it('uses subscribers permissions independently and preserves opt-in evidence', async () => {
    const item = await SubscriberModel.create({
      email: 'newsletter@example.org',
      name: 'Original',
      consent: true,
      whatsappOptIn: true,
      whatsappPhone: '+233201234567',
    });
    expect(
      (
        await request(ctx.app)
          .get('/api/admin/submissions/subscribers/list')
          .set('Authorization', `Bearer ${subscriberOnly}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(ctx.app)
          .get('/api/admin/submissions')
          .set('Authorization', `Bearer ${subscriberOnly}`)
      ).status,
    ).toBe(403);
    const response = await request(ctx.app)
      .patch(`/api/admin/submissions/subscribers/${item.id}`)
      .set('Authorization', `Bearer ${subscriberOnly}`)
      .send({ name: 'Corrected name', source: 'Website', whatsappOptIn: false });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Corrected name');
    expect(response.body.whatsappOptIn).toBe(true);
    expect(
      (
        await request(ctx.app)
          .delete(`/api/admin/submissions/subscribers/${item.id}`)
          .set('Authorization', `Bearer ${subscriberOnly}`)
      ).status,
    ).toBe(403);
  });
  it('enforces explicit permissions across the specialized pages, even for an admin role', async () => {
    for (const path of [
      'articles',
      'users',
      'reviews',
      'privacy-requests',
      'donations',
      'site-settings',
      'event-registrations/counts',
    ]) {
      expect(
        (await request(ctx.app).get(`/api/admin/${path}`).set('Authorization', `Bearer ${reader}`))
          .status,
        path,
      ).toBe(403);
    }
  });
  it('rejects missing authentication and malformed record IDs', async () => {
    expect((await request(ctx.app).get('/api/admin/submissions')).status).toBe(401);
    expect(
      (
        await request(ctx.app)
          .get('/api/admin/submissions/not-an-id')
          .set('Authorization', `Bearer ${admin}`)
      ).status,
    ).toBe(400);
  });
});

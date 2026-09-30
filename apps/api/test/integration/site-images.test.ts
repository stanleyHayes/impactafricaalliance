import { UserRole } from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { SiteImageModel } from '../../src/modules/content/models/site-image.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
let accessToken: string;

const image = {
  url: 'https://res.cloudinary.com/demo/image/upload/v1/site/banner.jpg',
  publicId: 'site/banner',
  width: 2400,
  height: 1030,
};

const auth = (): [string, string] => ['Authorization', `Bearer ${accessToken}`];

beforeAll(async () => {
  ctx = await createTestContext();
  await UserModel.create({
    name: 'Admin',
    email: 'images@iaa.org',
    passwordHash: await new PasswordService().hash('Sup3rSecret!'),
    role: UserRole.Admin,
  });
  const login = await request(ctx.app)
    .post('/api/auth/login')
    .send({ email: 'images@iaa.org', password: 'Sup3rSecret!' });
  accessToken = login.body.tokens.accessToken;
}, 60_000);

afterAll(async () => {
  await ctx?.teardown();
});

describe('site images', () => {
  it('refuses a slot that no page reads, naming the field', async () => {
    const res = await request(ctx.app)
      .post('/api/admin/site-images')
      .set(...auth())
      .send({ key: 'about-banner-typo', image });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { path: 'key', message: 'Choose one of the places the site shows an image.' },
    ]);
  });

  it('fills a new slot, publishes it, and lets its description be cleared', async () => {
    const created = await request(ctx.app)
      .post('/api/admin/site-images')
      .set(...auth())
      .send({ key: 'about-hero', image, alt: 'Volunteers at a workshop' });
    expect(created.status).toBe(201);

    const published = await request(ctx.app).get('/api/site-images?pageSize=100');
    expect(published.body.items.map((item: { key: string }) => item.key)).toContain('about-hero');

    const cleared = await request(ctx.app)
      .patch(`/api/admin/site-images/${created.body.id}`)
      .set(...auth())
      .send({ alt: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.alt ?? null).toBeNull();
    // A PATCH that only touches the description leaves the slot switched on.
    expect(cleared.body.isActive).toBe(true);
  });

  it('refuses to move a record onto a slot that does not exist', async () => {
    const created = await request(ctx.app)
      .post('/api/admin/site-images')
      .set(...auth())
      .send({ key: 'reviews-hero', image });
    const moved = await request(ctx.app)
      .patch(`/api/admin/site-images/${created.body.id}`)
      .set(...auth())
      .send({ key: 'nowhere' });
    expect(moved.status).toBe(400);
  });

  it('hides a switched-off record from the site, so the shipped image returns', async () => {
    const first = await request(ctx.app)
      .post('/api/admin/site-images')
      .set(...auth())
      .send({ key: 'contact-hero', image });
    expect(first.status).toBe(201);

    await request(ctx.app)
      .patch(`/api/admin/site-images/${first.body.id}`)
      .set(...auth())
      .send({ isActive: false });
    const published = await request(ctx.app).get('/api/site-images?pageSize=100');
    expect(published.body.items.map((item: { key: string }) => item.key)).not.toContain(
      'contact-hero',
    );
  });

  it('refuses a picture that is not https', async () => {
    for (const url of [
      'http://res.cloudinary.com/demo/image/upload/v1/a.jpg',
      'javascript:alert(1)',
    ]) {
      const res = await request(ctx.app)
        .post('/api/admin/site-images')
        .set(...auth())
        .send({ key: 'home-vision-band', image: { ...image, url } });
      expect(res.status, url).toBe(400);
    }
  });

  it('answers a second record for the same slot with a conflict, not a server error', async () => {
    // The unique key is built in the background when the model is first used.
    await SiteImageModel.init();
    const first = await request(ctx.app)
      .post('/api/admin/site-images')
      .set(...auth())
      .send({ key: 'resources-banner', image });
    expect(first.status).toBe(201);
    const second = await request(ctx.app)
      .post('/api/admin/site-images')
      .set(...auth())
      .send({ key: 'resources-banner', image });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });
});

describe('a popup’s picture', () => {
  it('is removed when the editor empties it', async () => {
    const created = await request(ctx.app)
      .post('/api/admin/popups')
      .set(...auth())
      .send({
        name: 'Launch',
        title: 'We are live',
        message: 'Come and see.',
        imageUrl: image.url,
      });
    expect(created.status).toBe(201);
    expect(created.body.imageUrl).toBe(image.url);

    const cleared = await request(ctx.app)
      .patch(`/api/admin/popups/${created.body.id}`)
      .set(...auth())
      .send({ imageUrl: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.imageUrl ?? null).toBeNull();
  });
});

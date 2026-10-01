import { UserRole } from '@iaa/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PasswordService } from '../../src/modules/auth/password.service.js';
import { ArticleModel } from '../../src/modules/content/models/article.model.js';
import { EventModel } from '../../src/modules/content/models/event.model.js';
import { JobModel } from '../../src/modules/content/models/job.model.js';
import { MediaItemModel } from '../../src/modules/content/models/media-item.model.js';
import { OfficeModel } from '../../src/modules/content/models/office.model.js';
import { PartnerModel } from '../../src/modules/content/models/partner.model.js';
import { StoryModel } from '../../src/modules/content/models/story.model.js';
import { TeamMemberModel } from '../../src/modules/content/models/team.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { createTestContext, type TestContext } from '../harness.js';

let ctx: TestContext;
let token: string;

const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });
const patch = (path: string, body: object) =>
  request(ctx.app).patch(`/api/admin/${path}`).set(auth()).send(body);

const photo = {
  url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  publicId: 'sample',
};

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

describe('removing a field on the team', () => {
  const member = () =>
    TeamMemberModel.create({
      name: 'Probe Person',
      role: 'Programme Lead',
      tier: 'board',
      country: 'GH',
      bio: 'Probe biography.',
      photo,
      linkedInUrl: 'https://www.linkedin.com/in/probe-person',
      xUrl: 'https://x.com/probe',
      order: 3,
      isActive: true,
    });

  it('removes a null country, LinkedIn link and photo, and leaves the rest alone', async () => {
    const { id } = await member();
    // The body the edit page sends: what the form holds, with the emptied fields as null.
    const res = await patch(`team/${id}`, {
      name: 'Probe Person',
      role: 'Programme Lead',
      tier: 'board',
      bio: 'Probe biography.',
      order: 3,
      isActive: true,
      country: null,
      photo: null,
      linkedInUrl: null,
    });
    expect(res.status).toBe(200);
    for (const key of ['country', 'photo', 'linkedInUrl']) {
      expect(res.body).not.toHaveProperty(key);
    }

    const stored = await TeamMemberModel.findById(id).lean();
    expect(stored).not.toHaveProperty('country');
    expect(stored).not.toHaveProperty('photo');
    expect(stored).not.toHaveProperty('linkedInUrl');
    expect(stored).toMatchObject({
      name: 'Probe Person',
      role: 'Programme Lead',
      tier: 'board',
      bio: 'Probe biography.',
      xUrl: 'https://x.com/probe',
      order: 3,
      isActive: true,
    });

    const listed = await request(ctx.app).get('/api/team');
    const shown = listed.body.items.find((item: { id: string }) => item.id === id);
    expect(shown).toBeDefined();
    expect(shown).not.toHaveProperty('country');
  });

  it('leaves fields the edit did not mention untouched', async () => {
    const { id } = await member();
    const res = await patch(`team/${id}`, { xUrl: null });
    expect(res.status).toBe(200);
    const stored = await TeamMemberModel.findById(id).lean();
    expect(stored).not.toHaveProperty('xUrl');
    expect(stored).toMatchObject({
      country: 'GH',
      linkedInUrl: 'https://www.linkedin.com/in/probe-person',
      photo,
    });
  });

  it.each([{ name: null }, { role: null }, { tier: null }, { isActive: null }, { order: null }])(
    'refuses null for a required field or one with a default: %o',
    async (body) => {
      const { id } = await member();
      const res = await patch(`team/${id}`, { ...body, country: null });
      expect(res.status).toBe(400);
      const stored = await TeamMemberModel.findById(id).lean();
      expect(stored).toMatchObject({ tier: 'board', country: 'GH', order: 3, isActive: true });
    },
  );

  it('still refuses to take an ambassador’s country away', async () => {
    const ambassador = await TeamMemberModel.create({
      name: 'Nathan Lartey',
      role: 'Ambassador',
      tier: 'ambassador',
      country: 'GH',
      photo,
    });
    const res = await patch(`team/${ambassador.id}`, {
      name: 'Nathan Lartey',
      role: 'Ambassador',
      tier: 'ambassador',
      country: null,
      photo: null,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'country' })]),
    );
    const stored = await TeamMemberModel.findById(ambassador.id).lean();
    expect(stored).toMatchObject({ country: 'GH', photo });
  });
});

describe('removing a field on other content', () => {
  it('removes a testimonial’s photo, and refuses to remove the slug its page lives at', async () => {
    const story = await StoryModel.create({
      name: 'Ama Mensah',
      slug: 'ama-mensah',
      country: 'Ghana',
      program: 'Digital Skills',
      quote: 'The programme changed how I work.',
      narrative: 'Ama joined the first cohort and now teaches others in her town.',
      photo,
    });
    const removed = await patch(`stories/${story.id}`, { photo: null, featured: true });
    expect(removed.status).toBe(200);
    const stored = await StoryModel.findById(story.id).lean();
    expect(stored).not.toHaveProperty('photo');
    expect(stored).toMatchObject({ slug: 'ama-mensah', featured: true, country: 'Ghana' });

    const slug = await patch(`stories/${story.id}`, { slug: null });
    expect(slug.status).toBe(400);
    expect(await StoryModel.findById(story.id).lean()).toMatchObject({ slug: 'ama-mensah' });
  });

  it('removes an office’s map link and phone number', async () => {
    const office = await OfficeModel.create({
      label: 'Accra',
      addressLine1: '12 Independence Avenue',
      city: 'Accra',
      country: 'Ghana',
      phone: '+233 30 000 0000',
      mapUrl: 'https://maps.example.com/accra',
    });
    const res = await patch(`offices/${office.id}`, { mapUrl: null, phone: null });
    expect(res.status).toBe(200);
    const stored = await OfficeModel.findById(office.id).lean();
    expect(stored).not.toHaveProperty('mapUrl');
    expect(stored).not.toHaveProperty('phone');
    expect(stored).toMatchObject({ label: 'Accra', city: 'Accra', country: 'Ghana' });
  });

  it('removes a job’s apply link and a partner’s website', async () => {
    const job = await JobModel.create({
      title: 'Programme Manager',
      slug: 'programme-manager',
      location: 'Accra, Ghana',
      type: 'full-time',
      description: 'Lead the delivery of our flagship programme.',
      applyUrl: 'https://example.org/apply',
      status: 'published',
    });
    const jobRes = await patch(`jobs/${job.id}`, { applyUrl: null, status: 'published' });
    expect(jobRes.status).toBe(200);
    const storedJob = await JobModel.findById(job.id).lean();
    expect(storedJob).not.toHaveProperty('applyUrl');
    expect(storedJob).toMatchObject({ slug: 'programme-manager', status: 'published' });

    const partner = await PartnerModel.create({
      name: 'Acme Foundation',
      logo: photo,
      websiteUrl: 'https://acme.org',
      order: 2,
    });
    const partnerRes = await patch(`partners/${partner.id}`, { websiteUrl: null });
    expect(partnerRes.status).toBe(200);
    const storedPartner = await PartnerModel.findById(partner.id).lean();
    expect(storedPartner).not.toHaveProperty('websiteUrl');
    expect(storedPartner).toMatchObject({ name: 'Acme Foundation', order: 2, logo: photo });
  });

  it('removes a library picture’s description, and keeps its folder and tags', async () => {
    const item = await MediaItemModel.create({
      url: photo.url,
      publicId: 'library/sample',
      filename: 'sample.jpg',
      folder: 'team',
      altText: 'A smiling programme lead',
      tags: ['portrait'],
    });
    const res = await patch(`media-library/${item.id}`, {
      altText: null,
      folder: 'team',
      tags: ['portrait'],
    });
    expect(res.status).toBe(200);
    const stored = await MediaItemModel.findById(item.id).lean();
    expect(stored).not.toHaveProperty('altText');
    expect(stored).toMatchObject({ folder: 'team', tags: ['portrait'], filename: 'sample.jpg' });
  });

  it('removes an article’s cover image through the publishing service', async () => {
    const article = await ArticleModel.create({
      title: 'Cohort two graduates',
      slug: 'cohort-two-graduates',
      excerpt: 'Forty fellows finished the programme.',
      body: 'Forty fellows finished the programme this month, with thirty in new roles.',
      coverImage: photo,
    });
    const res = await patch(`articles/${article.id}`, { coverImage: null });
    expect(res.status).toBe(200);
    const stored = await ArticleModel.findById(article.id).lean();
    expect(stored).not.toHaveProperty('coverImage');
    expect(stored).toMatchObject({ slug: 'cohort-two-graduates', status: 'draft' });
  });

  it('keeps the event editor’s removals working', async () => {
    const event = await EventModel.create({
      title: 'Partner forum',
      description: 'An afternoon with our partners.',
      startAt: new Date('2030-01-01T10:00:00Z'),
      location: 'Accra',
      type: 'partner-forum',
      host: 'Jemimah Opata',
      image: photo,
    });
    const res = await patch(`events/${event.id}`, { image: null, host: null });
    expect(res.status).toBe(200);
    const stored = await EventModel.findById(event.id).lean();
    expect(stored).not.toHaveProperty('image');
    expect(stored).not.toHaveProperty('host');
    expect(stored).toMatchObject({ title: 'Partner forum', location: 'Accra' });

    const title = await patch(`events/${event.id}`, { title: null });
    expect(title.status).toBe(400);
  });
});

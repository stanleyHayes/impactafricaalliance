import 'reflect-metadata';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SiteSettingModel } from './site-setting.model.js';
import { SiteSettingService } from './site-setting.service.js';

let mongo: MongoMemoryServer;
let service: SiteSettingService;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT ??= '60000';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  service = new SiteSettingService();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await SiteSettingModel.deleteMany().exec();
});

describe('SiteSettingService', () => {
  it('creates default settings when none exist', async () => {
    const settings = await service.getOrCreate();
    expect(settings.key).toBe('site');
    expect(settings.siteName).toBe('Impact Africa Alliance');
    expect(settings.contactEmail).toContain('@');
  });

  it('returns the existing document on subsequent calls', async () => {
    const first = await service.getOrCreate();
    await service.update({ siteName: 'Updated Name' });
    const second = await service.getOrCreate();
    expect(second.id).toBe(first.id);
    expect(second.siteName).toBe('Updated Name');
  });

  it('updates top-level fields', async () => {
    const updated = await service.update({
      siteName: 'IAA Ghana',
      contactEmail: 'contact@iaa.org',
      city: 'Kumasi',
    });
    expect(updated.siteName).toBe('IAA Ghana');
    expect(updated.contactEmail).toBe('contact@iaa.org');
    expect(updated.city).toBe('Kumasi');
  });

  it('merges nested social links without overwriting untouched platforms', async () => {
    await service.update({
      socials: { facebook: 'https://facebook.com/iaa', instagram: 'https://instagram.com/iaa' },
    });
    const updated = await service.update({
      socials: { linkedin: 'https://linkedin.com/company/iaa' },
    });
    expect(updated.socials?.facebook).toBe('https://facebook.com/iaa');
    expect(updated.socials?.instagram).toBe('https://instagram.com/iaa');
    expect(updated.socials?.linkedin).toBe('https://linkedin.com/company/iaa');
  });
});

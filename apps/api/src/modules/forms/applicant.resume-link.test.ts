import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import type { AuditService } from '../audit/audit.service.js';

import { ApplicantService } from './applicant.service.js';
import { draftExpiry, hashDraftToken, MAX_DRAFT_TOKENS, newDraftToken } from './draft-token.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormModel } from './form.model.js';

/**
 * "Email me a link" against a real database, because the rule that keeps the
 * open tab's token lives in an update pipeline a mock cannot run. Only the
 * open tab ever presents the first token, so it must survive every request.
 */

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT ??= '60000';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([FormModel.deleteMany({}).exec(), FormSubmissionModel.deleteMany({}).exec()]);
});

const build = () => {
  const send = vi.fn().mockResolvedValue(undefined);
  const config = { siteUrl: 'https://iaa.example' } as unknown as AppConfig;
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as AppLogger;
  const service = new ApplicantService(
    config,
    { send } as unknown as EmailProvider,
    {} as MediaProvider,
    { record: vi.fn() } as unknown as AuditService,
    logger,
  );
  return { service, send };
};

/** The token each emailed link carries, in the order they were sent. */
const emailedTokens = (send: ReturnType<typeof vi.fn>): string[] =>
  send.mock.calls.map(([message]) => {
    const match = /#resume=([A-Za-z0-9_-]{43})/.exec((message as { html: string }).html);
    return match?.[1] ?? '';
  });

const seedDraft = async (tabToken: string) => {
  const form = await FormModel.create({
    title: 'Mentors',
    slug: 'mentors',
    type: 'mentor',
    status: 'published',
    settings: { allowDrafts: true },
    steps: [
      {
        id: 'about',
        title: 'About',
        fields: [{ id: 'name', type: 'short-text', label: 'Name', required: true }],
      },
    ],
  });
  return FormSubmissionModel.create({
    formId: form._id,
    formVersion: 1,
    status: 'draft',
    answers: [],
    tokenHashes: [hashDraftToken(tabToken)],
    draftExpiresAt: draftExpiry(new Date()),
  });
};

describe('requestResumeLink against a real database', () => {
  it('keeps the open tab working however many links it asks for', async () => {
    const { service, send } = build();
    const tabToken = newDraftToken();
    const draft = await seedDraft(tabToken);

    for (let request = 0; request < 6; request += 1) {
      await service.requestResumeLink('mentors', tabToken, { email: 'ama@example.org' });
    }

    const stored = await FormSubmissionModel.findOne({ tokenHashes: hashDraftToken(tabToken) })
      .lean()
      .exec();
    expect(stored?._id.toString()).toBe(draft._id.toString());
    expect(stored?.tokenHashes).toHaveLength(MAX_DRAFT_TOKENS);
    expect(stored?.applicant?.email).toBe('ama@example.org');

    // The newest links still work; only the oldest emailed ones dropped off.
    const links = emailedTokens(send);
    expect(links).toHaveLength(6);
    const kept = new Set(stored?.tokenHashes);
    expect(links.slice(-4).every((link) => kept.has(hashDraftToken(link)))).toBe(true);
    expect(links.slice(0, 2).some((link) => kept.has(hashDraftToken(link)))).toBe(false);
  });

  it('keeps a link token working when that link asks for another', async () => {
    const { service, send } = build();
    const tabToken = newDraftToken();
    await seedDraft(tabToken);

    await service.requestResumeLink('mentors', tabToken, { email: 'ama@example.org' });
    const [linkToken = ''] = emailedTokens(send);
    await service.requestResumeLink('mentors', linkToken, { email: 'ama@example.org' });

    const stored = await FormSubmissionModel.findOne({}).lean().exec();
    expect(stored?.tokenHashes).toEqual([
      hashDraftToken(tabToken),
      hashDraftToken(linkToken),
      hashDraftToken(emailedTokens(send)[1] ?? ''),
    ]);
  });
});

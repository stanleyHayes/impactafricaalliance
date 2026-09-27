import type { FormAnswer, FormStep } from '@iaa/shared';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import type { MediaProvider, StoredAssetRef } from '../../providers/media.provider.js';
import type { AuditService } from '../audit/audit.service.js';

import { ApplicantService } from './applicant.service.js';
import {
  discardUnusedDraftFiles,
  mayHoldFiles,
  referencedFileIds,
  sweepExpiredDrafts,
} from './draft-files.js';
import { hashDraftToken, newDraftToken } from './draft-token.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormModel } from './form.model.js';

/**
 * Files nothing points at any more: removed on submission, with an expired
 * draft, and never left for erasure to miss. Against a real database, because
 * the sweep's filters and the submission's `$unset` are what is being tested.
 */

const ROOT = 'iaa';
const CLOUD = 'iaa-test-cloud';

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

const logger = (): AppLogger =>
  ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }) as unknown as AppLogger;

/** A stand-in for Cloudinary: it holds whatever the test says the folder holds. */
const fakeMedia = (held: StoredAssetRef[] = []) => {
  let signed = 0;
  return {
    createSignedApplicationUpload: vi.fn(
      (target: { formId: string; draftId: string; fieldId: string }) => {
        signed += 1;
        const folder = `${ROOT}/applications/${target.formId}/${target.draftId}`;
        return {
          uploadUrl: 'https://api.cloudinary.com/v1_1/x/auto/upload',
          fields: {},
          publicId: `${folder}/${target.fieldId}-${signed.toString(16).padStart(16, '0')}`,
          folder,
          maxBytes: 1024,
          allowedFormats: ['pdf'],
        };
      },
    ),
    inspectAsset: vi.fn().mockResolvedValue(null),
    listAssetsByPrefix: vi.fn().mockResolvedValue(held),
    destroyAsset: vi.fn().mockResolvedValue(undefined),
    destroyByPrefix: vi.fn().mockResolvedValue(undefined),
  };
};

const fileAnswer = (publicId: string): FormAnswer => ({
  fieldId: 'cv',
  value: [
    {
      publicId,
      url: `https://res.cloudinary.com/${CLOUD}/image/authenticated/v1/${publicId}.pdf`,
      name: 'cv.pdf',
      format: 'pdf',
      bytes: 512,
      resourceType: 'image',
    },
  ],
});

describe('which files a draft points at', () => {
  it('reads file ids from file answers only', () => {
    expect(
      referencedFileIds([
        { value: 'Ama' },
        { value: ['a', 'b'] },
        fileAnswer('iaa/applications/f/d/cv-1'),
        { value: null },
      ]),
    ).toEqual(new Set(['iaa/applications/f/d/cv-1']));
  });

  it('only thinks a folder may hold files once an upload was signed or a file named', () => {
    const base = { _id: new Types.ObjectId(), formId: new Types.ObjectId() };
    expect(mayHoldFiles({ ...base, answers: [{ value: 'Ama' }] })).toBe(false);
    expect(mayHoldFiles({ ...base, signedUploads: ['x'] })).toBe(true);
    expect(mayHoldFiles({ ...base, answers: [fileAnswer('iaa/applications/f/d/cv-1')] })).toBe(
      true,
    );
  });

  it('logs and carries on when Cloudinary cannot list the folder', async () => {
    const media = fakeMedia();
    media.listAssetsByPrefix.mockRejectedValue(new Error('Cloudinary down'));
    const log = logger();
    const removed = await discardUnusedDraftFiles(
      { media: media as unknown as MediaProvider, logger: log, rootFolder: ROOT },
      { _id: new Types.ObjectId(), formId: new Types.ObjectId(), signedUploads: ['x'] },
      [],
    );
    expect(removed).toBe(0);
    expect(log.error).toHaveBeenCalledTimes(1);
  });
});

describe('submitting deletes the files the answers no longer use', () => {
  const steps: FormStep[] = [
    {
      id: 'about',
      title: 'About',
      fields: [
        { id: 'name', type: 'short-text', label: 'Name', required: true, options: [] },
        {
          id: 'cv',
          type: 'file',
          label: 'CV',
          required: false,
          options: [],
          validation: { fileKinds: ['pdf'] },
        },
      ],
    },
  ];

  const build = (media: ReturnType<typeof fakeMedia>) => {
    const config = {
      siteUrl: 'https://iaa.example',
      adminUrl: 'https://admin.iaa.example',
      email: { notifyTo: 'info@iaa.example' },
      cloudinary: { folder: ROOT, cloudName: CLOUD },
    } as unknown as AppConfig;
    return new ApplicantService(
      config,
      { send: vi.fn().mockResolvedValue(undefined) } as unknown as EmailProvider,
      media as unknown as MediaProvider,
      { record: vi.fn() } as unknown as AuditService,
      logger(),
    );
  };

  const begin = async (service: ApplicantService) => {
    await FormModel.create({
      title: 'Mentors',
      slug: 'mentors',
      type: 'mentor',
      status: 'published',
      settings: { allowDrafts: true },
      steps,
    });
    return service.createDraft('mentors', {});
  };

  const sign = async (service: ApplicantService, token: string): Promise<string> =>
    (await service.signUpload('mentors', token, { fieldId: 'cv', filename: 'cv.pdf', bytes: 512 }))
      .publicId;

  it('keeps the file submitted and deletes the one it replaced', async () => {
    const media = fakeMedia();
    const service = build(media);
    const { token } = await begin(service);
    const replaced = await sign(service, token);
    const kept = await sign(service, token);
    const draft = await FormSubmissionModel.findOne({}).lean().exec();
    expect(draft?.signedUploads).toEqual([replaced, kept]);
    media.listAssetsByPrefix.mockResolvedValue([
      { publicId: replaced, resourceType: 'image', type: 'authenticated' },
      { publicId: kept, resourceType: 'image', type: 'authenticated' },
    ]);

    await service.submit('mentors', token, {
      answers: [{ fieldId: 'name', value: 'Ama Mensah' }, fileAnswer(kept)],
    });

    expect(media.listAssetsByPrefix).toHaveBeenCalledWith(
      `${ROOT}/applications/${draft?.formId.toString()}/${draft?._id.toString()}/`,
    );
    expect(media.destroyAsset).toHaveBeenCalledTimes(1);
    expect(media.destroyAsset).toHaveBeenCalledWith(
      expect.objectContaining({ publicId: replaced, type: 'authenticated' }),
    );
    const stored = await FormSubmissionModel.findOne({}).lean().exec();
    expect(stored?.status).toBe('submitted');
    expect(stored?.signedUploads).toBeUndefined();
  });

  it('asks Cloudinary nothing when every signed upload was submitted', async () => {
    const media = fakeMedia();
    const service = build(media);
    const { token } = await begin(service);
    const only = await sign(service, token);

    await service.submit('mentors', token, {
      answers: [{ fieldId: 'name', value: 'Ama Mensah' }, fileAnswer(only)],
    });

    expect(media.listAssetsByPrefix).not.toHaveBeenCalled();
    expect(media.destroyAsset).not.toHaveBeenCalled();
  });

  it('still takes the application when the tidy-up fails', async () => {
    const media = fakeMedia();
    media.listAssetsByPrefix.mockRejectedValue(new Error('Cloudinary down'));
    const service = build(media);
    const { token } = await begin(service);
    await sign(service, token);

    const receipt = await service.submit('mentors', token, {
      answers: [{ fieldId: 'name', value: 'Ama Mensah' }],
    });

    expect(receipt.reference).toMatch(/^APP-/);
    expect(media.destroyAsset).not.toHaveBeenCalled();
  });
});

describe('the expired-draft sweep', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');
  const formId = new Types.ObjectId();

  const seed = (extra: Record<string, unknown>) =>
    FormSubmissionModel.create({
      formId,
      formVersion: 1,
      status: 'draft',
      answers: [],
      tokenHashes: [hashDraftToken(newDraftToken())],
      ...extra,
    });

  it('deletes expired drafts, each folder of files before its record', async () => {
    const withFiles = await seed({
      draftExpiresAt: new Date(now.getTime() - 60_000),
      signedUploads: ['iaa/applications/x/y/cv-1'],
    });
    const withNone = await seed({ draftExpiresAt: new Date(now.getTime() - 60_000) });
    const live = await seed({ draftExpiresAt: new Date(now.getTime() + 86_400_000) });
    const media = fakeMedia();

    const run = await sweepExpiredDrafts(
      { media: media as unknown as MediaProvider, logger: logger(), rootFolder: ROOT },
      now,
    );

    expect(run).toEqual({ removed: 2, kept: 0 });
    // Only the draft that ever had files costs a Cloudinary call.
    expect(media.destroyByPrefix).toHaveBeenCalledTimes(1);
    expect(media.destroyByPrefix).toHaveBeenCalledWith(
      `${ROOT}/applications/${formId.toString()}/${withFiles._id.toString()}/`,
    );
    const left = await FormSubmissionModel.find({}).lean().exec();
    expect(left.map((item) => item._id.toString())).toEqual([live._id.toString()]);
    expect(await FormSubmissionModel.exists({ _id: withNone._id })).toBeNull();
  });

  it('keeps a draft whose files would not go, to try again next run', async () => {
    const stuck = await seed({
      draftExpiresAt: new Date(now.getTime() - 60_000),
      answers: [fileAnswer('iaa/applications/x/y/cv-1')],
    });
    const media = fakeMedia();
    media.destroyByPrefix.mockRejectedValue(new Error('Cloudinary down'));
    const log = logger();

    const run = await sweepExpiredDrafts(
      { media: media as unknown as MediaProvider, logger: log, rootFolder: ROOT },
      now,
    );

    expect(run).toEqual({ removed: 0, kept: 1 });
    expect(await FormSubmissionModel.exists({ _id: stuck._id })).not.toBeNull();
    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  it('never touches a submitted application, whatever its old expiry says', async () => {
    const submitted = await seed({
      status: 'submitted',
      reference: 'APP-ABC123',
      draftExpiresAt: new Date(now.getTime() - 60_000),
    });
    const media = fakeMedia();

    const run = await sweepExpiredDrafts(
      { media: media as unknown as MediaProvider, logger: logger(), rootFolder: ROOT },
      now,
    );

    expect(run).toEqual({ removed: 0, kept: 0 });
    expect(await FormSubmissionModel.exists({ _id: submitted._id })).not.toBeNull();
  });
});

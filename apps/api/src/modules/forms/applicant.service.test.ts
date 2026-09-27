import { type FormStep } from '@iaa/shared';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError, ServiceUnavailableError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { CloudinaryMediaProvider, type MediaProvider } from '../../providers/media.provider.js';
import type { AuditService } from '../audit/audit.service.js';

import { ApplicantService, knownAnswers, mergeAnswers } from './applicant.service.js';
import { hashDraftToken, newDraftToken } from './draft-token.js';
import type { StoredForm, StoredSubmission } from './form-mappers.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormModel } from './form.model.js';

const now = new Date();

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

const form: StoredForm = {
  _id: new Types.ObjectId(),
  title: 'Mentors',
  slug: 'mentors',
  type: 'mentor',
  status: 'published',
  settings: { allowDrafts: true },
  steps,
  version: 1,
  createdAt: now,
  updatedAt: now,
};

const draft: StoredSubmission = {
  _id: new Types.ObjectId(),
  formId: form._id,
  formVersion: 1,
  status: 'draft',
  answers: [],
  tokenHashes: [],
  draftExpiresAt: new Date(now.getTime() + 86_400_000),
  reviews: [],
  statusHistory: [],
  createdAt: now,
  updatedAt: now,
};

const query = (value: unknown) => {
  const chain: Record<string, unknown> = {};
  for (const method of ['lean', 'select', 'sort']) {
    chain[method] = () => chain;
  }
  chain.exec = () => Promise.resolve(value);
  return chain as never;
};

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as AppLogger;

const build = (media: MediaProvider) => {
  const send = vi.fn().mockResolvedValue(undefined);
  const config = {
    jwt: { accessSecret: 'x'.repeat(32) },
    siteUrl: 'https://iaa.example',
    adminUrl: 'https://admin.iaa.example',
    email: { notifyTo: 'info@iaa.example', from: 'x' },
    cloudinary: { folder: 'iaa' },
  } as unknown as AppConfig;
  const service = new ApplicantService(
    config,
    { send } as unknown as EmailProvider,
    media,
    { record: vi.fn() } as unknown as AuditService,
    logger,
  );
  return { service, send, config };
};

afterEach(() => vi.restoreAllMocks());

describe('merging answers', () => {
  it('lays the answers sent now over the saved ones, question by question', () => {
    expect(
      mergeAnswers(
        [
          { fieldId: 'name', value: 'Ama' },
          { fieldId: 'city', value: 'Accra' },
        ],
        [
          { fieldId: 'name', value: 'Ama Mensah' },
          { fieldId: 'role', value: 'Engineer' },
        ],
      ),
    ).toEqual([
      { fieldId: 'name', value: 'Ama Mensah' },
      { fieldId: 'city', value: 'Accra' },
      { fieldId: 'role', value: 'Engineer' },
    ]);
  });

  it('keeps only answers to questions the form has', () => {
    expect(
      knownAnswers(steps, [
        { fieldId: 'name', value: 'Ama' },
        { fieldId: 'constructor', value: 'x' },
      ]),
    ).toEqual([{ fieldId: 'name', value: 'Ama' }]);
  });
});

describe('signing an applicant upload', () => {
  it('says plainly when uploads are not available, rather than naming the provider', async () => {
    const unconfigured = new CloudinaryMediaProvider(
      { cloudinary: { folder: 'iaa' } } as AppConfig,
      logger,
    );
    const { service } = build(unconfigured);
    vi.spyOn(FormModel, 'findOne').mockReturnValue(query(form));
    vi.spyOn(FormSubmissionModel, 'findOne').mockReturnValue(query(draft));
    const signing = service.signUpload('mentors', newDraftToken(), {
      fieldId: 'cv',
      filename: 'cv.pdf',
      bytes: 100,
    });
    await expect(signing).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(signing).rejects.toThrow('File uploads are not available at the moment');
  });

  it('passes the file’s extension on, so a Word file keeps it when a reviewer downloads it', async () => {
    const withDocuments: StoredForm = {
      ...form,
      steps: [
        {
          id: 'about',
          title: 'About',
          fields: [
            {
              id: 'cv',
              type: 'file',
              label: 'CV',
              required: false,
              options: [],
              validation: { fileKinds: ['pdf', 'document'] },
            },
          ],
        },
      ],
    };
    const signed = {
      uploadUrl: 'https://api.cloudinary.com/v1_1/demo/auto/upload',
      fields: {},
      publicId: 'iaa/applications/f/d/cv-0123456789abcdef.docx',
      folder: 'iaa/applications/f/d',
      maxBytes: 1,
      allowedFormats: ['pdf', 'docx'],
    };
    const createSignedApplicationUpload = vi.fn().mockReturnValue(signed);
    const { service } = build({ createSignedApplicationUpload } as unknown as MediaProvider);
    vi.spyOn(FormModel, 'findOne').mockReturnValue(query(withDocuments));
    vi.spyOn(FormSubmissionModel, 'findOne').mockReturnValue(query(draft));
    vi.spyOn(FormSubmissionModel, 'updateOne').mockReturnValue(query({ modifiedCount: 1 }));

    await service.signUpload('mentors', newDraftToken(), {
      fieldId: 'cv',
      filename: 'My CV.DOCX',
      bytes: 100,
    });

    expect(createSignedApplicationUpload).toHaveBeenCalledWith(
      expect.objectContaining({ fieldId: 'cv', extension: 'docx' }),
    );
  });

  it('never looks a draft up for a token that could not be one', async () => {
    const { service } = build({} as MediaProvider);
    vi.spyOn(FormModel, 'findOne').mockReturnValue(query(form));
    const lookup = vi.spyOn(FormSubmissionModel, 'findOne');
    await expect(
      service.signUpload('mentors', 'short', { fieldId: 'cv', filename: 'cv.pdf', bytes: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe('resume links', () => {
  it('quietly does nothing when there is no draft to reach', async () => {
    const { service, send } = build({} as MediaProvider);
    vi.spyOn(FormModel, 'findOne').mockReturnValue(query(form));
    vi.spyOn(FormSubmissionModel, 'findOneAndUpdate').mockReturnValue(query(null));
    await expect(
      service.requestResumeLink('mentors', newDraftToken(), { email: 'a@example.org' }),
    ).resolves.toBeUndefined();
    await expect(
      service.requestResumeLink('mentors', undefined, { email: 'a@example.org' }),
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing for a form that keeps no drafts', async () => {
    const { service, send } = build({} as MediaProvider);
    vi.spyOn(FormModel, 'findOne').mockReturnValue(
      query({ ...form, settings: { allowDrafts: false } }),
    );
    const update = vi.spyOn(FormSubmissionModel, 'findOneAndUpdate');
    await service.requestResumeLink('mentors', newDraftToken(), { email: 'a@example.org' });
    expect(update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('adds a fresh token beside the one presented, keeping at most five, and never fails on a mail error', async () => {
    const { service, send } = build({} as MediaProvider);
    send.mockRejectedValue(new Error('mail down'));
    vi.spyOn(FormModel, 'findOne').mockReturnValue(query(form));
    const update = vi.spyOn(FormSubmissionModel, 'findOneAndUpdate').mockReturnValue(query(draft));
    const token = newDraftToken();
    await service.requestResumeLink('mentors', token, { email: 'a@example.org' });
    const [filter, pipeline, options] = update.mock.calls[0] ?? [];
    const stage = (pipeline as { $set: Record<string, unknown> }[])[0]?.$set ?? {};
    const rotation = stage.tokenHashes as {
      $slice: [{ $concatArrays: [unknown, string[]] }, number];
    };
    // The presented hash is always kept, with the fresh one after it.
    const [presented, added] = rotation.$slice[0].$concatArrays[1];
    expect(filter).toMatchObject({ tokenHashes: hashDraftToken(token) });
    expect(presented).toBe(hashDraftToken(token));
    expect(added).toMatch(/^[a-f0-9]{64}$/);
    expect(added).not.toBe(presented);
    expect(rotation.$slice[1]).toBe(-5);
    expect(stage['applicant.email']).toEqual({ $literal: 'a@example.org' });
    expect(options).toMatchObject({ updatePipeline: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].html).toMatch(/https:\/\/iaa\.example\/apply\/mentors#resume=/);
  });
});

describe('previews', () => {
  it('are not found without a valid token', async () => {
    const { service } = build({} as MediaProvider);
    await expect(service.previewForm(undefined)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.previewForm('nonsense')).rejects.toBeInstanceOf(NotFoundError);
  });
});

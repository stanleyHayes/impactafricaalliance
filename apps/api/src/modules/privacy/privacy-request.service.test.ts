import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppLogger } from '../../config/logger.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import { FormSubmissionModel } from '../forms/form-submission.model.js';
import { FormVersionModel } from '../forms/form-version.model.js';
import { FormModel } from '../forms/form.model.js';
import { DonationModel } from '../payments/donation.model.js';
import { SubmissionModel, SubscriberModel } from '../submissions/submission.model.js';

import type { PrivacyRequestRepository } from './privacy-request.repository.js';
import { PrivacyRequestService } from './privacy-request.service.js';

const now = new Date('2026-10-01T12:00:00.000Z');
const formId = new Types.ObjectId();

const query = (value: unknown) => {
  const chain: Record<string, unknown> = {};
  for (const method of ['lean', 'select', 'sort']) {
    chain[method] = () => chain;
  }
  chain.exec = () => Promise.resolve(value);
  return chain as never;
};

const cv = (publicId: string) => ({
  publicId,
  url: `https://res.cloudinary.com/iaa/raw/authenticated/v1/${publicId}`,
  name: 'cv.pdf',
  resourceType: 'raw',
});

const applications = [
  {
    _id: new Types.ObjectId(),
    reference: 'APP-ABCDEF',
    formId,
    formVersion: 1,
    status: 'submitted',
    answers: [
      { fieldId: 'name', value: 'Ama Mensah' },
      { fieldId: 'cv', value: [cv('iaa/applications/f/d/cv-1')] },
    ],
    submittedAt: now,
    createdAt: now,
  },
  {
    _id: new Types.ObjectId(),
    formId,
    formVersion: 2,
    status: 'draft',
    answers: [{ fieldId: 'cv', value: [cv('iaa/applications/f/e/cv-2')] }],
    createdAt: now,
  },
];

const build = () => {
  const media = { destroyAsset: vi.fn().mockResolvedValue(undefined) };
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  const repo = {
    findById: vi
      .fn()
      .mockResolvedValue({ id: 'r1', type: 'delete', status: 'pending', email: 'Ama@Example.org' }),
    update: vi.fn().mockResolvedValue({ id: 'r1', status: 'fulfilled' }),
  };
  const service = new PrivacyRequestService(
    repo as unknown as PrivacyRequestRepository,
    media as unknown as MediaProvider,
    logger as unknown as AppLogger,
  );
  return { service, media, logger };
};

const stubOtherData = () => {
  vi.spyOn(SubmissionModel, 'find').mockReturnValue(query([]));
  vi.spyOn(SubscriberModel, 'find').mockReturnValue(query([]));
  vi.spyOn(DonationModel, 'find').mockReturnValue(query([]));
  vi.spyOn(SubmissionModel, 'deleteMany').mockReturnValue(query({}));
  vi.spyOn(SubscriberModel, 'deleteMany').mockReturnValue(query({}));
  vi.spyOn(DonationModel, 'updateMany').mockReturnValue(query({}));
};

afterEach(() => vi.restoreAllMocks());

describe('privacy requests and applications', () => {
  it('exports applications and drafts with the questions as the applicant saw them', async () => {
    const { service } = build();
    stubOtherData();
    const find = vi.spyOn(FormSubmissionModel, 'find').mockReturnValue(query(applications));
    vi.spyOn(FormModel, 'find').mockReturnValue(
      query([
        {
          _id: formId,
          title: 'Speakers',
          steps: [{ id: 's', title: 'S', fields: [{ id: 'cv', label: 'Your CV' }] }],
        },
      ]),
    );
    vi.spyOn(FormVersionModel, 'find').mockReturnValue(
      query([
        {
          formId,
          version: 1,
          steps: [
            {
              id: 's',
              title: 'S',
              fields: [
                { id: 'name', label: 'Full name' },
                { id: 'cv', label: 'CV' },
              ],
            },
          ],
        },
      ]),
    );

    const exported = await service.exportPersonalData('Ama@Example.org');
    expect(find).toHaveBeenCalledWith({ 'applicant.email': 'ama@example.org' });
    expect(exported.applications).toEqual([
      {
        reference: 'APP-ABCDEF',
        form: 'Speakers',
        status: 'submitted',
        answers: [
          { question: 'Full name', value: 'Ama Mensah' },
          { question: 'CV', value: [cv('iaa/applications/f/d/cv-1')] },
        ],
        submittedAt: now.toISOString(),
        createdAt: now.toISOString(),
      },
      {
        form: 'Speakers',
        status: 'draft',
        // No snapshot for version 2, so the form's current wording.
        answers: [{ question: 'Your CV', value: [cv('iaa/applications/f/e/cv-2')] }],
        createdAt: now.toISOString(),
      },
    ]);
  });

  it('erases applications and their files, carrying on when a file will not go', async () => {
    const { service, media, logger } = build();
    stubOtherData();
    vi.spyOn(FormSubmissionModel, 'find').mockReturnValue(query(applications));
    const deleteMany = vi.spyOn(FormSubmissionModel, 'deleteMany').mockReturnValue(query({}));
    media.destroyAsset.mockRejectedValueOnce(new Error('Cloudinary down'));

    await service.update('r1', { status: 'fulfilled' });

    expect(deleteMany).toHaveBeenCalledWith({
      _id: { $in: applications.map((item) => item._id) },
    });
    expect(media.destroyAsset).toHaveBeenCalledTimes(2);
    expect(media.destroyAsset).toHaveBeenCalledWith({
      publicId: 'iaa/applications/f/e/cv-2',
      resourceType: 'raw',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('leaves applications alone when nobody with that address applied', async () => {
    const { service, media } = build();
    stubOtherData();
    vi.spyOn(FormSubmissionModel, 'find').mockReturnValue(query([]));
    const deleteMany = vi.spyOn(FormSubmissionModel, 'deleteMany');
    await service.update('r1', { status: 'fulfilled' });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(media.destroyAsset).not.toHaveBeenCalled();
  });
});

import { UserRole } from '@iaa/shared';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ForbiddenError, NotFoundError } from '../../common/errors.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import type { AuditService } from '../audit/audit.service.js';
import type { PeopleService } from '../people/people.service.js';

import { ApplicationService } from './application.service.js';
import type { Actor, StoredSubmission } from './form-mappers.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormVersionModel } from './form-version.model.js';
import { FormModel } from './form.model.js';

const now = new Date('2026-10-01T12:00:00.000Z');
const reviewerId = new Types.ObjectId();
const author: Actor = { id: reviewerId.toString(), email: 'r@iaa.org', role: UserRole.Editor };
const colleague: Actor = {
  id: new Types.ObjectId().toString(),
  email: 'c@iaa.org',
  role: UserRole.Editor,
};
const admin: Actor = {
  id: new Types.ObjectId().toString(),
  email: 'a@iaa.org',
  role: UserRole.Admin,
};

const application: StoredSubmission = {
  _id: new Types.ObjectId(),
  reference: 'APP-ABCDEF',
  formId: new Types.ObjectId(),
  formVersion: 1,
  status: 'submitted',
  answers: [],
  tokenHashes: [],
  reviews: [{ id: 'r1', reviewerId, notes: 'Good', createdAt: now }],
  statusHistory: [{ from: 'draft', to: 'submitted', at: now }],
  submittedAt: now,
  createdAt: now,
  updatedAt: now,
};

const query = (value: unknown) => {
  const chain: Record<string, unknown> = {};
  for (const method of ['lean', 'select', 'sort', 'skip', 'limit']) {
    chain[method] = () => chain;
  }
  chain.exec = () => Promise.resolve(value);
  return chain as never;
};

const build = () => {
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const people = { summaries: vi.fn().mockResolvedValue(new Map()) };
  const media = { signedDeliveryUrl: vi.fn().mockReturnValue(null) };
  const service = new ApplicationService(
    audit as unknown as AuditService,
    people as unknown as PeopleService,
    media as unknown as MediaProvider,
  );
  vi.spyOn(FormSubmissionModel, 'findOne').mockReturnValue(query(application));
  vi.spyOn(FormModel, 'findById').mockReturnValue(query(null));
  vi.spyOn(FormVersionModel, 'findOne').mockReturnValue(query(null));
  return { service, audit };
};

afterEach(() => vi.restoreAllMocks());

describe('application status rules', () => {
  it('treats a move to the status it already has as done, writing nothing', async () => {
    const { service, audit } = build();
    const write = vi.spyOn(FormSubmissionModel, 'findOneAndUpdate');
    const result = await service.changeStatus(
      application._id.toString(),
      { status: 'submitted' },
      author,
    );
    expect(result.status).toBe('submitted');
    expect(write).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('records who moved it, when and why', async () => {
    const { service } = build();
    const write = vi
      .spyOn(FormSubmissionModel, 'findOneAndUpdate')
      .mockReturnValue(query({ ...application, status: 'shortlisted' }));
    await service.changeStatus(
      application._id.toString(),
      { status: 'shortlisted', note: 'Top five' },
      author,
    );
    const [filter, update] = write.mock.calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, never>,
    ];
    // Guarded on the status read, so two reviewers cannot both move it.
    expect(filter).toMatchObject({ status: 'submitted' });
    expect(update).toMatchObject({
      $set: { status: 'shortlisted' },
      $push: { statusHistory: { from: 'submitted', to: 'shortlisted', note: 'Top five' } },
    });
  });
});

describe('removing reviews', () => {
  it('lets the author remove their own review', async () => {
    const { service } = build();
    const pull = vi.spyOn(FormSubmissionModel, 'updateOne').mockReturnValue(query({}));
    await service.removeReview(application._id.toString(), 'r1', author);
    expect(pull).toHaveBeenCalledWith(
      { _id: application._id },
      { $pull: { reviews: { id: 'r1' } } },
    );
  });

  it("refuses a colleague's review to anyone but an administrator", async () => {
    const { service } = build();
    const pull = vi.spyOn(FormSubmissionModel, 'updateOne').mockReturnValue(query({}));
    await expect(
      service.removeReview(application._id.toString(), 'r1', colleague),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(pull).not.toHaveBeenCalled();
    await service.removeReview(application._id.toString(), 'r1', admin);
    expect(pull).toHaveBeenCalledTimes(1);
  });

  it('says a review that is not there is not found', async () => {
    const { service } = build();
    await expect(
      service.removeReview(application._id.toString(), 'nope', admin),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('application counts', () => {
  it('lists every reviewable status, zero where there are none', async () => {
    const { service } = build();
    vi.spyOn(FormSubmissionModel, 'aggregate').mockReturnValue(
      query([
        { _id: 'submitted', count: 4 },
        { _id: 'accepted', count: 1 },
      ]),
    );
    expect(await service.counts()).toEqual({
      submitted: 4,
      'under-review': 0,
      shortlisted: 0,
      accepted: 1,
      rejected: 0,
    });
  });
});

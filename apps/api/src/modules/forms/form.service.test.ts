import { UserRole, type FormStep } from '@iaa/shared';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConflictError, ForbiddenError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import type { AuditService } from '../audit/audit.service.js';
import type { PeopleService } from '../people/people.service.js';

import type { Actor, StoredForm } from './form-mappers.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormVersionModel } from './form-version.model.js';
import { FormModel } from './form.model.js';
import { FormService, liveEditProblems, publishBlockers } from './form.service.js';

const now = new Date('2026-10-01T12:00:00.000Z');
const admin: Actor = {
  id: new Types.ObjectId().toString(),
  email: 'a@iaa.org',
  role: UserRole.Admin,
};
const editor: Actor = {
  id: new Types.ObjectId().toString(),
  email: 'e@iaa.org',
  role: UserRole.Editor,
};

const steps: FormStep[] = [
  {
    id: 'about',
    title: 'About',
    fields: [{ id: 'name', type: 'short-text', label: 'Name', required: true, options: [] }],
  },
];

const stored = (overrides: Partial<StoredForm> = {}): StoredForm => ({
  _id: new Types.ObjectId(),
  title: 'Speakers',
  slug: 'speakers',
  type: 'general',
  status: 'draft',
  settings: { allowDrafts: true },
  steps,
  version: 1,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

/** A stand-in for a Mongoose query that resolves to `value`. */
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
  const media = { destroyAsset: vi.fn().mockResolvedValue(undefined) };
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  const service = new FormService(
    { jwt: { accessSecret: 'x'.repeat(32) }, siteUrl: 'https://iaa.example' } as AppConfig,
    audit as unknown as AuditService,
    people as unknown as PeopleService,
    media as unknown as MediaProvider,
    logger as unknown as AppLogger,
  );
  return { service, audit, media };
};

afterEach(() => vi.restoreAllMocks());

describe('what blocks publishing', () => {
  it('adds a passed closing date to the shared checks', () => {
    expect(publishBlockers(stored(), now)).toEqual([]);
    expect(
      publishBlockers(
        stored({ settings: { allowDrafts: true, closesAt: new Date('2026-09-30') } }),
        now,
      ),
    ).toEqual(['The closing date has passed. Move it later or clear it.']);
    expect(publishBlockers(stored({ steps: [] }), now)).toContain('Add at least one question.');
  });
});

describe('editing a live form', () => {
  const live = stored({ status: 'published' });

  it('refuses an edit that would leave a published form unpublishable, naming where', () => {
    expect(
      liveEditProblems(live, { steps: [{ id: 'about', title: 'About', fields: [] }] }),
    ).toEqual([{ path: 'steps', message: 'Add at least one question.' }]);
    expect(
      liveEditProblems(live, {
        settings: {
          allowDrafts: true,
          opensAt: '2027-03-01T00:00:00.000Z',
          closesAt: '2027-02-01T00:00:00.000Z',
        },
      }),
    ).toEqual([
      { path: 'settings.closesAt', message: 'The closing date must be after the opening date.' },
    ]);
  });

  it('checks nothing for a form that is not live, or an edit publishing does not depend on', () => {
    const empty = { steps: [{ id: 'about', title: 'About', fields: [] }] };
    expect(liveEditProblems(stored(), empty)).toEqual([]);
    expect(liveEditProblems(stored({ status: 'closed' }), empty)).toEqual([]);
    expect(
      liveEditProblems(stored({ status: 'published', steps: [] }), { description: 'x' }),
    ).toEqual([]);
  });

  it('refuses before writing anything', async () => {
    const { service } = build();
    vi.spyOn(FormModel, 'findById').mockReturnValue(query(live));
    const write = vi.spyOn(FormModel, 'findOneAndUpdate');
    await expect(service.update(live._id.toString(), { steps: [] }, editor)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(write).not.toHaveBeenCalled();
  });
});

describe('form status rules', () => {
  it('lets only an administrator change a status, before reading anything', async () => {
    const { service } = build();
    const findById = vi.spyOn(FormModel, 'findById');
    await expect(
      service.changeStatus(new Types.ObjectId().toString(), 'published', editor),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(findById).not.toHaveBeenCalled();
  });

  it('refuses to take an answered form back to draft', async () => {
    const { service } = build();
    const form = stored({ status: 'published' });
    vi.spyOn(FormModel, 'findById').mockReturnValue(query(form));
    vi.spyOn(FormSubmissionModel, 'countDocuments').mockReturnValue(query(2));
    const write = vi.spyOn(FormModel, 'findOneAndUpdate');
    await expect(service.changeStatus(form._id.toString(), 'draft', admin)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(write).not.toHaveBeenCalled();
  });

  it('closes only a published form, and treats a repeat as done', async () => {
    const { service, audit } = build();
    const draft = stored();
    vi.spyOn(FormModel, 'findById').mockReturnValue(query(draft));
    vi.spyOn(FormSubmissionModel, 'countDocuments').mockReturnValue(query(0));
    await expect(service.changeStatus(draft._id.toString(), 'closed', admin)).rejects.toThrow(
      'Only a published form can be closed.',
    );
    const result = await service.changeStatus(draft._id.toString(), 'draft', admin);
    expect(result.status).toBe('draft');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('writes a missing snapshot when a live form is published again', async () => {
    const { service, audit } = build();
    const form = stored({ status: 'published' });
    vi.spyOn(FormModel, 'findById').mockReturnValue(query(form));
    vi.spyOn(FormSubmissionModel, 'countDocuments').mockReturnValue(query(0));
    const snapshot = vi.spyOn(FormVersionModel, 'updateOne').mockReturnValue(query({}));
    const result = await service.changeStatus(form._id.toString(), 'published', admin);
    expect(result.status).toBe('published');
    // `$setOnInsert`, so an existing snapshot is never rewritten.
    expect(snapshot.mock.calls[0]?.[1]).toHaveProperty('$setOnInsert');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('refuses to delete a form people have applied through', async () => {
    const { service } = build();
    const form = stored({ status: 'closed' });
    vi.spyOn(FormModel, 'findById').mockReturnValue(query(form));
    vi.spyOn(FormSubmissionModel, 'countDocuments').mockReturnValue(query(1));
    const deleteOne = vi.spyOn(FormModel, 'deleteOne');
    await expect(service.remove(form._id.toString(), admin)).rejects.toThrow(/cannot be deleted/);
    expect(deleteOne).not.toHaveBeenCalled();
  });
});

describe('versions when questions change', () => {
  const changed: FormStep[] = [
    { ...steps[0]!, fields: [{ ...steps[0]!.fields[0]!, label: 'Your name' }] },
  ];

  const editWith = async (form: StoredForm, snapshotted: boolean) => {
    const { service } = build();
    vi.spyOn(FormModel, 'findById').mockReturnValue(query(form));
    vi.spyOn(FormVersionModel, 'exists').mockReturnValue(query(snapshotted ? { _id: 1 } : null));
    vi.spyOn(FormSubmissionModel, 'countDocuments').mockReturnValue(query(0));
    const snapshot = vi.spyOn(FormVersionModel, 'updateOne').mockReturnValue(query({}));
    const write = vi
      .spyOn(FormModel, 'findOneAndUpdate')
      .mockImplementation(((_filter: unknown, update: { $set: Record<string, unknown> }) =>
        query({ ...form, ...update.$set })) as never);
    const result = await service.update(form._id.toString(), { steps: changed }, editor);
    return { result, write, snapshot };
  };

  it('moves a live form to the next version and snapshots it at once', async () => {
    const { result, write, snapshot } = await editWith(stored({ status: 'published' }), true);
    expect(result.version).toBe(2);
    // Guarded on what was read, so a concurrent save or status change loses.
    expect(write.mock.calls[0]?.[0]).toMatchObject({ version: 1, status: 'published' });
    expect(snapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps an unpublished, never-snapshotted form on its version', async () => {
    const { result, snapshot } = await editWith(stored(), false);
    expect(result.version).toBe(1);
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('moves a closed form on without a snapshot when its version was already seen', async () => {
    const { result, snapshot } = await editWith(stored({ status: 'closed' }), true);
    expect(result.version).toBe(2);
    expect(snapshot).not.toHaveBeenCalled();
  });
});

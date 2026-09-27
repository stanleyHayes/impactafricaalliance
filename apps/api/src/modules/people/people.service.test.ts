import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../common/errors.js';
import type { UserRepository, UserSummaryRow } from '../users/user.repository.js';

import { PeopleService } from './people.service.js';

const row = (name: string, isActive = true): UserSummaryRow => ({
  _id: new Types.ObjectId(),
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@iaa.org`,
  role: 'editor',
  isActive,
});

const ama = row('Ama Boateng');
const gone = row('Gone Away', false);

const build = (rows: UserSummaryRow[] = [ama, gone]) => {
  const users = {
    findDirectory: vi.fn().mockResolvedValue({ items: [ama], total: 1 }),
    findSummaries: vi.fn(async (ids: readonly string[], options: { activeOnly?: boolean } = {}) =>
      rows.filter(
        (candidate) =>
          ids.includes(candidate._id.toString()) && (!options.activeOnly || candidate.isActive),
      ),
    ),
  };
  return { service: new PeopleService(users as unknown as UserRepository), users };
};

describe('PeopleService.search', () => {
  it('returns a page of summaries without the active flag', async () => {
    const { service, users } = build();
    const page = await service.search({ q: 'ama', page: 1, pageSize: 20 });
    expect(users.findDirectory).toHaveBeenCalledWith({
      q: 'ama',
      ids: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(page).toEqual({
      items: [
        {
          id: ama._id.toString(),
          name: 'Ama Boateng',
          email: 'ama.boateng@iaa.org',
          role: 'editor',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });
});

describe('PeopleService.summaries', () => {
  it('resolves ObjectIds and strings in one query, once per person', async () => {
    const { service, users } = build();
    const map = await service.summaries([ama._id, ama._id.toString(), null, undefined, gone._id]);
    expect(users.findSummaries).toHaveBeenCalledTimes(1);
    expect(users.findSummaries.mock.calls[0]?.[0]).toEqual([
      ama._id.toString(),
      gone._id.toString(),
    ]);
    // Deactivated colleagues keep their names in the history of a record.
    expect(map.get(gone._id.toString())?.name).toBe('Gone Away');
  });

  it('can leave deactivated accounts out', async () => {
    const { service } = build();
    const map = await service.summaries([ama._id, gone._id], { activeOnly: true });
    expect([...map.keys()]).toEqual([ama._id.toString()]);
  });

  it('asks nothing of the database when there is nobody to look up', async () => {
    const { service, users } = build();
    expect((await service.summaries([null, undefined])).size).toBe(0);
    expect(users.findSummaries).not.toHaveBeenCalled();
  });

  it('finds one person, or null', async () => {
    const { service } = build();
    expect((await service.summary(ama._id))?.email).toBe('ama.boateng@iaa.org');
    expect(await service.summary(new Types.ObjectId())).toBeNull();
    expect(await service.summary(null)).toBeNull();
  });
});

describe('PeopleService.assertActive', () => {
  it('accepts active colleagues', async () => {
    const { service } = build();
    await expect(service.assertActive([ama._id.toString()], 'Assignees')).resolves.toBeUndefined();
  });

  it('refuses deactivated accounts and ids with no account, naming them', async () => {
    const { service } = build();
    const nobody = new Types.ObjectId().toString();
    const failure = service.assertActive(
      [ama._id.toString(), gone._id.toString(), nobody],
      'Assignees',
    );
    await expect(failure).rejects.toBeInstanceOf(ValidationError);
    await expect(failure).rejects.toMatchObject({
      message: 'Assignees must be active members of the team',
      details: [gone._id.toString(), nobody],
    });
  });
});

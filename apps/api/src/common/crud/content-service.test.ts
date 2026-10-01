import type { HydratedDocument } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../errors.js';

import type { ContentRepository } from './content-repository.js';
import { ContentService } from './content-service.js';

interface Doc {
  name: string;
  website?: string;
  photo?: { url: string };
}

const fixture = (stored: object | null = { name: 'Ama Mensah' }) => {
  const repo = { update: vi.fn().mockResolvedValue(stored as HydratedDocument<Doc> | null) };
  const service = new ContentService<Doc>(repo as unknown as ContentRepository<Doc>, {
    resource: 'Thing',
    publicFilter: {},
  });
  return { service, repo };
};

describe('content updates', () => {
  it('unsets the fields a change sets to null and sets the rest', async () => {
    const { service, repo } = fixture();
    await service.update('abc', { name: 'Ama Mensah', website: null, photo: null });
    expect(repo.update).toHaveBeenCalledWith('abc', {
      $set: { name: 'Ama Mensah' },
      $unset: { website: 1, photo: 1 },
    });
  });

  it('sends no empty $set when the change only removes', async () => {
    const { service, repo } = fixture();
    await service.update('abc', { website: null });
    expect(repo.update).toHaveBeenCalledWith('abc', { $unset: { website: 1 } });
  });

  it('passes a change without nulls, or one written with operators, on as it is', async () => {
    const { service, repo } = fixture();
    const plain = { name: 'Ama Mensah', order: 0, isActive: false };
    await service.update('abc', plain);
    expect(repo.update).toHaveBeenLastCalledWith('abc', plain);
    const operators = { $set: { host: null }, $unset: { image: 1 } };
    await service.update('abc', operators);
    expect(repo.update).toHaveBeenLastCalledWith('abc', operators);
  });

  it('reports a record that is not there', async () => {
    const { service } = fixture(null);
    await expect(service.update('abc', { website: null })).rejects.toBeInstanceOf(NotFoundError);
  });
});

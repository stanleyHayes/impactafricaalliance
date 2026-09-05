import type { HydratedDocument } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import type { ContentRepository } from '../../common/crud/content-repository.js';

import { EventContentService } from './event-content.service.js';
import type { EventDocument } from './models/event.model.js';

const fixture = () => {
  const data = {
    startAt: new Date('2030-01-01T10:00:00Z'),
    endAt: new Date('2030-01-01T12:00:00Z'),
    image: { url: 'https://example.com/image.jpg', publicId: 'old' },
  };
  const document = { ...data, toObject: () => data } as HydratedDocument<EventDocument>;
  const repo = {
    findById: vi.fn().mockResolvedValue(document),
    update: vi.fn().mockResolvedValue(document),
    create: vi.fn().mockResolvedValue(document),
  };
  const service = new EventContentService(repo as unknown as ContentRepository<EventDocument>, {
    resource: 'Event',
    publicFilter: { status: 'published' },
  });
  return { service, repo };
};
describe('event updates', () => {
  it('removes explicitly cleared fields while preserving omitted fields', async () => {
    const { service, repo } = fixture();
    await service.update('id', { image: null, host: null, title: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('id', {
      $set: { title: 'Updated' },
      $unset: { image: 1, host: 1 },
    });
  });
  it('persists replacement Cloudinary metadata', async () => {
    const { service, repo } = fixture();
    const image = {
      url: 'https://res.cloudinary.com/demo/image/upload/event.jpg',
      publicId: 'events/new',
      width: 800,
      height: 600,
    };
    await service.update('id', { image });
    expect(repo.update).toHaveBeenCalledWith('id', { $set: { image } });
  });
  it('validates partial date edits against the stored schedule', async () => {
    const { service, repo } = fixture();
    await expect(service.update('id', { startAt: '2030-01-01T13:00:00Z' })).rejects.toThrow(
      'end must be after',
    );
    expect(repo.update).not.toHaveBeenCalled();
    await service.update('id', { startAt: '2030-01-01T13:00:00Z', endAt: null });
    expect(repo.update).toHaveBeenCalled();
  });
});

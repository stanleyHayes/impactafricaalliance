import { describe, expect, it, vi } from 'vitest';

import { api } from './api-client';
import { fetchAllPages } from './pagination';

vi.mock('./api-client', () => ({ api: { get: vi.fn() } }));
describe('client-paginated record lists', () => {
  it('keeps the records beyond the first API page accessible', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ items: [{ id: 'first' }], page: 1, total: 2, totalPages: 2 })
      .mockResolvedValueOnce({ items: [{ id: 'older' }], page: 2, total: 2, totalPages: 2 });
    const result = await fetchAllPages('/admin/submissions?type=job&pageSize=100');
    expect(result.items).toEqual([{ id: 'first' }, { id: 'older' }]);
    expect(api.get).toHaveBeenLastCalledWith('/admin/submissions?type=job&pageSize=100&page=2');
  });
});

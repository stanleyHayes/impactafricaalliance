import type { ImpactStat, Paginated } from '@iaa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet } from './api-client';
import { useImpactStats } from './content-hooks';

vi.mock('./api-client', () => ({ apiGet: vi.fn() }));

const QueryWrapper = ({ children }: { children: ReactNode }): JSX.Element => {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const metrics: ImpactStat[] = Array.from({ length: 41 }, (_, index) => ({
  id: `stat-${index}`,
  key: `community-metric-${index}`,
  label: `Community metric ${index}`,
  value: index * 10,
  suffix: '+',
  order: index,
  isActive: true,
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
}));

const statsPage = (page: number): Paginated<ImpactStat> => ({
  items: metrics.slice((page - 1) * 20, page * 20),
  page,
  pageSize: 20,
  total: metrics.length,
  totalPages: 3,
});

describe('useImpactStats', () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it('includes every public metric across pages in the order supplied by the API', async () => {
    vi.mocked(apiGet)
      .mockResolvedValueOnce(statsPage(1))
      .mockResolvedValueOnce(statsPage(2))
      .mockResolvedValueOnce(statsPage(3));

    const { result } = renderHook(() => useImpactStats(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ...statsPage(1), items: metrics });
    expect(vi.mocked(apiGet).mock.calls.map(([path]) => path)).toEqual([
      '/stats?pageSize=20',
      '/stats?pageSize=20&page=2',
      '/stats?pageSize=20&page=3',
    ]);
  });

  it('preserves an empty response so page consumers can show an honest empty state', async () => {
    const empty: Paginated<ImpactStat> = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    };
    vi.mocked(apiGet).mockResolvedValueOnce(empty);

    const { result } = renderHook(() => useImpactStats(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(empty);
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it('reports a later-page failure instead of presenting an incomplete collection as success', async () => {
    const error = new Error('The next page is unavailable');
    vi.mocked(apiGet).mockResolvedValueOnce(statsPage(1)).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useImpactStats(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeUndefined();
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});

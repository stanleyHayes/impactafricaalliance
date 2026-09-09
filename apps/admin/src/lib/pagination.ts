import type { Paginated } from '@iaa/shared';

import { api } from './api-client';

/** Client-paginated lists must include every API page, not just the first 100 records. */
export const fetchAllPages = async <T>(path: string): Promise<Paginated<T>> => {
  const first = await api.get<Paginated<T>>(path);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await api.get<Paginated<T>>(
      `${path}${path.includes('?') ? '&' : '?'}page=${page}`,
    );
    items.push(...next.items);
  }
  return { ...first, items };
};

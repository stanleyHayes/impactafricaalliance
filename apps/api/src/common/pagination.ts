import type { Paginated } from '@iaa/shared';

/** Assemble a standard paginated envelope from a page of results and a total count. */
export const paginate = <T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

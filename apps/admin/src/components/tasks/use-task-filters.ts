import {
  DUE_BUCKETS,
  TASK_SORTS,
  TASK_STATUSES,
  WORK_PRIORITIES,
  type DueBucket,
  type SortOrder,
  type TaskSort,
  type TaskStatus,
  type WorkPriority,
} from '@iaa/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { TaskFilterParams } from '../../lib/tasks';

/**
 * The task filters as the address holds them, so a filtered list or board can
 * be bookmarked, shared and returned to with Back.
 *
 * - `assignee`: a person's id, `me` or `none`.
 * - `project`: a project's id or `none`.
 * - `done` and `archived`: `1` to include finished or archived work.
 */
export interface TaskFilterState {
  q: string;
  status: TaskStatus[];
  priority: WorkPriority | '';
  assignee: string;
  project: string;
  due: DueBucket | '';
  label: string;
  done: boolean;
  archived: boolean;
}

export const EMPTY_TASK_FILTERS: TaskFilterState = {
  q: '',
  status: [],
  priority: '',
  assignee: '',
  project: '',
  due: '',
  label: '',
  done: false,
  archived: false,
};

const FILTER_PARAMS = [
  'q',
  'status',
  'priority',
  'assignee',
  'project',
  'due',
  'label',
  'done',
  'archived',
] as const;

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | '' =>
  value && (values as readonly string[]).includes(value) ? (value as T) : '';

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** An id, or one of the words the API also accepts (`me`, `none`); anything else is no filter. */
const idOrWord = (value: string | null, words: readonly string[]): string =>
  value && (words.includes(value) || OBJECT_ID.test(value)) ? value : '';

// The API's own limits (`taskListQuerySchema`): longer text would be refused.
const SEARCH_MAX = 80;
const LABEL_MAX = 40;

/**
 * Reads the filters from the address, ignoring anything that is not a real
 * value. A hand-edited or truncated link then shows the list without that
 * filter, rather than an error the API would answer it with.
 */
export const readTaskFilters = (params: URLSearchParams): TaskFilterState => ({
  q: (params.get('q') ?? '').slice(0, SEARCH_MAX),
  status: (params.get('status') ?? '')
    .split(',')
    .filter((value): value is TaskStatus => (TASK_STATUSES as readonly string[]).includes(value)),
  priority: oneOf(WORK_PRIORITIES, params.get('priority')),
  assignee: idOrWord(params.get('assignee'), ['me', 'none']),
  project: idOrWord(params.get('project'), ['none']),
  due: oneOf(DUE_BUCKETS, params.get('due')),
  label: (params.get('label') ?? '').slice(0, LABEL_MAX),
  done: params.get('done') === '1',
  archived: params.get('archived') === '1',
});

/** The filters as the API's query parameters. */
export const toFilterParams = (state: TaskFilterState): TaskFilterParams => ({
  q: state.q || undefined,
  status: state.status.length > 0 ? state.status : undefined,
  priority: state.priority || undefined,
  assigneeId: state.assignee || undefined,
  projectId: state.project || undefined,
  due: state.due || undefined,
  label: state.label || undefined,
  includeDone: state.done || undefined,
  includeArchived: state.archived || undefined,
});

/** How many filters narrow the view, for the "Filters (3)" button and Clear. */
export const activeFilterCount = (state: TaskFilterState): number =>
  FILTER_PARAMS.filter((key) => {
    const value = state[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }).length;

const writeValue = (next: URLSearchParams, key: keyof TaskFilterState, value: unknown): void => {
  let text = '';
  if (Array.isArray(value)) text = value.join(',');
  else if (typeof value === 'boolean') text = value ? '1' : '';
  else text = String(value ?? '');
  if (text) next.set(key, text);
  else next.delete(key);
};

export interface TaskFilterControls {
  filters: TaskFilterState;
  params: TaskFilterParams;
  setFilter: <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) => void;
  clear: () => void;
  activeCount: number;
}

/**
 * The filters in the address, with setters that go back to the first page:
 * page 4 of the old results means nothing for the new ones.
 */
export const useTaskFilters = (): TaskFilterControls => {
  const [params, setParams] = useSearchParams();
  const key = params.toString();
  const filters = useMemo(() => readTaskFilters(new URLSearchParams(key)), [key]);

  const setFilter = useCallback(
    <K extends keyof TaskFilterState>(name: K, value: TaskFilterState[K]) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          writeValue(next, name, value);
          next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const clear = useCallback(
    () =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        for (const name of FILTER_PARAMS) next.delete(name);
        next.delete('page');
        return next;
      }),
    [setParams],
  );

  return {
    filters,
    params: useMemo(() => toFilterParams(filters), [filters]),
    setFilter,
    clear,
    activeCount: activeFilterCount(filters),
  };
};

/** The natural first direction for each sort: soonest due and lowest key first, newest otherwise. */
const defaultOrder = (sort: TaskSort): SortOrder =>
  sort === 'due' || sort === 'key' ? 'asc' : 'desc';

/** The list's sort, from the address, defaulting to most recently changed first. */
export const useTaskSort = (): {
  sort: TaskSort;
  order: SortOrder;
  /** A column heading: a new column in its natural order, the same one turned round. */
  setSort: (sort: TaskSort) => void;
  /** A sort chosen whole, as the menu on narrow screens offers it. */
  setSortOrder: (sort: TaskSort, order: SortOrder) => void;
} => {
  const [params, setParams] = useSearchParams();
  const sort = oneOf(TASK_SORTS, params.get('sort')) || 'updated';
  const order: SortOrder = params.get('order') === 'asc' ? 'asc' : 'desc';
  const setSort = useCallback(
    (next: TaskSort) =>
      setParams((current) => {
        const updated = new URLSearchParams(current);
        // Choosing the current column again turns it round.
        const sameColumn = (current.get('sort') ?? 'updated') === next;
        const nextOrder = sameColumn && current.get('order') !== 'asc' ? 'asc' : 'desc';
        updated.set('sort', next);
        updated.set('order', sameColumn ? nextOrder : defaultOrder(next));
        updated.delete('page');
        return updated;
      }),
    [setParams],
  );
  const setSortOrder = useCallback(
    (next: TaskSort, nextOrder: SortOrder) =>
      setParams((current) => {
        const updated = new URLSearchParams(current);
        updated.set('sort', next);
        updated.set('order', nextOrder);
        updated.delete('page');
        return updated;
      }),
    [setParams],
  );
  return { sort, order, setSort, setSortOrder };
};

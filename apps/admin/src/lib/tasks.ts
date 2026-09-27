import {
  localDateKey,
  parseTaskKey,
  type ChecklistItemPatch,
  type DueBucket,
  type FileAttachmentInput,
  type Paginated,
  type Project,
  type ProjectListItem,
  type SortOrder,
  type Task,
  type TaskBoard,
  type TaskComment,
  type TaskInput,
  type TaskListItem,
  type TaskMilestoneRef,
  type TaskMove,
  type TaskSort,
  type TaskStatus,
  type TaskSummary,
  type TaskUpdate,
  type WorkPriority,
} from '@iaa/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from './api-client';

const PATH = '/admin/tasks';

/** Prefix for every task query, so one invalidation refreshes lists, the board and open tasks. */
export const TASKS_QUERY_KEY = ['tasks'] as const;

/**
 * Project progress counts done tasks (plan §2), so every task write also
 * refreshes the projects module's cached pages.
 */
const PROJECTS_QUERY_KEY = ['projects'] as const;

/**
 * The filters the list, the board and My tasks share, as the API reads them
 * (`taskListQuerySchema`). Absent means "any".
 */
export interface TaskFilterParams {
  q?: string;
  status?: TaskStatus[];
  priority?: WorkPriority;
  /** A person's id, `me`, or `none` for unassigned work. */
  assigneeId?: string;
  /** A project's id, or `none` for work outside any project. */
  projectId?: string;
  due?: DueBucket;
  /** The caller's own day; filled in with the device's date when a due bucket is asked for. */
  today?: string;
  label?: string;
  includeDone?: boolean;
  includeArchived?: boolean;
}

export interface TaskListParams extends TaskFilterParams {
  sort?: TaskSort;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
}

const setIf = (search: URLSearchParams, key: string, value: string | undefined): void => {
  if (value) search.set(key, value);
};

/**
 * The query string for a set of filters. Due buckets always carry `today`
 * from this device, because "due today" means the reader's today, not the
 * server's UTC one (plan D6).
 */
export const taskQueryString = (params: TaskListParams): string => {
  const search = new URLSearchParams();
  setIf(search, 'q', params.q?.trim());
  if (params.status && params.status.length > 0) search.set('status', params.status.join(','));
  setIf(search, 'priority', params.priority);
  setIf(search, 'assigneeId', params.assigneeId);
  setIf(search, 'projectId', params.projectId);
  setIf(search, 'due', params.due);
  if (params.due) search.set('today', params.today ?? localDateKey());
  setIf(search, 'label', params.label?.trim());
  if (params.includeDone) search.set('includeDone', 'true');
  if (params.includeArchived) search.set('includeArchived', 'true');
  setIf(search, 'sort', params.sort);
  setIf(search, 'order', params.order);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  return search.toString();
};

const withQuery = (path: string, query: string): string => (query ? `${path}?${query}` : path);

/**
 * The cache key for one task. Keys are matched in any case, so `iaa-42` and
 * `IAA-42` share an entry; ids are kept as they are.
 */
export const taskDetailKey = (idOrKey: string): readonly unknown[] => {
  const value = idOrKey.trim();
  return [...TASKS_QUERY_KEY, 'detail', parseTaskKey(value) === null ? value : value.toUpperCase()];
};

/** Stores a task the API just returned under both its key and its id. */
const rememberTask = (client: QueryClient, task: Task): void => {
  client.setQueryData(taskDetailKey(task.key), task);
  client.setQueryData(taskDetailKey(task.id), task);
};

/** Refreshes everything a task write can change: task views and project progress. */
const refreshAfterWrite = async (client: QueryClient): Promise<void> => {
  await Promise.all([
    client.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
    client.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  ]);
};

/**
 * The caller's own open work: overdue, due today, upcoming. Drives the Tasks
 * badge in the sidebar and, later, the dashboard.
 *
 * "Today" is the device's calendar day, sent with every request rather than
 * left to the server, whose clock is UTC. It is worked out when the request is
 * made, so a console left open overnight moves on to the new day at its next
 * refresh.
 *
 * Polled like the submissions badge: the app otherwise never refetches on its
 * own, and a badge that only updates on reload does not do its job.
 */
export const useTaskSummary = (enabled = true): UseQueryResult<TaskSummary> =>
  useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'summary'],
    enabled,
    queryFn: () => api.get<TaskSummary>(`${PATH}/summary?today=${localDateKey()}`),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

/** One page of tasks, filtered and sorted by the API. */
export const useTasks = (
  params: TaskListParams,
  enabled = true,
): UseQueryResult<Paginated<TaskListItem>> => {
  const query = taskQueryString(params);
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'list', query],
    queryFn: () => api.get<Paginated<TaskListItem>>(withQuery(PATH, query)),
    enabled,
    // The current page stays on screen while the next loads, so paging and
    // filtering do not blank the list.
    placeholderData: keepPreviousData,
  });
};

/** The board: every column in order, each with its first cards and its total. */
export const useTaskBoard = (
  filters: TaskFilterParams,
  enabled = true,
): UseQueryResult<TaskBoard> => {
  const query = taskQueryString(filters);
  return useQuery({
    queryKey: taskBoardKey(query),
    queryFn: () => api.get<TaskBoard>(withQuery(`${PATH}/board`, query)),
    enabled,
    placeholderData: keepPreviousData,
  });
};

/** The cache key of one board view; exported for the optimistic move. */
export const taskBoardKey = (query: string): readonly unknown[] => [
  ...TASKS_QUERY_KEY,
  'board',
  query,
];

/** One task in full, by key (as in `?task=IAA-42`) or by id. */
export const useTask = (idOrKey: string | null | undefined): UseQueryResult<Task> =>
  useQuery({
    queryKey: taskDetailKey(idOrKey ?? ''),
    queryFn: () => api.get<Task>(`${PATH}/${encodeURIComponent(idOrKey ?? '')}`),
    enabled: Boolean(idOrKey),
  });

/** A new task. The answer is cached under its key and id, so opening it straight away needs no request. */
export const useCreateTask = (): UseMutationResult<Task, Error, Partial<TaskInput>> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.post<Task>(PATH, input),
    onSuccess: async (task) => {
      rememberTask(client, task);
      await refreshAfterWrite(client);
    },
  });
};

/** One edit: the task's id and only the fields that change. */
export interface TaskPatch {
  id: string;
  patch: TaskUpdate;
}

/**
 * An edit to a task. The answer replaces the cached task at once, so the
 * drawer shows the saved value before the refetch lands.
 */
export const useUpdateTask = (): UseMutationResult<Task, Error, TaskPatch> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch<Task>(`${PATH}/${id}`, patch),
    onSuccess: async (task) => {
      rememberTask(client, task);
      await refreshAfterWrite(client);
    },
  });
};

/** A board move, with the card as the board holds it so the move can be shown before it is sent. */
export interface TaskMoveRequest extends TaskMove {
  task: Pick<TaskListItem, 'id' | 'status' | 'boardOrder'>;
}

/**
 * The board with one card moved: out of its column, into its new one at the
 * position its `boardOrder` gives it, with both column totals kept right.
 * Returns the board unchanged when the card is not on it.
 */
export const applyMove = (board: TaskBoard, move: TaskMoveRequest): TaskBoard => {
  const source = board.columns.find((column) =>
    column.items.some((item) => item.id === move.task.id),
  );
  const card = source?.items.find((item) => item.id === move.task.id);
  if (!source || !card) return board;
  const moved: TaskListItem = { ...card, status: move.status, boardOrder: move.boardOrder };
  return {
    columns: board.columns.map((column) => {
      let items = column.items.filter((item) => item.id !== card.id);
      let total = column.total;
      if (column.status === source.status) total -= 1;
      if (column.status === move.status) {
        items = [...items, moved].sort((a, b) => a.boardOrder - b.boardOrder);
        total += 1;
      }
      return { ...column, items, total };
    }),
  };
};

interface MoveContext {
  snapshots: [readonly unknown[], TaskBoard | undefined][];
}

/**
 * A board move, shown at once and sent as an absolute, idempotent
 * `PATCH /:id/move` (plan D13). Every cached board is updated before the
 * request; if the server refuses, each is put back exactly as it was and the
 * error reaches the caller for its message.
 */
export const useMoveTask = (): UseMutationResult<Task, Error, TaskMoveRequest, MoveContext> => {
  const client = useQueryClient();
  const boards = { queryKey: [...TASKS_QUERY_KEY, 'board'] };
  return useMutation({
    mutationFn: ({ task, status, boardOrder }) =>
      api.patch<Task>(`${PATH}/${task.id}/move`, { status, boardOrder }),
    onMutate: async (move) => {
      // A board refetch landing mid-move would redraw the card where it was.
      await client.cancelQueries(boards);
      const snapshots = client.getQueriesData<TaskBoard>(boards);
      client.setQueriesData<TaskBoard>(boards, (board) => (board ? applyMove(board, move) : board));
      return { snapshots };
    },
    onError: (_error, _move, context) => {
      for (const [key, board] of context?.snapshots ?? []) client.setQueryData(key, board);
    },
    onSuccess: (task) => rememberTask(client, task),
    onSettled: () => refreshAfterWrite(client),
  });
};

/** Archives or restores a task: out of every list and the board, or back into them. */
export const useArchiveTask = (): UseMutationResult<
  Task,
  Error,
  { id: string; archived: boolean }
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }) => api.patch<Task>(`${PATH}/${id}/archive`, { archived }),
    onSuccess: async (task) => {
      rememberTask(client, task);
      await refreshAfterWrite(client);
    },
  });
};

/** Deletes a task for good, with its comments. Only with `tasks:delete`. */
export const useDeleteTask = (): UseMutationResult<void, Error, Pick<Task, 'id' | 'key'>> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api.delete<void>(`${PATH}/${id}`),
    onSuccess: async (_result, task) => {
      // Dropped rather than refetched: the refetch would only answer 404.
      client.removeQueries({ queryKey: taskDetailKey(task.key) });
      client.removeQueries({ queryKey: taskDetailKey(task.id) });
      await refreshAfterWrite(client);
    },
  });
};

/** A mutation on part of a task that answers with the whole task. */
const useTaskPartMutation = <Variables>(
  request: (variables: Variables) => Promise<Task>,
): UseMutationResult<Task, Error, Variables> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: async (task) => {
      rememberTask(client, task);
      await refreshAfterWrite(client);
    },
  });
};

/** Adds a line to a task's checklist; the API gives it its id. */
export const useAddChecklistItem = (): UseMutationResult<
  Task,
  Error,
  { taskId: string; text: string }
> =>
  useTaskPartMutation(({ taskId, text }) =>
    api.post<Task>(`${PATH}/${taskId}/checklist`, { text }),
  );

/** Ticks, unticks or rewords one checklist line, on its own so parallel ticks never clash. */
export const useUpdateChecklistItem = (): UseMutationResult<
  Task,
  Error,
  { taskId: string; itemId: string; patch: ChecklistItemPatch }
> =>
  useTaskPartMutation(({ taskId, itemId, patch }) =>
    api.patch<Task>(`${PATH}/${taskId}/checklist/${itemId}`, patch),
  );

/** Removes one checklist line. Safe to retry: a line already gone counts as removed. */
export const useRemoveChecklistItem = (): UseMutationResult<
  Task,
  Error,
  { taskId: string; itemId: string }
> =>
  useTaskPartMutation(({ taskId, itemId }) =>
    api.delete<Task>(`${PATH}/${taskId}/checklist/${itemId}`),
  );

/** Attaches an uploaded document to a task. */
export const useAddTaskAttachment = (): UseMutationResult<
  Task,
  Error,
  { taskId: string; input: FileAttachmentInput }
> =>
  useTaskPartMutation(({ taskId, input }) =>
    api.post<Task>(`${PATH}/${taskId}/attachments`, input),
  );

/** Takes a document off a task. */
export const useRemoveTaskAttachment = (): UseMutationResult<
  Task,
  Error,
  { taskId: string; attachmentId: string }
> =>
  useTaskPartMutation(({ taskId, attachmentId }) =>
    api.delete<Task>(`${PATH}/${taskId}/attachments/${attachmentId}`),
  );

/** Comments per page. A long thread pages rather than growing the drawer for ever. */
export const TASK_COMMENTS_PAGE_SIZE = 20;

/** One page of a task's comments, oldest first. */
export const useTaskComments = (
  taskId: string | null | undefined,
  page: number,
): UseQueryResult<Paginated<TaskComment>> =>
  useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'comments', taskId, page],
    queryFn: () =>
      api.get<Paginated<TaskComment>>(
        `${PATH}/${taskId}/comments?page=${page}&pageSize=${TASK_COMMENTS_PAGE_SIZE}`,
      ),
    enabled: Boolean(taskId),
    placeholderData: keepPreviousData,
  });

const useCommentMutation = <Variables, Result>(
  request: (variables: Variables) => Promise<Result>,
): UseMutationResult<Result, Error, Variables> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    // The comment count on the task and its activity both change.
    onSuccess: () => refreshAfterWrite(client),
  });
};

/** Posts a comment; mention tokens in the body are resolved by the API. */
export const useCreateTaskComment = (): UseMutationResult<
  TaskComment,
  Error,
  { taskId: string; body: string }
> =>
  useCommentMutation(({ taskId, body }) =>
    api.post<TaskComment>(`${PATH}/${taskId}/comments`, { body }),
  );

/** Edits your own comment. */
export const useUpdateTaskComment = (): UseMutationResult<
  TaskComment,
  Error,
  { taskId: string; commentId: string; body: string }
> =>
  useCommentMutation(({ taskId, commentId, body }) =>
    api.patch<TaskComment>(`${PATH}/${taskId}/comments/${commentId}`, { body }),
  );

/** Deletes a comment: your own, or anyone's for an administrator. */
export const useDeleteTaskComment = (): UseMutationResult<
  void,
  Error,
  { taskId: string; commentId: string }
> =>
  useCommentMutation(({ taskId, commentId }) =>
    api.delete<void>(`${PATH}/${taskId}/comments/${commentId}`),
  );

// The task and project lists take at most 80 characters of search text; a
// longer paste is cut to that rather than turning the picker into an error.
const PICKER_SEARCH_MAX = 80;

/** Tasks offered in a picker (a parent, dependencies) as someone types. */
export const useTaskOptions = (
  q: string,
  enabled = true,
): UseQueryResult<Paginated<TaskListItem>> => {
  const query = taskQueryString({
    q: q.trim().slice(0, PICKER_SEARCH_MAX),
    includeDone: true,
    sort: 'updated',
    pageSize: 20,
  });
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'options', query],
    queryFn: () => api.get<Paginated<TaskListItem>>(withQuery(PATH, query)),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

/** Projects offered in a picker as someone types: the first 20 that match. */
export const useProjectOptions = (
  q: string,
  enabled = true,
): UseQueryResult<Paginated<ProjectListItem>> => {
  const search = new URLSearchParams({ pageSize: '20', sort: 'title' });
  const term = q.trim().slice(0, PICKER_SEARCH_MAX);
  if (term) search.set('q', term);
  return useQuery({
    // Under the tasks prefix: the projects module owns the shape of its own
    // cache entries, and a picker must not write into them.
    queryKey: [...TASKS_QUERY_KEY, 'project-options', term],
    queryFn: () => api.get<Paginated<ProjectListItem>>(`/admin/projects?${search.toString()}`),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
};

/** A project as the task forms need it: its name for the picker and its milestones. */
export interface TaskProjectInfo {
  id: string;
  title: string;
  slug: string;
  milestones: TaskMilestoneRef[];
}

/** The chosen project's name and milestones, for the milestone choice. */
export const useTaskProject = (
  projectId: string | null | undefined,
): UseQueryResult<TaskProjectInfo> =>
  useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'project', projectId],
    queryFn: async () => {
      const project = await api.get<Project>(`/admin/projects/${projectId}`);
      return {
        id: project.id,
        title: project.title,
        slug: project.slug,
        milestones: project.milestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
        })),
      };
    },
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

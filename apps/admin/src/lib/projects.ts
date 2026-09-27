import type {
  FileAttachment,
  FileAttachmentInput,
  Paginated,
  Project,
  ProjectInput,
  ProjectListItem,
  ProjectMediaInput,
  ProjectMediaItem,
  ProjectMediaUpdate,
  ProjectSort,
  ProjectStatus,
  ProjectUpdate,
  WorkPriority,
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

const PATH = '/admin/projects';

/** Prefix for every project query, so one invalidation refreshes lists and pages alike. */
export const PROJECTS_QUERY_KEY = ['projects'] as const;

/** The three views of the list, chosen by the tabs on the Projects page. */
export const PROJECT_VIEWS = ['all', 'mine', 'archived'] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

/** What the Projects page asks for. Empty strings mean "any". */
export interface ProjectListParams {
  view: ProjectView;
  q?: string;
  status?: ProjectStatus | '';
  priority?: WorkPriority | '';
  programme?: string;
  sort?: ProjectSort;
  page: number;
  pageSize?: number;
}

/** Projects per page. A page of cards stays short enough to scan on a phone. */
export const PROJECT_PAGE_SIZE = 12;

/**
 * The API address for one page of the list. "My projects" is the `mine`
 * filter; "Archived" is the archived status; "All" leaves archived out,
 * which is also the API's default.
 */
export const projectListPath = (params: ProjectListParams): string => {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize ?? PROJECT_PAGE_SIZE),
    sort: params.sort ?? 'updated',
  });
  const q = params.q?.trim();
  if (q) search.set('q', q);
  if (params.view === 'mine') search.set('mine', 'true');
  if (params.view === 'archived') search.set('status', 'archived');
  else if (params.status) search.set('status', params.status);
  if (params.priority) search.set('priority', params.priority);
  if (params.programme) search.set('programme', params.programme);
  return `${PATH}?${search.toString()}`;
};

/** One page of projects, with progress and task counts worked out by the API. */
export const useProjects = (
  params: ProjectListParams,
): UseQueryResult<Paginated<ProjectListItem>> =>
  useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, 'list', params],
    queryFn: () => api.get<Paginated<ProjectListItem>>(projectListPath(params)),
    // Keeps the current page on screen while the next one loads, so paging
    // and filtering do not flash the skeleton.
    placeholderData: keepPreviousData,
  });

/**
 * How many projects are active, for the dashboard's "Your work" panel. One row
 * is asked for and only the total is kept. Under the projects prefix, so any
 * project change refreshes it.
 */
export const useActiveProjectCount = (enabled = true): UseQueryResult<number> =>
  useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, 'count', 'active'],
    queryFn: async () => {
      const page = await api.get<Paginated<ProjectListItem>>(
        projectListPath({ view: 'all', status: 'active', page: 1, pageSize: 1 }),
      );
      return page.total;
    },
    enabled,
    staleTime: 30_000,
  });

/** The key of one project's detail, for reading and replacing it in the cache. */
export const projectKey = (id: string): readonly unknown[] => [...PROJECTS_QUERY_KEY, 'detail', id];

/** One project with everything its pages show. */
export const useProject = (id: string | undefined): UseQueryResult<Project> =>
  useQuery({
    queryKey: projectKey(id ?? ''),
    queryFn: () => api.get<Project>(`${PATH}/${encodeURIComponent(id ?? '')}`),
    enabled: Boolean(id),
  });

/**
 * After any change: the saved project replaces the cached one at once, and
 * every other project query (lists, counts) is marked stale by prefix.
 */
const settle = (client: QueryClient, project?: Project): Promise<void> => {
  if (project) client.setQueryData(projectKey(project.id), project);
  return client.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
};

/** Creates a project and returns it as saved. */
export const useCreateProject = (): UseMutationResult<Project, Error, ProjectInput> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post<Project>(PATH, body),
    onSuccess: (project) => settle(client, project),
  });
};

export interface ProjectPatch {
  id: string;
  body: ProjectUpdate;
}

/**
 * Saves part of a project: the editor's fields, a status move, or one of the
 * plans the tabs edit (milestones, metrics, risks, a progress figure). Lists
 * inside the body replace the stored ones whole.
 */
export const useUpdateProject = (): UseMutationResult<Project, Error, ProjectPatch> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.patch<Project>(`${PATH}/${encodeURIComponent(id)}`, body),
    onSuccess: (project) => settle(client, project),
  });
};

/**
 * Moves a project to another status. Archiving is a status too, so Archive
 * and Restore go through here.
 */
export const useChangeProjectStatus = (): UseMutationResult<
  Project,
  Error,
  { id: string; status: ProjectStatus }
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) =>
      api.patch<Project>(`${PATH}/${encodeURIComponent(id)}`, { status }),
    onSuccess: (project) => settle(client, project),
  });
};

/** Deletes a project. The API refuses (409) while tasks or stories point at it. */
export const useDeleteProject = (): UseMutationResult<void, Error, string> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete<void>(`${PATH}/${encodeURIComponent(id)}`),
    onSuccess: (_result, id) => {
      client.removeQueries({ queryKey: projectKey(id) });
      return client.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
};

// Evidence changes one list inside the project, so the project is refetched
// rather than patched in the cache by hand. The activity log and the list's
// "updated" order move too, hence the whole prefix.
const refetchProjects = (client: QueryClient): Promise<void> =>
  client.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });

/** Adds a photo to a project's evidence. */
export const useAddProjectMedia = (
  projectId: string,
): UseMutationResult<ProjectMediaItem, Error, ProjectMediaInput> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api.post<ProjectMediaItem>(`${PATH}/${encodeURIComponent(projectId)}/media`, body),
    onSuccess: () => refetchProjects(client),
  });
};

/** Edits a photo's caption, date or consent. */
export const useUpdateProjectMedia = (
  projectId: string,
): UseMutationResult<ProjectMediaItem, Error, { itemId: string; body: ProjectMediaUpdate }> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }) =>
      api.patch<ProjectMediaItem>(
        `${PATH}/${encodeURIComponent(projectId)}/media/${encodeURIComponent(itemId)}`,
        body,
      ),
    onSuccess: () => refetchProjects(client),
  });
};

/** Removes a photo from a project's evidence. */
export const useRemoveProjectMedia = (
  projectId: string,
): UseMutationResult<void, Error, string> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itemId) =>
      api.delete<void>(
        `${PATH}/${encodeURIComponent(projectId)}/media/${encodeURIComponent(itemId)}`,
      ),
    onSuccess: () => refetchProjects(client),
  });
};

/** Attaches a document to a project. */
export const useAddProjectDocument = (
  projectId: string,
): UseMutationResult<FileAttachment, Error, FileAttachmentInput> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api.post<FileAttachment>(`${PATH}/${encodeURIComponent(projectId)}/documents`, body),
    onSuccess: () => refetchProjects(client),
  });
};

/** Removes a document from a project. */
export const useRemoveProjectDocument = (
  projectId: string,
): UseMutationResult<void, Error, string> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (documentId) =>
      api.delete<void>(
        `${PATH}/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`,
      ),
    onSuccess: () => refetchProjects(client),
  });
};

/** The activity endpoint and query key the Activity tab hands to `ActivityTimeline`. */
export const projectActivity = (
  id: string,
): { endpoint: string; queryKey: readonly unknown[] } => ({
  endpoint: `${PATH}/${encodeURIComponent(id)}/activity`,
  queryKey: [...PROJECTS_QUERY_KEY, 'activity', id],
});

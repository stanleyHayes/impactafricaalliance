import {
  canTransitionImpactStory,
  IMPACT_STORY_TRANSITIONS,
  type ImpactStory,
  type ImpactStoryInput,
  type ImpactStoryListItem,
  type ImpactStoryStatus,
  type ImpactStoryUpdate,
  type ImpactStoryView,
  type Paginated,
  type PreviewLink,
  type ProjectListItem,
} from '@iaa/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from './api-client';
import { PROJECTS_QUERY_KEY } from './projects';

const PATH = '/admin/impact-stories';

/** Prefix for every impact story query, so one invalidation refreshes them all. */
export const IMPACT_STORIES_QUERY_KEY = ['impact-stories'] as const;

/**
 * Refresh the stories, and the projects too: a project shows how many stories
 * it has, and creating, relinking or deleting a story changes that count.
 */
const refreshStoriesAndProjects = async (
  client: ReturnType<typeof useQueryClient>,
): Promise<void> => {
  await Promise.all([
    client.invalidateQueries({ queryKey: IMPACT_STORIES_QUERY_KEY }),
    client.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  ]);
};

/** Stories on one page of the dashboard list. A grid of cards reads best in twelves. */
export const IMPACT_STORY_PAGE_SIZE = 12;

export interface ImpactStoryListParams {
  view: ImpactStoryView;
  q?: string;
  programme?: string;
  projectId?: string;
  page: number;
  pageSize?: number;
}

const listSearch = (params: ImpactStoryListParams): string => {
  const search = new URLSearchParams({
    view: params.view,
    page: String(params.page),
    pageSize: String(params.pageSize ?? IMPACT_STORY_PAGE_SIZE),
  });
  const q = params.q?.trim();
  if (q) search.set('q', q);
  if (params.programme) search.set('programme', params.programme);
  if (params.projectId) search.set('projectId', params.projectId);
  return search.toString();
};

/**
 * One page of stories for a dashboard tab, filtered and paged by the API.
 * The previous page stays on screen while the next loads, so the grid does
 * not collapse to a skeleton on every page change or keystroke.
 */
export const useImpactStories = (
  params: ImpactStoryListParams,
): UseQueryResult<Paginated<ImpactStoryListItem>> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_QUERY_KEY, 'list', params],
    queryFn: () => api.get<Paginated<ImpactStoryListItem>>(`${PATH}?${listSearch(params)}`),
    placeholderData: keepPreviousData,
  });

/**
 * How many stories are waiting for an administrator to publish them, for the
 * dashboard's "Your work" panel. One row is asked for and only the total is
 * kept; any story change refreshes it through the shared prefix.
 */
export const useStoriesInReviewCount = (enabled = true): UseQueryResult<number> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_QUERY_KEY, 'count', 'in-review'],
    queryFn: async () => {
      const search = new URLSearchParams({
        view: 'drafts',
        status: 'in-review',
        page: '1',
        pageSize: '1',
      });
      const page = await api.get<Paginated<ImpactStoryListItem>>(`${PATH}?${search.toString()}`);
      return page.total;
    },
    enabled,
    staleTime: 30_000,
  });

/**
 * Every story written from one project, in any status, for the project's
 * Impact tab. A project rarely has more than a handful, so one page of 50 is
 * the whole list.
 */
export const useProjectImpactStories = (
  projectId: string,
  enabled = true,
): UseQueryResult<Paginated<ImpactStoryListItem>> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_QUERY_KEY, 'project', projectId],
    queryFn: () =>
      api.get<Paginated<ImpactStoryListItem>>(
        `${PATH}?${listSearch({ view: 'all', projectId, page: 1, pageSize: 50 })}`,
      ),
    enabled: enabled && Boolean(projectId),
  });

/** One story for the editor. */
export const useImpactStory = (id: string | undefined): UseQueryResult<ImpactStory> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_QUERY_KEY, 'detail', id],
    queryFn: () => api.get<ImpactStory>(`${PATH}/${id ?? ''}`),
    enabled: Boolean(id),
  });

export interface SaveImpactStoryVariables {
  /** Absent for a new story. */
  id?: string;
  body: ImpactStoryInput | ImpactStoryUpdate;
}

/** Create a story (POST) or save an edit (PATCH). */
export const useSaveImpactStory = (): UseMutationResult<
  ImpactStory,
  Error,
  SaveImpactStoryVariables
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      id ? api.patch<ImpactStory>(`${PATH}/${id}`, body) : api.post<ImpactStory>(PATH, body),
    onSuccess: () => refreshStoriesAndProjects(client),
  });
};

export interface StoryStatusVariables {
  id: string;
  status: ImpactStoryStatus;
}

/** Submit for review, publish, unpublish, archive or restore. */
export const useChangeImpactStoryStatus = (): UseMutationResult<
  ImpactStory,
  Error,
  StoryStatusVariables
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch<ImpactStory>(`${PATH}/${id}/status`, { status }),
    onSuccess: () => client.invalidateQueries({ queryKey: IMPACT_STORIES_QUERY_KEY }),
  });
};

/** Delete a story that was never published. */
export const useDeleteImpactStory = (): UseMutationResult<void, Error, string> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete<void>(`${PATH}/${id}`),
    onSuccess: () => refreshStoriesAndProjects(client),
  });
};

/** A two-hour link to the story on the real website, for checking it before it goes live. */
export const useImpactStoryPreviewLink = (): UseMutationResult<PreviewLink, Error, string> =>
  useMutation({ mutationFn: (id) => api.post<PreviewLink>(`${PATH}/${id}/preview`, {}) });

/** A new draft copied from a project. */
export const useCreateStoryFromProject = (): UseMutationResult<ImpactStory, Error, string> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (projectId) =>
      api.post<ImpactStory>(`${PATH}/from-project/${encodeURIComponent(projectId)}`, {}),
    onSuccess: () => refreshStoriesAndProjects(client),
  });
};

/**
 * Projects matching `q`, for the editor's project picker. Kept under the
 * stories key: it is this page's view of the projects list, and a project
 * edit elsewhere has no reason to refresh it.
 */
export const useStoryProjectSearch = (
  q: string,
  enabled = true,
): UseQueryResult<Paginated<ProjectListItem>> => {
  // The projects list takes at most 80 characters of search text; a longer
  // paste is cut to that rather than turning the picker into an error.
  const term = q.trim().slice(0, 80);
  return useQuery({
    queryKey: [...IMPACT_STORIES_QUERY_KEY, 'project-search', term],
    queryFn: () => {
      // Archived projects are included: a story is often written after the
      // work is finished and filed away.
      const search = new URLSearchParams({ pageSize: '20', includeArchived: 'true' });
      if (term) search.set('q', term);
      return api.get<Paginated<ProjectListItem>>(`/admin/projects?${search.toString()}`);
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
};

/** A status move offered as a button, in the words the person reads. */
export interface StoryStatusAction {
  to: ImpactStoryStatus;
  label: string;
  /**
   * Whether the move is confirmed first: anything that changes what the
   * public sees, and archiving, which takes a story out of the working lists.
   */
  confirm: boolean;
}

const ACTION_LABELS: Partial<Record<`${ImpactStoryStatus}>${ImpactStoryStatus}`, string>> = {
  'draft>in-review': 'Submit for review',
  'in-review>draft': 'Return to draft',
  'draft>published': 'Publish',
  'in-review>published': 'Publish',
  'published>draft': 'Unpublish',
  'draft>archived': 'Archive',
  'in-review>archived': 'Archive',
  'published>archived': 'Archive',
  'archived>draft': 'Restore as draft',
};

/**
 * The moves this person may make from a story's current status, in the order
 * they are offered. The same rule the API applies (`canTransitionImpactStory`),
 * so a button is never shown only to be refused; the API still checks.
 */
export const storyStatusActions = (
  status: ImpactStoryStatus,
  { isAdmin }: { isAdmin: boolean },
): StoryStatusAction[] =>
  IMPACT_STORY_TRANSITIONS[status]
    .filter((to) => canTransitionImpactStory(status, to, { isAdmin }))
    .map((to) => ({
      to,
      label: ACTION_LABELS[`${status}>${to}`] ?? to,
      confirm: to === 'published' || to === 'archived' || status === 'published',
    }));

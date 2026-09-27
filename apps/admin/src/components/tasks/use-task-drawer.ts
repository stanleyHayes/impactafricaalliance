import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/** The search parameter that opens the task drawer: `?task=IAA-42`. */
export const TASK_PARAM = 'task';

/** Page parameters that belong to the drawer's contents and go when it closes. */
const DRAWER_PAGE_PARAMS = ['commentsPage', 'activityPage'] as const;

/**
 * The pages that host the drawer: My tasks, All tasks, the board, and a
 * project's Tasks tab. Anywhere else, "open a task" goes to its own page.
 */
export const hostsTaskDrawer = (pathname: string): boolean =>
  /^\/tasks\/?$/.test(pathname) ||
  /^\/tasks\/(all|board)\/?$/.test(pathname) ||
  /^\/projects\/[^/]+\/tasks\/?$/.test(pathname);

export interface TaskDrawerControls {
  /** The key in the address, or null when the drawer is closed. */
  taskKey: string | null;
  open: (key: string) => void;
  close: () => void;
}

/**
 * The drawer's open task, held in the address so a task can be linked to,
 * bookmarked and closed with Back, and so the list behind it keeps its
 * filters and page.
 */
export const useTaskDrawer = (): TaskDrawerControls => {
  const [params, setParams] = useSearchParams();
  const taskKey = params.get(TASK_PARAM);
  const open = useCallback(
    (key: string) =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set(TASK_PARAM, key);
        for (const param of DRAWER_PAGE_PARAMS) next.delete(param);
        return next;
      }),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.delete(TASK_PARAM);
        for (const param of DRAWER_PAGE_PARAMS) next.delete(param);
        return next;
      }),
    [setParams],
  );
  return { taskKey, open, close };
};

/**
 * Opens a task from anywhere: in the drawer on a page that hosts one,
 * otherwise on the task's own page.
 */
export const useOpenTask = (): ((key: string) => void) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { open } = useTaskDrawer();
  return useCallback(
    (key: string) => {
      if (hostsTaskDrawer(location.pathname)) open(key);
      else navigate(`/tasks/${key}`);
    },
    [location.pathname, navigate, open],
  );
};

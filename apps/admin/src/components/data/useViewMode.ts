import { useCallback, useState } from 'react';

export type ViewMode = 'table' | 'grid';

const storageKey = (pageKey: string): string => `iaa.admin.view.${pageKey}`;

const readStored = (pageKey: string): ViewMode => {
  try {
    return window.localStorage.getItem(storageKey(pageKey)) === 'grid' ? 'grid' : 'table';
  } catch {
    // localStorage unavailable (private mode / SSR) — fall back to the table view.
    return 'table';
  }
};

/**
 * Table/grid view preference for an admin list page, persisted per page in
 * localStorage so the choice survives reloads.
 */
export const useViewMode = (pageKey: string): [ViewMode, (mode: ViewMode) => void] => {
  const [mode, setModeState] = useState<ViewMode>(() => readStored(pageKey));

  const setMode = useCallback(
    (next: ViewMode) => {
      setModeState(next);
      try {
        window.localStorage.setItem(storageKey(pageKey), next);
      } catch {
        // Ignore persistence failures; the in-memory state still updates.
      }
    },
    [pageKey],
  );

  return [mode, setMode];
};

import { useCallback, useState } from 'react';

/**
 * Unsent text on a task, kept while the console stays open.
 *
 * The drawer closes on Escape, on a click beside it and when another task is
 * opened, and closing it unmounts everything inside. Without this, a comment
 * half-written or a description mid-edit would be gone at the first stray
 * key. Held in memory only, never in browser storage: comments can be
 * sensitive, and a shared computer should not keep them once the tab closes.
 */
const drafts = new Map<string, string>();

export type TaskDraftPart = 'comment' | 'description';

const keyOf = (taskId: string, part: TaskDraftPart): string => `${taskId}:${part}`;

/** True when this task has unsent text for `part`, such as a description left mid-edit. */
export const hasTaskDraft = (taskId: string, part: TaskDraftPart): boolean =>
  drafts.has(keyOf(taskId, part));

export interface TaskDraft {
  value: string;
  /** Changes the text and remembers it for when the task is opened again. */
  set: (value: string) => void;
  /** Forgets the text once it is sent, saved or cancelled, and shows `value` instead. */
  clear: (value?: string) => void;
}

/**
 * Text for one part of a task that survives the drawer closing. Starts from
 * what was left unsent, or from `initial`.
 */
export const useTaskDraft = (taskId: string, part: TaskDraftPart, initial = ''): TaskDraft => {
  const key = keyOf(taskId, part);
  const [value, setValue] = useState(() => drafts.get(key) ?? initial);
  const set = useCallback(
    (next: string) => {
      setValue(next);
      drafts.set(key, next);
    },
    [key],
  );
  const clear = useCallback(
    (next = '') => {
      setValue(next);
      drafts.delete(key);
    },
    [key],
  );
  return { value, set, clear };
};

/** Forgets every draft. For tests, which share one module between cases. */
export const forgetTaskDrafts = (): void => drafts.clear();

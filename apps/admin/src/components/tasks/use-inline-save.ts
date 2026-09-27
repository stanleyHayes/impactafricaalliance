import type { Task, TaskUpdate } from '@iaa/shared';
import { useCallback, useEffect, useState } from 'react';

import { useUpdateTask } from '../../lib/tasks';

export type InlineSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface InlineSaveState {
  status: InlineSaveStatus;
  /** What the status line says: "Due date saved", or why a save failed. */
  message?: string;
}

export interface InlineSave {
  state: InlineSaveState;
  /**
   * The task as the reader should see it: the saved task with any change
   * still on its way laid over it, so a select shows the new choice at once
   * rather than snapping back until the answer arrives.
   */
  current: Task;
  /**
   * Saves one change. `what` names it for the status line, such as "Due date".
   * Resolves true once saved and false when refused, so an editor that holds
   * typed text (the title, the description) can keep it open for another go.
   * Never rejects: the status line already says what went wrong.
   */
  save: (patch: TaskUpdate, what: string) => Promise<boolean>;
}

// How long "Saved" stays before the line goes quiet again.
const SAVED_VISIBLE_MS = 2500;

/**
 * Immediate saving for the drawer's fields (plan §4.3: single values save as
 * they change, so they are not a multi-field form).
 *
 * Each change is its own PATCH carrying only that field, so two people
 * editing different fields of one task never overwrite each other. A failed
 * save drops the pending value, which puts the field back to what is stored,
 * and says what went wrong.
 */
export const useInlineSave = (task: Task): InlineSave => {
  const { mutateAsync } = useUpdateTask();
  const [pending, setPending] = useState<TaskUpdate>({});
  const [state, setState] = useState<InlineSaveState>({ status: 'idle' });

  useEffect(() => {
    if (state.status !== 'saved') return undefined;
    const timer = window.setTimeout(() => setState({ status: 'idle' }), SAVED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const save = useCallback(
    (patch: TaskUpdate, what: string): Promise<boolean> => {
      setPending((current) => ({ ...current, ...patch }));
      setState({ status: 'saving', message: `Saving ${what.toLowerCase()}…` });
      // Only this save's own values go: a second change to the same field,
      // sent while this one was on its way, stays shown until it settles.
      const clear = (): void =>
        setPending((current) => {
          const next: Record<string, unknown> = { ...current };
          for (const [key, value] of Object.entries(patch)) {
            if (next[key] === value) delete next[key];
          }
          return next as TaskUpdate;
        });
      // The promise rather than mutate's callbacks: those only fire for the
      // latest call, and two quick edits must each settle their own field.
      return mutateAsync({ id: task.id, patch })
        .then(() => {
          setState({ status: 'saved', message: `${what} saved` });
          return true;
        })
        .catch((error: unknown) => {
          setState({
            status: 'error',
            message: `${what} was not saved. ${
              error instanceof Error && error.message ? error.message : 'Please try again.'
            }`,
          });
          return false;
        })
        .finally(clear);
    },
    [task.id, mutateAsync],
  );

  return { state, current: { ...task, ...pending } as Task, save };
};

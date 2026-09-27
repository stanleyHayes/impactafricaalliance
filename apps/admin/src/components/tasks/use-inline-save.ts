import type { Task, TaskUpdate } from '@iaa/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

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

/** The fields a patch changes, each the name its queue is kept under. */
const fieldsOf = (patch: TaskUpdate): string[] => Object.keys(patch);

/**
 * Immediate saving for the drawer's fields (plan §4.3: single values save as
 * they change, so they are not a multi-field form).
 *
 * Each change is its own PATCH carrying only that field, so two people
 * editing different fields of one task never overwrite each other. A failed
 * save drops the pending value, which puts the field back to what is stored,
 * and says what went wrong.
 *
 * Saves to one field go one at a time, in the order they were made. Sent
 * side by side, the older could reach the server last (the API client retries
 * a PATCH after a pause, for one) and leave the older value stored while the
 * newer one shows. A change still waiting when a newer one to the same field
 * arrives is dropped unsent: only the newest value is worth saving.
 */
export const useInlineSave = (task: Task): InlineSave => {
  const { mutateAsync } = useUpdateTask();
  const [pending, setPending] = useState<TaskUpdate>({});
  const [state, setState] = useState<InlineSaveState>({ status: 'idle' });
  // Per field: the save last queued, settled or not, for the next to follow.
  const queues = useRef(new Map<string, Promise<unknown>>());
  // Per field: the number of the newest save, so an older one can tell it is stale.
  const latest = useRef(new Map<string, number>());
  const sequence = useRef(0);

  useEffect(() => {
    if (state.status !== 'saved') return undefined;
    const timer = window.setTimeout(() => setState({ status: 'idle' }), SAVED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const save = useCallback(
    (patch: TaskUpdate, what: string): Promise<boolean> => {
      sequence.current += 1;
      const mine = sequence.current;
      const fields = fieldsOf(patch);
      const isNewest = (field: string): boolean => latest.current.get(field) === mine;
      for (const field of fields) latest.current.set(field, mine);
      const saying = (): void =>
        setState({ status: 'saving', message: `Saving ${what.toLowerCase()}…` });
      setPending((current) => ({ ...current, ...patch }));
      saying();
      // Only this save's own values go, and only while it is the newest for
      // its field: a later change, sent or waiting, stays shown until it settles.
      const clear = (): void =>
        setPending((current) => {
          const next: Record<string, unknown> = { ...current };
          for (const field of fields) {
            if (isNewest(field)) delete next[field];
          }
          return next as TaskUpdate;
        });
      // The promise rather than mutate's callbacks: those only fire for the
      // latest call, and two quick edits must each settle their own field.
      const send = (): Promise<boolean> => {
        // Said again when a queued save starts, after the one before said "saved".
        saying();
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
      };
      const waiting = fields.flatMap((field) => queues.current.get(field) ?? []);
      // Nothing on its way for these fields: sent at once. Otherwise after the
      // save before it, unless a newer change has since replaced it.
      const run =
        waiting.length === 0
          ? send()
          : Promise.all(waiting).then(() => (fields.some(isNewest) ? send() : true));
      for (const field of fields) queues.current.set(field, run);
      void run.then(() => {
        for (const field of fields) {
          if (queues.current.get(field) === run) queues.current.delete(field);
        }
      });
      return run;
    },
    [task.id, mutateAsync],
  );

  return { state, current: { ...task, ...pending } as Task, save };
};

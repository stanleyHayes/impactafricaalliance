import { useState, useSyncExternalStore } from 'react';

/** What each field objects to, by name; a field with nothing to say is absent. */
export type FieldProblems = Readonly<Record<string, string>>;

export interface FieldProblemsStore {
  /** Called by a field with its problem, or null once it has none. */
  report: (name: string, problem: string | null) => void;
  /** The problems as reported, which Continue and Save decide by. */
  current: () => FieldProblems;
  /** Called back after every change, for whatever shows them. */
  subscribe: (listener: () => void) => () => void;
}

export const createFieldProblems = (): FieldProblemsStore => {
  let problems: FieldProblems = {};
  const listeners = new Set<() => void>();
  return {
    report: (name, problem) => {
      if ((problems[name] ?? null) === problem) return;
      const next: Record<string, string> = { ...problems };
      if (problem) next[name] = problem;
      else delete next[name];
      problems = next;
      listeners.forEach((listener) => listener());
    },
    current: () => problems,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/**
 * What a resource form's date fields object to while they hold a half-typed
 * date. Such a field keeps its old value in the form, which would pass
 * validation, so the form refuses to continue or save while any is listed.
 *
 * A report re-renders nothing. The form used to keep them as its own state,
 * so each report re-rendered every field, the date picker included, a moment
 * after the key that caused it; when the next key landed first, the picker
 * lost the part just typed and emptied every other part of the date. Only a
 * component that shows the problems re-renders, through
 * `useHasFieldProblems`.
 */
export const useFieldProblems = (): FieldProblemsStore => useState(createFieldProblems)[0];

/** Whether any field reports a problem, re-rendering only the component that asks. */
export const useHasFieldProblems = (store: FieldProblemsStore): boolean =>
  useSyncExternalStore(store.subscribe, () => Object.keys(store.current()).length > 0);

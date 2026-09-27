import type { DraftSaveInput } from '@iaa/shared';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { isTransient } from './errors';

/**
 * Where the latest autosave stands, for the status line.
 *
 * `saving.slow` turns on when a save has taken long enough that the API is
 * probably waking from sleep (Render's free plan can take about a minute), so
 * the page can say so rather than look stuck. `failed` is a refusal that
 * trying again will not fix; the next change tries afresh.
 */
export type AutosaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving'; slow: boolean }
  | { kind: 'saved'; at: Date }
  | { kind: 'retrying'; attempt: number }
  | { kind: 'offline' }
  | { kind: 'failed' };

/** Quiet time after the last change before saving (plan §5.1). */
export const AUTOSAVE_DELAY_MS = 1500;
/** How long a save runs before the status says the server may be waking. */
export const SLOW_SAVE_MS = 4000;
const MAX_RETRY_DELAY_MS = 30_000;

/** 2 s, 4 s, 8 s… up to 30 s: long enough in total to outlast a cold start. */
export const retryDelayMs = (attempt: number): number =>
  Math.min(2000 * 2 ** Math.max(0, attempt - 1), MAX_RETRY_DELAY_MS);

/** The autosave controls the flow uses. */
export interface AutosaveControls {
  /** Save this after the quiet period, replacing anything not yet sent. */
  schedule: (payload: DraftSaveInput) => void;
  /** Save now (this payload, or whatever is waiting). Resolves true once it is stored. */
  flush: (payload?: DraftSaveInput) => Promise<boolean>;
  /**
   * Drop anything waiting, stop retrying and clear the status, as when the
   * application is submitted or the draft is replaced by a new one.
   */
  cancel: () => void;
  /** Whether something the person entered has not reached the server yet. */
  hasUnsent: () => boolean;
}

export interface Autosave extends AutosaveControls {
  status: AutosaveStatus;
}

interface EngineDeps {
  save: (payload: DraftSaveInput) => Promise<void>;
  isEnabled: () => boolean;
  onStatus: Dispatch<SetStateAction<AutosaveStatus>>;
}

interface AutosaveEngine extends AutosaveControls {
  /** Send what is waiting now, as when the connection comes back. */
  resume: () => void;
  /** Report being offline if anything is waiting. */
  noteOffline: () => void;
  dispose: () => void;
}

const keyOf = (payload: DraftSaveInput): string => JSON.stringify(payload);

const isOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * The save queue itself, kept outside React so its timers and in-flight
 * request survive re-renders untouched.
 *
 * The newest payload waiting to be sent stays in memory until the server has
 * it, so a failed save loses nothing: the retry, the next change or the next
 * step change all send the latest answers. Only one save runs at a time, and
 * a change made while one is running is sent straight after it.
 */
export const createAutosaveEngine = ({ save, isEnabled, onStatus }: EngineDeps): AutosaveEngine => {
  let pending: DraftSaveInput | null = null;
  let savedKey: string | null = null;
  let inFlight: Promise<boolean> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;

  const clearDebounce = (): void => {
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  };

  const clearRetry = (): void => {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  };

  const isAlreadyStored = (key: string): boolean =>
    key === savedKey && pending === null && inFlight === null;

  const markStored = (payload: DraftSaveInput): void => {
    savedKey = keyOf(payload);
    // Compared by content: a step change can queue a copy of exactly what
    // was just sent, and sending it twice would be a wasted request.
    if (pending !== null && keyOf(pending) === savedKey) {
      pending = null;
    }
    attempts = 0;
    onStatus({ kind: 'saved', at: new Date() });
    if (pending) {
      // A newer change arrived while this one was on its way. Its own quiet
      // period is replaced, not left running: a stray timer would later send
      // a following change before the person had paused.
      clearDebounce();
      debounceTimer = setTimeout(() => void run(), 0);
    }
  };

  const markFailed = (error: unknown): void => {
    if (!isTransient(error)) {
      onStatus({ kind: 'failed' });
      return;
    }
    attempts += 1;
    onStatus({ kind: 'retrying', attempt: attempts });
    retryTimer = setTimeout(() => void run(), retryDelayMs(attempts));
  };

  const send = async (payload: DraftSaveInput): Promise<boolean> => {
    onStatus({ kind: 'saving', slow: false });
    const slowTimer = setTimeout(
      () =>
        onStatus((current) =>
          current.kind === 'saving' ? { kind: 'saving', slow: true } : current,
        ),
      SLOW_SAVE_MS,
    );
    try {
      await save(payload);
      markStored(payload);
      return true;
    } catch (error) {
      markFailed(error);
      return false;
    } finally {
      clearTimeout(slowTimer);
    }
  };

  const run = async (): Promise<boolean> => {
    clearDebounce();
    while (inFlight !== null) {
      await inFlight;
    }
    const payload = pending;
    if (!payload || !isEnabled()) {
      return true;
    }
    if (isOffline()) {
      onStatus({ kind: 'offline' });
      return false;
    }
    clearRetry();
    const attempt = send(payload);
    inFlight = attempt;
    try {
      return await attempt;
    } finally {
      if (inFlight === attempt) {
        inFlight = null;
      }
    }
  };

  return {
    schedule: (payload) => {
      if (!isEnabled() || isAlreadyStored(keyOf(payload))) {
        return;
      }
      pending = payload;
      // While a retry is waiting, it sends this newer payload when it fires.
      if (retryTimer === undefined) {
        clearDebounce();
        debounceTimer = setTimeout(() => void run(), AUTOSAVE_DELAY_MS);
      }
    },
    flush: (payload) => {
      if (!isEnabled()) {
        return Promise.resolve(true);
      }
      if (payload && !isAlreadyStored(keyOf(payload))) {
        pending = payload;
      }
      return run();
    },
    cancel: () => {
      clearDebounce();
      clearRetry();
      pending = null;
      attempts = 0;
      // A save still on its way may yet report back; until then there is
      // nothing to say about a draft that is no longer the one being saved.
      onStatus({ kind: 'idle' });
    },
    hasUnsent: () => pending !== null || inFlight !== null,
    resume: () => {
      if (pending) {
        void run();
      }
    },
    noteOffline: () => {
      if (pending) {
        onStatus({ kind: 'offline' });
      }
    },
    dispose: () => {
      clearDebounce();
      clearRetry();
      // Leaving the page within the quiet period must not drop the last
      // change: send it now rather than let the timer die with the page.
      if (pending !== null) {
        void run();
      }
    },
  };
};

interface AutosaveOptions {
  enabled: boolean;
  save: (payload: DraftSaveInput) => Promise<void>;
}

/**
 * Debounced autosave with exponential retry, for as long as `enabled` holds.
 * `save` may change between renders; the latest one is always used.
 */
export const useAutosave = ({ enabled, save }: AutosaveOptions): Autosave => {
  const [status, setStatus] = useState<AutosaveStatus>({ kind: 'idle' });
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    saveRef.current = save;
    enabledRef.current = enabled;
  }, [enabled, save]);

  const [engine] = useState(() =>
    createAutosaveEngine({
      save: (payload) => saveRef.current(payload),
      isEnabled: () => enabledRef.current,
      onStatus: setStatus,
    }),
  );

  // Back online: send what is waiting straight away rather than at the next
  // retry. Gone offline: say so, since every try would fail until then.
  useEffect(() => {
    window.addEventListener('online', engine.resume);
    window.addEventListener('offline', engine.noteOffline);
    return () => {
      window.removeEventListener('online', engine.resume);
      window.removeEventListener('offline', engine.noteOffline);
      engine.dispose();
    };
  }, [engine]);

  return useMemo(
    () => ({
      status,
      schedule: engine.schedule,
      flush: engine.flush,
      cancel: engine.cancel,
      hasUnsent: engine.hasUnsent,
    }),
    [status, engine],
  );
};

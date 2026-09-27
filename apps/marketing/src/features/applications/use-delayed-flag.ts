import { useEffect, useState } from 'react';

/** How long a wait lasts before the page explains that the server may be waking. */
export const WAKING_NOTICE_MS = 5000;

/**
 * True once `active` has stayed true for `delayMs`, false as soon as it stops.
 *
 * The API sleeps on a free plan and takes about a minute to wake. A short
 * wait needs no words; a long one does, or it looks like the page has hung.
 */
export const useDelayedFlag = (active: boolean, delayMs: number = WAKING_NOTICE_MS): boolean => {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return active && elapsed;
};

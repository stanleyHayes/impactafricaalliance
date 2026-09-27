import { useEffect, useState } from 'react';

/**
 * `value`, but only once it has stopped changing for `delayMs`.
 *
 * Search boxes that query the API use it so a colleague typing "Mensah" sends
 * one request rather than six. The API sleeps when idle and every request
 * after that waits for it to wake, so a burst of keystrokes would otherwise
 * queue up behind one another and arrive out of order.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
};

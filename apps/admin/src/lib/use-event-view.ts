import { useState } from 'react';

type EventView = 'calendar' | 'card';
const storageKey = 'iaa:admin:events:view';

export const useEventView = (): [EventView, (view: EventView) => void] => {
  const [view, setView] = useState<EventView>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === 'calendar' || saved === 'card') return saved;
    } catch {
      // Storage can be unavailable in restricted browsers.
    }
    return 'calendar';
  });
  const updateView = (next: EventView): void => {
    if (next !== 'calendar' && next !== 'card') return;
    setView(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Keep the view usable even when the preference cannot be saved.
    }
  };
  return [view, updateView];
};

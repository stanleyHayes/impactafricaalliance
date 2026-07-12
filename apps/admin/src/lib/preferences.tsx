import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** Client-only console preferences, persisted to localStorage. */
export interface Preferences {
  /** Desktop sidebar rendered as a narrow icon rail. */
  sidebarCollapsed: boolean;
  /** Show the unread count badge on the navbar notifications bell. */
  showNotificationBadge: boolean;
  /** Whether the user has completed or dismissed the initial admin tour. */
  tourCompleted: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  sidebarCollapsed: false,
  showNotificationBadge: true,
  tourCompleted: false,
};

const STORAGE_KEY = 'iaa-admin-preferences';

const loadPreferences = (): Preferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

interface PreferencesContextValue {
  prefs: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore write failures (private mode / disabled storage) — prefs stay in memory.
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(() => ({ prefs, setPreference }), [prefs, setPreference]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

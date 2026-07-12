import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { isThemePresetKey, type ThemePresetKey } from './theme';

export type ColorMode = 'light' | 'dark';

interface ThemeContextValue {
  preset: ThemePresetKey;
  setPreset: (preset: ThemePresetKey) => void;
  mode: ColorMode;
  toggleMode: () => void;
}

const MODE_STORAGE_KEY = 'iaa.admin.theme.mode';
const PRESET_STORAGE_KEY = 'iaa.admin.theme.preset';

const isColorMode = (value: unknown): value is ColorMode =>
  value === 'light' || value === 'dark';

const loadMode = (): ColorMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
  if (isColorMode(stored)) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const loadPreset = (): ThemePresetKey => {
  if (typeof window === 'undefined') return 'iaa';
  const stored = window.localStorage.getItem(PRESET_STORAGE_KEY);
  return isThemePresetKey(stored) ? stored : 'iaa';
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [mode, setMode] = useState<ColorMode>(loadMode);
  const [preset, setPresetState] = useState<ThemePresetKey>(loadPreset);

  useEffect(() => {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    document.documentElement.dataset.theme = `${preset}-${mode}`;
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode, preset]);

  useEffect(() => {
    window.localStorage.setItem(PRESET_STORAGE_KEY, preset);
    document.documentElement.dataset.theme = `${preset}-${mode}`;
  }, [preset, mode]);

  const toggleMode = useCallback((): void => {
    setMode((current) => (current === 'light' ? 'dark' : 'light'))
  }, []);

  const setPreset = useCallback((next: ThemePresetKey): void => {
    setPresetState(next);
  }, []);

  const value = useMemo(
    () => ({ mode, preset, toggleMode, setPreset }),
    [mode, preset, toggleMode, setPreset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeSettings = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeSettings must be used within a ThemeProvider');
  }
  return context;
};

/** @deprecated Use `useThemeSettings` instead. Kept for minimal migration friction. */
export const useColorMode = (): Pick<ThemeContextValue, 'mode' | 'toggleMode'> => {
  const { mode, toggleMode } = useThemeSettings();
  return { mode, toggleMode };
};

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_SKIN, isSkinKey, type SkinKey } from './skins';
import { isThemePresetKey, type ThemePresetKey } from './theme';

export type ColorMode = 'light' | 'dark';

interface ThemeContextValue {
  preset: ThemePresetKey;
  setPreset: (preset: ThemePresetKey) => void;
  mode: ColorMode;
  /** Chooses light or dark outright (the mode cards in Settings). */
  setMode: (mode: ColorMode) => void;
  /** Flips between light and dark (the top bar's toggle). */
  toggleMode: () => void;
  /** How surfaces and controls are built; independent of preset and mode. */
  skin: SkinKey;
  setSkin: (skin: SkinKey) => void;
}

const MODE_STORAGE_KEY = 'iaa.admin.theme.mode';
const PRESET_STORAGE_KEY = 'iaa.admin.theme.preset';
export const SKIN_STORAGE_KEY = 'iaa.admin.theme.skin';

const isColorMode = (value: unknown): value is ColorMode => value === 'light' || value === 'dark';

/**
 * Storage can be missing or refuse access (a private window, blocked site
 * data). A choice that cannot be read or saved falls back to the default for
 * this visit rather than breaking the console.
 */
const readStored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not saved; the choice still applies until the page is reloaded.
  }
};

const loadMode = (): ColorMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = readStored(MODE_STORAGE_KEY);
  if (isColorMode(stored)) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const loadPreset = (): ThemePresetKey => {
  if (typeof window === 'undefined') return 'iaa';
  const stored = readStored(PRESET_STORAGE_KEY);
  return isThemePresetKey(stored) ? stored : 'iaa';
};

/** A skin saved by a later version, or edited by hand, reads as Classic rather than breaking. */
const loadSkin = (): SkinKey => {
  if (typeof window === 'undefined') return DEFAULT_SKIN;
  const stored = readStored(SKIN_STORAGE_KEY);
  return isSkinKey(stored) ? stored : DEFAULT_SKIN;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [mode, setModeState] = useState<ColorMode>(loadMode);
  const [preset, setPresetState] = useState<ThemePresetKey>(loadPreset);
  const [skin, setSkinState] = useState<SkinKey>(loadSkin);

  useEffect(() => {
    writeStored(MODE_STORAGE_KEY, mode);
    document.documentElement.dataset.theme = `${preset}-${mode}`;
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode, preset]);

  useEffect(() => {
    writeStored(PRESET_STORAGE_KEY, preset);
    document.documentElement.dataset.theme = `${preset}-${mode}`;
  }, [preset, mode]);

  // The skin is also reflected on <html data-skin>, for anything outside
  // React (and for inspecting a screen) that needs to know which is active.
  useEffect(() => {
    writeStored(SKIN_STORAGE_KEY, skin);
    document.documentElement.dataset.skin = skin;
  }, [skin]);

  // Anything that is not a mode (from untyped code) leaves the mode as it is,
  // rather than being read as a choice of light.
  const setMode = useCallback((next: ColorMode): void => {
    if (isColorMode(next)) setModeState(next);
  }, []);

  const toggleMode = useCallback((): void => {
    setModeState((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const setPreset = useCallback((next: ThemePresetKey): void => {
    setPresetState(next);
  }, []);

  const setSkin = useCallback((next: SkinKey): void => {
    setSkinState(isSkinKey(next) ? next : DEFAULT_SKIN);
  }, []);

  const value = useMemo(
    () => ({ mode, preset, skin, setMode, toggleMode, setPreset, setSkin }),
    [mode, preset, skin, setMode, toggleMode, setPreset, setSkin],
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

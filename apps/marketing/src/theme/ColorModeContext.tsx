import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PaletteMode = 'light' | 'dark';

interface ColorModeContextValue {
  mode: PaletteMode;
  toggleColorMode: () => void;
  setColorMode: (mode: PaletteMode) => void;
}

const STORAGE_KEY = 'iaa.marketing.theme';

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const initialMode = (): PaletteMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return prefersDark() ? 'dark' : 'light';
};

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggleColorMode: () => {},
  setColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

interface ColorModeProviderProps {
  children: ReactNode;
}

export const ColorModeProvider = ({ children }: ColorModeProviderProps) => {
  const [mode, setMode] = useState<PaletteMode>(() => initialMode());

  const apply = useCallback((next: PaletteMode) => {
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);

  useEffect(() => {
    apply(mode);
  }, [mode, apply]);

  const toggleColorMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setColorMode = useCallback((next: PaletteMode) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setMode(next);
  }, []);

  const value = useMemo(
    () => ({ mode, toggleColorMode, setColorMode }),
    [mode, toggleColorMode, setColorMode],
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
};

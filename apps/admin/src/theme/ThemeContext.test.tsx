import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SKIN_STORAGE_KEY, ThemeProvider, useThemeSettings } from './ThemeContext';

/** Shows the context and exposes its setters, so tests read what a component would. */
let settings: ReturnType<typeof useThemeSettings> | undefined;
const Probe = (): JSX.Element => {
  settings = useThemeSettings();
  return (
    <p data-testid="probe">
      {settings.preset}-{settings.mode}-{settings.skin}
    </p>
  );
};

const renderProvider = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  // jsdom has no matchMedia; the stored mode keeps the provider from asking.
  localStorage.setItem('iaa.admin.theme.mode', 'light');
});

afterEach(() => {
  settings = undefined;
  delete document.documentElement.dataset.skin;
});

describe('theme skin setting', () => {
  it('starts on Classic when nothing is stored', () => {
    renderProvider();
    expect(screen.getByTestId('probe')).toHaveTextContent('iaa-light-classic');
    expect(document.documentElement.dataset.skin).toBe('classic');
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('classic');
  });

  it('restores a stored skin, independently of preset and mode', () => {
    localStorage.setItem(SKIN_STORAGE_KEY, 'glassmorphism');
    localStorage.setItem('iaa.admin.theme.preset', 'aura');
    localStorage.setItem('iaa.admin.theme.mode', 'dark');
    renderProvider();
    expect(screen.getByTestId('probe')).toHaveTextContent('aura-dark-glassmorphism');
    expect(document.documentElement.dataset.skin).toBe('glassmorphism');
  });

  it('falls back to Classic for a stored value it does not know', () => {
    localStorage.setItem(SKIN_STORAGE_KEY, 'brutalism');
    renderProvider();
    expect(screen.getByTestId('probe')).toHaveTextContent('iaa-light-classic');
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('classic');
  });

  it('does not treat inherited object keys as skins', () => {
    localStorage.setItem(SKIN_STORAGE_KEY, 'toString');
    renderProvider();
    expect(screen.getByTestId('probe')).toHaveTextContent('iaa-light-classic');
  });

  it('saves a new skin and reflects it on <html>', () => {
    renderProvider();
    act(() => settings?.setSkin('claymorphism'));
    expect(screen.getByTestId('probe')).toHaveTextContent('iaa-light-claymorphism');
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('claymorphism');
    expect(document.documentElement.dataset.skin).toBe('claymorphism');
  });

  it('keeps the skin when the preset or mode changes', () => {
    renderProvider();
    act(() => settings?.setSkin('neumorphism'));
    act(() => settings?.setPreset('ocean'));
    act(() => settings?.toggleMode());
    expect(screen.getByTestId('probe')).toHaveTextContent('ocean-dark-neumorphism');
  });

  it('still works when storage refuses access', () => {
    const saved = globalThis.localStorage;
    const denied = (): never => {
      throw new Error('denied');
    };
    const broken = { getItem: denied, setItem: denied } as unknown as Storage;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: broken });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    });
    try {
      renderProvider();
      expect(screen.getByTestId('probe')).toHaveTextContent('iaa-light-classic');
      act(() => settings?.setSkin('glassmorphism'));
      expect(screen.getByTestId('probe')).toHaveTextContent('iaa-light-glassmorphism');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: saved });
    }
  });
});

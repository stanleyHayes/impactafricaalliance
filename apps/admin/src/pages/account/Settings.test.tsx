import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeSelector } from '../../components/layout/ThemeSelector';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { PreferencesProvider } from '../../lib/preferences';
import { createAppTheme } from '../../theme/theme';
import { SKIN_STORAGE_KEY, ThemeProvider, useThemeSettings } from '../../theme/ThemeContext';

import Settings from './Settings';

/** What the signed-in person may do, as `resource:action`. */
const permissions = vi.hoisted(() => ({ granted: new Set<string>() }));

vi.mock('../../auth/useCan', () => ({
  useHasPermission: (action: string, resource: string): boolean =>
    permissions.granted.has(`${resource}:${action}`),
}));

/** The console's wiring: the MUI theme follows the settings, as in main.tsx. */
const Themed = ({ children }: { children: ReactNode }): JSX.Element => {
  const { preset, mode, skin } = useThemeSettings();
  return <MuiThemeProvider theme={createAppTheme(preset, mode, skin)}>{children}</MuiThemeProvider>;
};

/** The Settings page with the top bar's theme controls beside it, as in the console. */
const renderSettings = (path = '/account/settings') =>
  render(
    <ThemeProvider>
      <Themed>
        <PreferencesProvider>
          <MemoryRouter initialEntries={[path]}>
            <ThemeSelector />
            <ThemeToggle />
            <Settings />
          </MemoryRouter>
        </PreferencesProvider>
      </Themed>
    </ThemeProvider>,
  );

/** Queries inside the Appearance panel, so the popover's groups of the same names never match. */
const appearance = () => within(document.getElementById('appearance') as HTMLElement);
const group = (name: string) => appearance().getByRole('radiogroup', { name });
const option = (groupName: string, name: string | RegExp) =>
  within(group(groupName)).getByRole('radio', { name });
const checkedIn = (groupName: string) =>
  within(group(groupName)).getByRole('radio', { checked: true });
const optionNames = (groupName: string) =>
  within(group(groupName))
    .getAllByRole('radio')
    .map((radio) => radio.textContent);

const stubViewTransition = () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: false, media: query })),
  );
  const startViewTransition = vi.fn((update: () => void) => {
    update();
    return {} as ViewTransition;
  });
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: startViewTransition,
  });
  return startViewTransition;
};

beforeEach(() => {
  localStorage.clear();
  // jsdom has no matchMedia; the stored mode keeps the provider from asking.
  localStorage.setItem('iaa.admin.theme.mode', 'light');
  permissions.granted = new Set(['submissions:read']);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'startViewTransition');
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  const root = document.documentElement;
  root.classList.remove('dark');
  root.style.removeProperty('--reveal-x');
  root.style.removeProperty('--reveal-y');
  delete root.dataset.skin;
  delete root.dataset.theme;
});

describe('Settings: Appearance', () => {
  it('offers mode, theme and skin as three radio groups', () => {
    renderSettings();
    expect(appearance().getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
    expect(appearance().getByText(/The website is not affected/)).toBeInTheDocument();
    expect(optionNames('Colour mode')).toEqual([
      expect.stringMatching(/^Light/),
      expect.stringMatching(/^Dark/),
    ]);
    expect(optionNames('Console theme')).toEqual([
      expect.stringContaining('IAA'),
      expect.stringContaining('Aura'),
      expect.stringContaining('Ocean'),
      expect.stringContaining('Sunset'),
    ]);
    expect(optionNames('Console skin')).toEqual([
      expect.stringContaining('Classic'),
      expect.stringContaining('Neumorphism'),
      expect.stringContaining('Glassmorphism'),
      expect.stringContaining('Claymorphism'),
    ]);
  });

  it('checks what is in use', () => {
    localStorage.setItem('iaa.admin.theme.mode', 'dark');
    localStorage.setItem('iaa.admin.theme.preset', 'aura');
    localStorage.setItem(SKIN_STORAGE_KEY, 'claymorphism');
    renderSettings();
    expect(checkedIn('Colour mode')).toHaveTextContent('Dark');
    expect(checkedIn('Console theme')).toHaveTextContent('Aura');
    expect(checkedIn('Console skin')).toHaveTextContent('Claymorphism');
    expect(option('Colour mode', /^Light/)).not.toBeChecked();
  });

  it('switches to dark mode when Dark is chosen, and saves it', () => {
    renderSettings();
    fireEvent.click(option('Colour mode', /^Dark/));
    expect(localStorage.getItem('iaa.admin.theme.mode')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(checkedIn('Colour mode')).toHaveTextContent('Dark');
    // The top bar's toggle follows, offering the way back.
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('grows the new mode out of the card that was chosen', () => {
    const startViewTransition = stubViewTransition();
    renderSettings();
    const dark = option('Colour mode', /^Dark/);
    vi.spyOn(dark, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 300, width: 200, height: 120 }),
    );
    fireEvent.click(dark);
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(document.documentElement.style.getPropertyValue('--reveal-x')).toBe('200px');
    expect(document.documentElement.style.getPropertyValue('--reveal-y')).toBe('360px');
    expect(checkedIn('Colour mode')).toHaveTextContent('Dark');
  });

  it('leaves the mode alone when the one in use is chosen again', () => {
    const startViewTransition = stubViewTransition();
    renderSettings();
    fireEvent.click(option('Colour mode', /^Light/));
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(checkedIn('Colour mode')).toHaveTextContent('Light');
  });

  it('sets the palette when Ocean is chosen, and saves it', () => {
    renderSettings();
    fireEvent.click(option('Console theme', /Ocean/));
    expect(localStorage.getItem('iaa.admin.theme.preset')).toBe('ocean');
    expect(document.documentElement.dataset.theme).toBe('ocean-light');
    expect(checkedIn('Console theme')).toHaveTextContent('Ocean');
    // The page stays as it is: nothing closes, the other choices keep.
    expect(checkedIn('Console skin')).toHaveTextContent('Classic');
    expect(checkedIn('Colour mode')).toHaveTextContent('Light');
  });

  it('sets the skin when Glassmorphism is chosen, and saves it', () => {
    renderSettings();
    fireEvent.click(option('Console skin', /Glassmorphism/));
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('glassmorphism');
    expect(document.documentElement.dataset.skin).toBe('glassmorphism');
    expect(checkedIn('Console skin')).toHaveTextContent('Glassmorphism');
    expect(option('Console skin', /Classic/)).not.toBeChecked();
  });

  it('moves between options with the arrow keys without choosing', () => {
    renderSettings();
    const [light, dark] = within(group('Colour mode')).getAllByRole('radio');
    // Focus moves MUI's focus-visible state, which is React state.
    act(() => light?.focus());
    fireEvent.keyDown(light as HTMLElement, { key: 'ArrowRight' });
    expect(dark).toHaveFocus();
    expect(localStorage.getItem('iaa.admin.theme.mode')).toBe('light');
    const skins = within(group('Console skin')).getAllByRole('radio');
    act(() => skins[0]?.focus());
    fireEvent.keyDown(skins[0] as HTMLElement, { key: 'ArrowUp' });
    expect(skins[3]).toHaveFocus();
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('classic');
  });

  it('keeps a focused option clear of the fixed top bar, and leaves the popover alone', () => {
    renderSettings();
    // Shift+Tab and the arrow keys scroll an option to the window's top edge,
    // which is under the console's fixed top bar unless the option asks for room.
    const options = appearance().getAllByRole('radio');
    expect(options).toHaveLength(10);
    options.forEach((radio) => expect(getComputedStyle(radio).scrollMarginTop).toBe('88px'));

    // The popover scrolls itself, so its options keep no margin.
    fireEvent.click(screen.getByRole('button', { name: 'Choose theme' }));
    const popoverOptions = screen.getAllByRole('radio');
    expect(popoverOptions).toHaveLength(8);
    popoverOptions.forEach((radio) =>
      expect(parseFloat(getComputedStyle(radio).scrollMarginTop) || 0).toBe(0),
    );
  });

  it('agrees with the top bar either way round', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(checkedIn('Colour mode')).toHaveTextContent('Dark');

    // While the popover is open the page behind it is hidden, so these are its radios.
    fireEvent.click(screen.getByRole('button', { name: 'Choose theme' }));
    fireEvent.click(screen.getByRole('radio', { name: /Sunset/ }));
    expect(checkedIn('Console theme')).toHaveTextContent('Sunset');

    fireEvent.click(option('Console skin', /Neumorphism/));
    fireEvent.click(screen.getByRole('button', { name: 'Choose theme' }));
    expect(screen.getByRole('radio', { name: /Neumorphism/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Sunset/ })).toBeChecked();
  });

  it('opens at the panel when a link names it', () => {
    const scrolled: string[] = [];
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value(this: Element) {
        scrolled.push(this.id);
      },
    });
    renderSettings('/account/settings#appearance');
    expect(scrolled).toEqual(['appearance']);
  });
});

describe('Settings: workspace preferences', () => {
  it('shows the notification badge row to people who can read submissions', () => {
    renderSettings();
    expect(screen.getByLabelText('Collapse sidebar by default')).toBeInTheDocument();
    expect(screen.getByLabelText('Show notification badge')).toBeInTheDocument();
  });

  it('leaves the badge row out for people who cannot', () => {
    permissions.granted = new Set();
    renderSettings();
    expect(screen.getByLabelText('Collapse sidebar by default')).toBeInTheDocument();
    expect(screen.queryByLabelText('Show notification badge')).not.toBeInTheDocument();
  });
});

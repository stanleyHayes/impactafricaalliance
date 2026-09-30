import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { createAppTheme } from '../../theme/theme';
import { SKIN_STORAGE_KEY, ThemeProvider, useThemeSettings } from '../../theme/ThemeContext';

import { ThemeSelector } from './ThemeSelector';

/** The console's wiring: the MUI theme follows the settings, as in main.tsx. */
const Themed = ({ children }: { children: ReactNode }): JSX.Element => {
  const { preset, mode, skin } = useThemeSettings();
  return <MuiThemeProvider theme={createAppTheme(preset, mode, skin)}>{children}</MuiThemeProvider>;
};

const renderSelector = () =>
  render(
    <ThemeProvider>
      <Themed>
        <ThemeSelector />
      </Themed>
    </ThemeProvider>,
  );

const openPicker = () => fireEvent.click(screen.getByRole('button', { name: 'Choose theme' }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('iaa.admin.theme.mode', 'light');
});

describe('ThemeSelector skins', () => {
  it('offers every skin as a radio, with Classic checked by default', () => {
    renderSelector();
    openPicker();
    const group = screen.getByRole('radiogroup', { name: 'Console skin' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.textContent)).toEqual([
      expect.stringContaining('Classic'),
      expect.stringContaining('Neumorphism'),
      expect.stringContaining('Glassmorphism'),
      expect.stringContaining('Claymorphism'),
    ]);
    expect(within(group).getByRole('radio', { name: /Classic/ })).toBeChecked();
    expect(within(group).getByRole('radio', { name: /Neumorphism/ })).not.toBeChecked();
  });

  it('describes each skin in a line', () => {
    renderSelector();
    openPicker();
    expect(screen.getByText('The console as it has always looked.')).toBeInTheDocument();
    expect(
      screen.getByText('Soft, raised surfaces that press in when you use them.'),
    ).toBeInTheDocument();
  });

  it('keeps the palettes as their own group beside the skins', () => {
    renderSelector();
    openPicker();
    const palettes = screen.getByRole('radiogroup', { name: 'Console theme' });
    expect(within(palettes).getAllByRole('radio')).toHaveLength(4);
    expect(within(palettes).getByRole('radio', { name: /IAA/ })).toBeChecked();
  });

  it('switches the skin, saves it and closes', () => {
    renderSelector();
    openPicker();
    fireEvent.click(screen.getByRole('radio', { name: /Glassmorphism/ }));
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('glassmorphism');
    expect(document.documentElement.dataset.skin).toBe('glassmorphism');
    expect(screen.queryByRole('radiogroup', { name: 'Console skin' })).not.toBeInTheDocument();

    openPicker();
    expect(screen.getByRole('radio', { name: /Glassmorphism/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Classic/ })).not.toBeChecked();
  });

  it('keeps the palette when the skin changes', () => {
    localStorage.setItem('iaa.admin.theme.preset', 'sunset');
    renderSelector();
    openPicker();
    fireEvent.click(screen.getByRole('radio', { name: /Claymorphism/ }));
    openPicker();
    expect(screen.getByRole('radio', { name: /Sunset/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Claymorphism/ })).toBeChecked();
  });

  it('moves between skins with the arrow keys', () => {
    renderSelector();
    openPicker();
    const group = screen.getByRole('radiogroup', { name: 'Console skin' });
    const [classic, neumorphism, , claymorphism] = within(group).getAllByRole('radio');
    classic?.focus();
    fireEvent.keyDown(classic as HTMLElement, { key: 'ArrowRight' });
    expect(neumorphism).toHaveFocus();
    fireEvent.keyDown(neumorphism as HTMLElement, { key: 'ArrowLeft' });
    fireEvent.keyDown(classic as HTMLElement, { key: 'ArrowLeft' });
    expect(claymorphism).toHaveFocus();
    // Moving is not choosing: the stored skin is unchanged.
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe('classic');
  });

  it('paints each miniature with that skin’s own tokens', () => {
    renderSelector();
    openPicker();
    const card = screen.getByRole('radio', { name: /Neumorphism/ });
    const scoped = card.querySelector<HTMLElement>('[style*="--iaa-surface-shadow"]');
    const neumorphism = createAppTheme('iaa', 'light', 'neumorphism').skinTokens;
    expect(scoped?.style.getPropertyValue('--iaa-surface-shadow')).toBe(neumorphism?.surfaceShadow);
    expect(scoped?.style.getPropertyValue('--iaa-canvas-bg')).toBe(neumorphism?.canvasBg);
  });
});

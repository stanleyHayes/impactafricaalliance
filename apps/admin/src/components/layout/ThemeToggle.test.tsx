import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '../../theme/ThemeContext';

import { ThemeToggle } from './ThemeToggle';

const stubMotion = (reduce: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

const renderToggle = (): void => {
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
};

describe('the dark / light toggle', () => {
  beforeEach(() => {
    window.localStorage.setItem('iaa.admin.theme.mode', 'light');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, 'startViewTransition');
    window.localStorage.clear();
  });

  it('reveals the new theme with a view transition centred on the button', () => {
    stubMotion(false);
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return {} as ViewTransition;
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });
    renderToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(startViewTransition).toHaveBeenCalledOnce();
    // The switch happens inside the transition, so the new snapshot is the new theme.
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--reveal-x')).toMatch(/px$/);
  });

  it('never paints an overlay over the console', () => {
    stubMotion(false);
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: vi.fn((update: () => void) => {
        update();
        return {} as ViewTransition;
      }),
    });
    renderToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(document.body.querySelector('[aria-hidden="true"][style*="fixed"]')).toBeNull();
    expect(document.body.childElementCount).toBe(1);
  });

  it('switches at once for people who ask their system for less motion', () => {
    stubMotion(true);
    const startViewTransition = vi.fn();
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });
    renderToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('switches at once where the browser has no view transitions', () => {
    stubMotion(false);
    renderToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    expect(window.localStorage.getItem('iaa.admin.theme.mode')).toBe('dark');
  });
});

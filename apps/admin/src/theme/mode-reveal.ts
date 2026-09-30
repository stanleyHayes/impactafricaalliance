import { flushSync } from 'react-dom';

/**
 * The circular reveal that changes light and dark mode, shared by the top
 * bar's toggle and the mode cards in Settings, so the console changes mode
 * the same way from either.
 *
 * The browser snapshots the page before and after the change, and the new
 * snapshot grows out of the control that was used in a circle, so the content
 * stays visible throughout: nothing is painted over it. These styles are
 * loaded once for the whole console, by the top bar's toggle (on every page),
 * so a caller needs only `revealModeChange`.
 */
export const revealStyles = {
  '@supports (view-transition-name: root)': {
    '::view-transition-old(root), ::view-transition-new(root)': {
      animation: 'none',
      mixBlendMode: 'normal',
    },
    '::view-transition-new(root)': {
      clipPath: 'circle(0% at var(--reveal-x, 50%) var(--reveal-y, 50%))',
      animation: 'admin-theme-reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
    },
    '@keyframes admin-theme-reveal': {
      to: { clipPath: 'circle(150% at var(--reveal-x, 50%) var(--reveal-y, 50%))' },
    },
  },
} as const;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Makes `change` (a change of mode) with the new mode growing out of the
 * middle of `origin`. The change runs inside flushSync so React has painted
 * the new mode before the browser takes the "after" snapshot. Browsers
 * without view transitions, and anyone who asks their system for less
 * motion, get the change at once.
 */
export const revealModeChange = (origin: Element | null, change: () => void): void => {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    change();
    return;
  }
  const rect = origin?.getBoundingClientRect();
  if (rect) {
    const root = document.documentElement.style;
    root.setProperty('--reveal-x', `${rect.left + rect.width / 2}px`);
    root.setProperty('--reveal-y', `${rect.top + rect.height / 2}px`);
  }
  document.startViewTransition(() => {
    flushSync(change);
  });
};

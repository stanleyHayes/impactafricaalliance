import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/test-utils';

import { CookieBanner } from './CookieBanner';

const stylesheetText = (): string =>
  Array.from(document.querySelectorAll('style'))
    .map((node) => node.textContent ?? '')
    .join('\n');

describe('the cookie banner', () => {
  it('asks before anything loads', () => {
    renderWithProviders(<CookieBanner />);
    expect(screen.getByRole('dialog', { name: 'Cookie consent' })).toBeInTheDocument();
  });

  it('steps beneath any open dialog instead of covering its buttons', () => {
    renderWithProviders(<CookieBanner />);
    const css = stylesheetText();
    expect(css).toMatch(/body:has\(\.MuiModal-root:not\(\.MuiModal-hidden\)\)/);
    // One below MUI's modal layer (1300), so the dialog and its backdrop win.
    expect(css).toMatch(/z-index:\s*1299/);
  });
});

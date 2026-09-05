import { fireEvent, screen, within } from '@testing-library/react';
import type * as RouterModule from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/test-utils';

import { LegalLayout } from './LegalLayout';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof RouterModule>()),
  useLocation: () => ({
    pathname: '/cookie-policy',
    search: '',
    hash: '',
    state: null,
    key: 'test',
  }),
}));

describe('LegalLayout', () => {
  it('links all four pages and updates the contents links when policy headings change', () => {
    const { rerender } = renderWithProviders(
      <LegalLayout title="Cookie Policy" subtitle="Policy information">
        <h2>Essential cookies</h2>
      </LegalLayout>,
    );
    const navigation = screen.getByRole('navigation', { name: 'Privacy and legal pages' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(4);
    expect(within(navigation).getByRole('link', { name: /Cookie Policy/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(screen.getByRole('navigation', { name: 'On this page' })).getByRole('link', {
        name: 'Essential cookies',
      }),
    ).toHaveAttribute('href', '#' + screen.getByRole('heading', { name: 'Essential cookies' }).id);
    rerender(
      <LegalLayout title="Cookie Policy" subtitle="Policy information">
        <h2>Updated preferences</h2>
      </LegalLayout>,
    );
    expect(screen.queryByRole('link', { name: 'Essential cookies' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Updated preferences' })).toHaveAttribute(
      'href',
      '#policy-section-0',
    );
  });

  it('opens the existing cookie preference controls', () => {
    const listener = vi.fn();
    window.addEventListener('cookie-banner:open', listener);
    renderWithProviders(
      <LegalLayout title="Cookies" subtitle="Preferences">
        <p>Policy text</p>
      </LegalLayout>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cookie preferences' }));
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('cookie-banner:open', listener);
  });
});

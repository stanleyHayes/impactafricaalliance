import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/test-utils';

import { DesktopNavigation, MobileNavigationLinks } from './SiteNavigation';

describe('site navigation', () => {
  it('lists Impact stories under Our Work', () => {
    renderWithProviders(<DesktopNavigation />);

    fireEvent.click(screen.getByRole('button', { name: 'Our Work' }));
    const menu = screen.getByRole('menu');
    const link = within(menu).getByRole('menuitem', { name: 'Impact stories' });
    expect(link).toHaveAttribute('href', '/impact/stories');
    expect(within(menu).getByRole('menuitem', { name: 'Impact' })).toHaveAttribute(
      'href',
      '/impact',
    );
  });

  it('offers the same link on small screens', () => {
    renderWithProviders(<MobileNavigationLinks onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Our Work' }));
    expect(screen.getByRole('link', { name: 'Impact stories' })).toHaveAttribute(
      'href',
      '/impact/stories',
    );
  });
});

import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { theme } from '../../theme/theme';

import { Header } from './Header';

const renderHeader = (path = '/'): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Header />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('Header', () => {
  it('limits primary navigation to five items and marks the parent of nested routes active', () => {
    renderHeader('/events/community-webinar');
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation.querySelectorAll('a, button')).toHaveLength(5);
    expect(within(navigation).getByRole('button', { name: 'News & Events' })).toHaveClass(
      'nav-active',
    );
    expect(within(navigation).getByRole('link', { name: 'Home' })).not.toHaveClass('active');
  });

  it('makes Events, News & Stories, and Resources available in the same dropdown', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'News & Events' }));
    const menu = screen.getByRole('menu', { name: 'News & Events' });
    expect(within(menu).getByRole('menuitem', { name: 'Events' })).toHaveAttribute(
      'href',
      '/events',
    );
    expect(within(menu).getByRole('menuitem', { name: 'News & Stories' })).toHaveAttribute(
      'href',
      '/news',
    );
    expect(within(menu).getByRole('menuitem', { name: 'Resources' })).toHaveAttribute(
      'href',
      '/resources',
    );
    expect(
      within(menu).getByText('Find upcoming gatherings, webinars, and opportunities to connect.'),
    ).toBeVisible();
    await user.click(within(menu).getByRole('menuitem', { name: 'Events' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'News & Events' })).toHaveClass('nav-active');
  });

  it('supports keyboard opening, item focus, and Escape focus restoration', async () => {
    const user = userEvent.setup();
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'News & Events' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Events' })).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses the same grouped destinations on mobile and closes after choosing Events', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
    await user.click(within(navigation).getByRole('button', { name: 'News & Events' }));
    expect(within(navigation).getByRole('link', { name: 'News & Stories' })).toBeVisible();
    const events = within(navigation).getByRole('link', { name: 'Events' });
    expect(events).toHaveAttribute('href', '/events');
    await user.click(events);
    await waitFor(() => expect(navigation).not.toBeVisible());
  });

  it('keeps the mobile close button available', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const closeButton = screen.getByRole('button', { name: 'Close navigation' });
    await user.click(closeButton);
    await waitFor(() => expect(closeButton).not.toBeVisible());
  });
});

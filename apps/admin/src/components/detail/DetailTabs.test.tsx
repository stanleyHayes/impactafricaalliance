import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppTheme, theme } from '../../theme/theme';

import { DetailTabs } from './DetailTabs';

afterEach(() => {
  cleanup();
});

const Layout = (): JSX.Element => (
  <>
    <DetailTabs
      ariaLabel="Project sections"
      tabs={[
        { to: '.', label: 'Overview', end: true },
        { to: 'tasks', label: 'Tasks' },
      ]}
    />
    <Outlet />
  </>
);

const setup = (path: string): void => {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/projects/:projectId" element={<Layout />}>
            <Route index element={<p>Overview content</p>} />
            <Route path="tasks" element={<p>Tasks content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
};

describe('DetailTabs', () => {
  it('links each tab to its own address under the open record', () => {
    setup('/projects/p1');
    const nav = screen.getByRole('navigation', { name: 'Project sections' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/p1');
    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute(
      'href',
      '/projects/p1/tasks',
    );
  });

  it('marks only the current tab, following the router', () => {
    setup('/projects/p1/tasks');
    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');

    fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
    expect(screen.getByText('Overview content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  it('scrolls only the tab strip to a deep tab, never the window', () => {
    // scrollIntoView would move the window as well, which on a phone opened a
    // project with its title under the app bar.
    const scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    const windowScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    try {
      setup('/projects/p1/tasks');
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(windowScroll).not.toHaveBeenCalled();
      expect(scrollTo).toHaveBeenCalledTimes(1);
      const [options] = scrollTo.mock.calls[0] as [ScrollToOptions];
      expect(Object.keys(options)).toEqual(['left']);
      expect(scrollTo.mock.contexts[0]).toBe(
        screen.getByRole('navigation', { name: 'Project sections' }),
      );
    } finally {
      windowScroll.mockRestore();
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
    }
  });

  it('writes the current tab in a colour that reads on the primary fill', () => {
    const aura = createAppTheme('aura', 'light');
    render(
      <ThemeProvider theme={aura}>
        <MemoryRouter initialEntries={['/projects/p1/tasks']}>
          <Routes>
            <Route path="/projects/:projectId" element={<Layout />}>
              <Route path="tasks" element={<p>Tasks content</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );
    // Violet primary: white, not the black the green presets use.
    expect(getComputedStyle(screen.getByRole('link', { name: 'Tasks' })).color).toBe(
      'rgb(255, 255, 255)',
    );
  });
});

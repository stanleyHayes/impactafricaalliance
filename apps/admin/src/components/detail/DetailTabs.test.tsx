import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { theme } from '../../theme/theme';

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
});

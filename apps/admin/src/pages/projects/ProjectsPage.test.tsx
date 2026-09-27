import type { Permission } from '@iaa/shared';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';

import { clearClients, listItemFixture, page, renderAt } from './project-test-helpers';
import ProjectsPage from './ProjectsPage';

const permissions: { current: Permission[] } = { current: [] };

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'editor', permissions: permissions.current } }),
}));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const get = vi.mocked(api.get);

const setup = (path = '/projects'): void => {
  renderAt(
    path,
    <Routes>
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/new" element={<p>Editor opened</p>} />
    </Routes>,
  );
};

const requestedPaths = (): string[] => get.mock.calls.map(([path]) => String(path));

beforeEach(() => {
  permissions.current = ['projects:read'];
  get.mockResolvedValue(page([listItemFixture()]));
});

afterEach(() => {
  cleanup();
  clearClients();
  vi.clearAllMocks();
});

describe('ProjectsPage', () => {
  it('lists projects with their progress, paged by the API', async () => {
    setup();
    expect(await screen.findByRole('link', { name: 'Digital Skills Hub, Tamale' })).toBeVisible();
    expect(screen.getByText('42% · 5 of 12 done')).toBeInTheDocument();
    expect(screen.getByText('2 tasks overdue')).toBeInTheDocument();
    const first = new URL(requestedPaths()[0] ?? '', 'http://localhost');
    expect(first.pathname).toBe('/admin/projects');
    // The device's day goes with it, so "overdue" is the reader's (plan D6).
    expect(Object.fromEntries(first.searchParams)).toEqual({
      page: '1',
      pageSize: '12',
      sort: 'updated',
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('shows how many projects there are beside the title, as every list page does', async () => {
    get.mockResolvedValue(page([listItemFixture()], 3));
    setup();
    const title = await screen.findByRole('heading', { level: 1, name: 'Projects' });
    expect(await within(title.parentElement as HTMLElement).findByText('3')).toBeVisible();
  });

  it('switches between all, my and archived projects through the address', async () => {
    setup();
    await screen.findByRole('link', { name: 'Digital Skills Hub, Tamale' });
    fireEvent.click(screen.getByRole('tab', { name: 'My projects' }));
    await waitFor(() =>
      expect(requestedPaths().some((path) => path.includes('mine=true'))).toBe(true),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Archived' }));
    await waitFor(() =>
      expect(requestedPaths().some((path) => path.includes('status=archived'))).toBe(true),
    );
    expect(screen.getByRole('tab', { name: 'Archived' })).toHaveAttribute('aria-selected', 'true');
    // The archived tab has its own status, so the status filter steps aside.
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });

  it('says what fills each tab when it is empty', async () => {
    get.mockResolvedValue(page([]));
    setup('/projects?view=mine');
    expect(await screen.findByText('You are not on any projects yet')).toBeInTheDocument();
    cleanup();
    setup('/projects?view=archived');
    expect(await screen.findByText('Nothing archived')).toBeInTheDocument();
    cleanup();
    setup('/projects?q=nothing');
    expect(await screen.findByText('No projects match')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!);
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
  });

  it('keeps a cleared search cleared, rather than writing the old text back', async () => {
    get.mockResolvedValue(page([]));
    setup('/projects?q=nothing&priority=high');
    expect(await screen.findByText('No projects match')).toBeInTheDocument();
    const before = get.mock.calls.length;
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!);
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('');
    // Longer than the search box's pause, so a late write would have happened by now.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const after = requestedPaths().slice(before);
    expect(after.length).toBeGreaterThan(0);
    expect(after.some((path) => path.includes('q=nothing'))).toBe(false);
    expect(screen.queryByText('No projects match')).not.toBeInTheDocument();
  });

  it('ignores a programme the site no longer has, and recovers from a page past the end', async () => {
    get.mockResolvedValueOnce({ items: [], page: 4, pageSize: 12, total: 3, totalPages: 1 });
    setup('/projects?programme=retired-programme&page=4');
    expect(await screen.findByText('Nothing on this page')).toBeInTheDocument();
    expect(requestedPaths()[0]).not.toContain('programme=');
    fireEvent.click(screen.getByRole('button', { name: 'Go to the first page' }));
    expect(await screen.findByRole('link', { name: 'Digital Skills Hub, Tamale' })).toBeVisible();
    expect(requestedPaths().at(-1)).toContain('page=1&');
  });

  it('offers New project only to people who may create one', async () => {
    setup();
    await screen.findByRole('link', { name: 'Digital Skills Hub, Tamale' });
    expect(screen.queryByRole('link', { name: 'New project' })).not.toBeInTheDocument();
    cleanup();

    permissions.current = ['projects:read', 'projects:create'];
    get.mockResolvedValue(page([]));
    setup();
    expect(await screen.findByRole('link', { name: 'New project' })).toHaveAttribute(
      'href',
      '/projects/new',
    );
    fireEvent.click(await screen.findByRole('button', { name: 'New project' }));
    expect(await screen.findByText('Editor opened')).toBeInTheDocument();
  });

  it('offers Retry when the list cannot be loaded', async () => {
    get.mockRejectedValueOnce(new Error('The server is asleep.'));
    setup();
    expect(await screen.findByText('The server is asleep.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Digital Skills Hub, Tamale' })).toBeVisible();
  });
});

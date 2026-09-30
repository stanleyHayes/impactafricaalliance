import type { Permission } from '@iaa/shared';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectOutlet } from '../../components/projects/useProjectOutlet';
import { api, ApiError } from '../../lib/api-client';

import {
  answerPeople,
  clearClients,
  latestClient,
  projectFixture,
  renderAt,
} from './project-test-helpers';
import ProjectDetailLayout from './ProjectDetailLayout';

const permissions: { current: Permission[] } = { current: [] };

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'editor', permissions: permissions.current } }),
}));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const get = vi.mocked(api.get);
const patch = vi.mocked(api.patch);
const remove = vi.mocked(api.delete);
const project = projectFixture();

/** Stands in for a tab: shows what the layout handed down through the outlet. */
const TabProbe = (): JSX.Element => {
  const { project: current } = useProjectOutlet();
  return <p>Tab sees {current.title}</p>;
};

const setup = (path = `/projects/${project.id}`): void => {
  renderAt(
    path,
    <Routes>
      <Route path="/projects/:projectId" element={<ProjectDetailLayout />}>
        <Route index element={<TabProbe />} />
        <Route path="milestones" element={<p>Milestones tab</p>} />
      </Route>
      <Route path="/projects" element={<p>Project list</p>} />
      <Route path="/impact-stories/from-project/:projectId" element={<p>Story started</p>} />
    </Routes>,
  );
};

beforeEach(() => {
  permissions.current = ['projects:read'];
  get.mockImplementation((path: string) => Promise.resolve(answerPeople(path) ?? projectFixture()));
});

afterEach(() => {
  cleanup();
  clearClients();
  vi.clearAllMocks();
});

describe('ProjectDetailLayout', () => {
  it('shows the project at a glance, its tabs, and hands the project to the tab', async () => {
    permissions.current = ['projects:read', 'tasks:read'];
    setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Digital Skills Hub, Tamale' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tab sees Digital Skills Hub, Tamale')).toBeInTheDocument();
    expect(screen.getByText('42% · 5 of 12 done')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('High priority')).toBeInTheDocument();
    expect(screen.getByText('5 Oct 2026 – 30 Jun 2027')).toBeInTheDocument();
    const tabs = within(screen.getByRole('navigation', { name: 'Project sections' }));
    for (const label of [
      'Overview',
      'Tasks',
      'Milestones & activities',
      'Media & evidence',
      'Impact',
      'Documents',
      'Activity',
    ]) {
      expect(tabs.getByRole('link', { name: label })).toBeInTheDocument();
    }
    fireEvent.click(tabs.getByRole('link', { name: 'Milestones & activities' }));
    expect(await screen.findByText('Milestones tab')).toBeInTheDocument();
  });

  it('leaves the Tasks tab out for someone who cannot read tasks', async () => {
    setup();
    const tabs = within(await screen.findByRole('navigation', { name: 'Project sections' }));
    expect(tabs.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(tabs.queryByRole('link', { name: 'Tasks' })).not.toBeInTheDocument();
  });

  it('keeps the project on screen when a refresh fails, and offers Retry', async () => {
    setup();
    await screen.findByText('Tab sees Digital Skills Hub, Tamale');
    get.mockImplementation((path: string) =>
      path.startsWith('/admin/projects')
        ? Promise.reject(new ApiError(503, 'UNAVAILABLE', 'The server is waking up.'))
        : Promise.resolve(answerPeople(path)),
    );
    await latestClient().refetchQueries({ queryKey: ['projects'] });
    expect(await screen.findByText(/could not be refreshed/)).toBeInTheDocument();
    expect(screen.getByText('Tab sees Digital Skills Hub, Tamale')).toBeInTheDocument();
    get.mockImplementation((path: string) =>
      Promise.resolve(answerPeople(path) ?? projectFixture()),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(screen.queryByText(/could not be refreshed/)).not.toBeInTheDocument(),
    );
  });

  it('says when progress was set by hand', async () => {
    get.mockResolvedValue(
      projectFixture({
        progress: {
          value: 75,
          source: 'manual',
          done: 5,
          total: 12,
          reason: 'Training ended early',
        },
      }),
    );
    setup();
    expect(await screen.findByText('75% · Set by hand: Training ended early')).toBeInTheDocument();
  });

  it('hides every action from someone who may only read projects', async () => {
    setup();
    await screen.findByRole('heading', { level: 1, name: 'Digital Skills Hub, Tamale' });
    for (const name of ['Edit', 'Change status', 'Archive', 'Delete', 'Create impact story']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    }
  });

  it('offers each action to someone allowed it, and moves the status', async () => {
    permissions.current = [
      'projects:read',
      'projects:update',
      'projects:delete',
      'impact-stories:read',
      'impact-stories:create',
    ];
    patch.mockResolvedValue(projectFixture({ status: 'on-hold' }));
    setup();
    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/projects/${project.id}/edit`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change status' }));
    const menu = await screen.findByRole('menu');
    // Active can pause or complete; archiving has its own confirmed button.
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('Move to On hold'),
      expect.stringContaining('Move to Completed'),
    ]);
    fireEvent.click(within(menu).getByText('Move to On hold'));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`/admin/projects/${project.id}`, { status: 'on-hold' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create impact story' }));
    expect(await screen.findByText('Story started')).toBeInTheDocument();
  });

  it('archives only after confirming, naming the project', async () => {
    permissions.current = ['projects:read', 'projects:update'];
    patch.mockResolvedValue(projectFixture({ status: 'archived', archivedFromStatus: 'active' }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog', { name: 'Archive this project?' });
    expect(dialog).toHaveTextContent('Digital Skills Hub, Tamale will leave every project list');
    expect(patch).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`/admin/projects/${project.id}`, { status: 'archived' }),
    );
  });

  it('restores an archived project to where it was', async () => {
    permissions.current = ['projects:read', 'projects:update'];
    get.mockResolvedValue(projectFixture({ status: 'archived', archivedFromStatus: 'on-hold' }));
    patch.mockResolvedValue(projectFixture({ status: 'on-hold' }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    const dialog = await screen.findByRole('dialog', { name: 'Restore this project?' });
    expect(dialog).toHaveTextContent('returns to the project lists as On hold');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`/admin/projects/${project.id}`, { status: 'on-hold' }),
    );
  });

  it('shows why a delete was refused, and keeps the project', async () => {
    permissions.current = ['projects:read', 'projects:delete'];
    remove.mockRejectedValue(
      new ApiError(
        409,
        'CONFLICT',
        'This project has 3 tasks linked to it. Archive it instead: it leaves every list, and its tasks and stories keep their link.',
      ),
    );
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this project?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(
      await within(dialog).findByText(/3 tasks linked to it\. Archive it instead/),
    ).toBeVisible();
    expect(screen.queryByText('Project list')).not.toBeInTheDocument();
  });

  it('says when the project does not exist, and offers the way back', async () => {
    get.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Project not found'));
    setup();
    expect(await screen.findByText(/This project could not be found/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/projects');
  });

  it('offers Retry when loading fails for another reason', async () => {
    get.mockRejectedValueOnce(new Error('The server is waking up.'));
    setup();
    expect(await screen.findByText('The server is waking up.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Digital Skills Hub, Tamale' }),
    ).toBeInTheDocument();
  });
});

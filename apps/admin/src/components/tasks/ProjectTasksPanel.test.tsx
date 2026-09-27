import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';

import { ProjectTasksPanel } from './ProjectTasksPanel';
import { boardOf, listItem, paged, renderTaskUi } from './task-test-fixtures';

const mocks = vi.hoisted(() => ({
  permissions: ['tasks:read', 'tasks:create', 'tasks:update'] as string[],
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'a'.repeat(24), role: 'editor', permissions: mocks.permissions },
  }),
}));
vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const projectId = 'e'.repeat(24);
const project = { id: projectId, title: 'Girls in STEM', slug: 'girls-in-stem' };
const survey = listItem({ title: 'Survey the schools', status: 'todo', project, projectId });
const kit = listItem({ title: 'Buy the laptops', status: 'todo', project, projectId });
const launch = listItem({ title: 'Hold the launch', status: 'done', project, projectId });

beforeEach(() => {
  mocks.permissions = ['tasks:read', 'tasks:create', 'tasks:update'];
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path.startsWith('/admin/tasks/board')) return boardOf([survey, kit, launch]);
    if (path === `/admin/projects/${projectId}`) return { ...project, milestones: [] };
    return paged([]);
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPanel = () =>
  renderTaskUi(<ProjectTasksPanel projectId={projectId} />, {
    route: `/projects/${projectId}/tasks`,
  });

describe('ProjectTasksPanel', () => {
  it("lists only this project's tasks, grouped by status with counts", async () => {
    renderPanel();
    await screen.findByText('Survey the schools');
    expect(api.get).toHaveBeenCalledWith(`/admin/tasks/board?projectId=${projectId}`);
    expect(screen.getByText('3 tasks, 1 done')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'To do' })).getByLabelText('2 tasks'),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Done' })).getByText('Hold the launch'),
    ).toBeVisible();
    // Empty statuses are left out rather than listed as nothing.
    expect(screen.queryByRole('region', { name: 'Backlog' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open on the board' })).toHaveAttribute(
      'href',
      `/tasks/board?project=${projectId}`,
    );
  });

  it('opens a task in the drawer on the project tab', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: `Open ${kit.key}: ${kit.title}` }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/projects/${projectId}/tasks?task=${kit.key}`,
    );
  });

  it('adds a task with the project already chosen', async () => {
    renderPanel();
    await screen.findByText('Survey the schools');
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Project' })).toHaveValue('Girls in STEM'),
    );
  });

  it('says what fills an empty project', async () => {
    vi.mocked(api.get).mockResolvedValue(boardOf([]));
    renderPanel();
    expect(await screen.findByText('No tasks on this project yet')).toBeInTheDocument();
  });

  it('says who can grant access when tasks are hidden from you', () => {
    mocks.permissions = [];
    renderPanel();
    expect(
      screen.getByText(/An administrator can grant you access to tasks under Users/),
    ).toBeVisible();
    expect(api.get).not.toHaveBeenCalled();
  });
});

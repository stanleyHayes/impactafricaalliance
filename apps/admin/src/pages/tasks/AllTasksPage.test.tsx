import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listItem, paged, renderTaskUi } from '../../components/tasks/task-test-fixtures';
import { api } from '../../lib/api-client';

import AllTasksPage from './AllTasksPage';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'a'.repeat(24), role: 'editor', permissions: ['tasks:read', 'tasks:create'] },
  }),
}));
vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const report = listItem({ title: 'Send the grant report', priority: 'urgent' });

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (!path.startsWith('/admin/tasks?')) return paged([]);
    const page = Number(new URL(path, 'http://localhost').searchParams.get('page') ?? 1);
    return { ...paged([report], 60), page, pageSize: 25, totalPages: 3 };
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const lastListQuery = (): URLSearchParams => {
  const paths = vi
    .mocked(api.get)
    .mock.calls.map(([path]) => path)
    .filter((path) => path.startsWith('/admin/tasks?'));
  return new URL(paths[paths.length - 1] ?? '', 'http://localhost').searchParams;
};

describe('AllTasksPage', () => {
  it('asks the API for one filtered, sorted page at a time', async () => {
    renderTaskUi(<AllTasksPage />, {
      route:
        '/tasks/all?assignee=none&status=todo,blocked&due=overdue&page=2&sort=priority&order=desc',
    });
    await screen.findByText('Send the grant report');
    const query = lastListQuery();
    expect(query.get('assigneeId')).toBe('none');
    expect(query.get('status')).toBe('todo,blocked');
    expect(query.get('due')).toBe('overdue');
    expect(query.get('today')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(query.get('page')).toBe('2');
    expect(query.get('pageSize')).toBe('25');
    expect(query.get('sort')).toBe('priority');
    expect(query.get('order')).toBe('desc');
    expect(screen.getByRole('heading', { name: /60 tasks · page 2 of 3/ })).toBeInTheDocument();
  });

  it('goes back to the first page when a filter changes', async () => {
    renderTaskUi(<AllTasksPage />, { route: '/tasks/all?page=3' });
    await screen.findByText('Send the grant report');
    // On a narrow screen the filters sit behind a button.
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(await screen.findByRole('switch', { name: 'Show completed' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/tasks/all?done=1'),
    );
    await waitFor(() => expect(lastListQuery().get('includeDone')).toBe('true'));
    expect(lastListQuery().get('page')).toBeNull();
  });

  it('offers the sorts as a menu where the table headings are not shown', async () => {
    renderTaskUi(<AllTasksPage />, { route: '/tasks/all?page=2' });
    await screen.findByText('Send the grant report');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Sort by' }));
    fireEvent.click(await screen.findByRole('option', { name: /Due soonest/ }));
    await waitFor(() => expect(lastListQuery().get('sort')).toBe('due'));
    expect(lastListQuery().get('order')).toBe('asc');
    expect(lastListQuery().get('page')).toBeNull();
  });

  it('ignores a filter in the address that the API could not read', async () => {
    renderTaskUi(<AllTasksPage />, { route: '/tasks/all?assignee=someone&project=abc&due=soon' });
    await screen.findByText('Send the grant report');
    const query = lastListQuery();
    expect(query.get('assigneeId')).toBeNull();
    expect(query.get('projectId')).toBeNull();
    expect(query.get('due')).toBeNull();
  });

  it('opens a task in the drawer from its row', async () => {
    renderTaskUi(<AllTasksPage />, { route: '/tasks/all' });
    fireEvent.click(await screen.findByRole('button', { name: `${report.key} ${report.title}` }));
    expect(screen.getByTestId('location')).toHaveTextContent(`/tasks/all?task=${report.key}`);
  });

  it('says the page is past the end, rather than that there are no tasks', async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path.startsWith('/admin/tasks?')
        ? { ...paged([], 41), page: 3, pageSize: 25, totalPages: 2 }
        : paged([]),
    );
    renderTaskUi(<AllTasksPage />, { route: '/tasks/all?page=3' });
    expect(await screen.findByText('Nothing on this page')).toBeInTheDocument();
    expect(
      screen.getByText('There are 41 tasks in this view, on earlier pages.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('No open tasks')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to the first page' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/tasks\/all$/));
  });

  it('says what to do when the filters match nothing', async () => {
    vi.mocked(api.get).mockResolvedValue(paged([]));
    renderTaskUi(<AllTasksPage />, { route: '/tasks/all?label=nothing' });
    expect(await screen.findByText('No tasks match these filters')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/tasks\/all$/));
  });
});

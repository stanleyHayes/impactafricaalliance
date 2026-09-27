import { localDateKey } from '@iaa/shared';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listItem, paged, renderTaskUi } from '../../components/tasks/task-test-fixtures';
import { api } from '../../lib/api-client';

import MyTasksPage from './MyTasksPage';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'a'.repeat(24),
      role: 'editor',
      permissions: ['tasks:read', 'tasks:create', 'tasks:update'],
    },
  }),
}));
vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const late = listItem({ title: 'Send the grant report', dueDate: '2026-09-01T12:00:00.000Z' });
const soonOne = listItem({ title: 'Brief the volunteers' });
const soonTwo = listItem({ title: 'Book the minibus' });
const finished = listItem({ title: 'Print the badges', status: 'done' });

const listFor = (search: URLSearchParams) => {
  if (search.get('status') === 'done') return paged([finished]);
  const byBucket: Record<string, ReturnType<typeof paged>> = {
    overdue: paged([late]),
    today: paged([]),
    upcoming: paged([soonOne, soonTwo], 24),
    none: paged([]),
  };
  return byBucket[search.get('due') ?? ''] ?? paged([]);
};

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) =>
    listFor(new URL(path, 'http://localhost').searchParams),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const section = (name: string): HTMLElement => screen.getByRole('region', { name });

describe('MyTasksPage', () => {
  it('groups your tasks by when they are due, with counts and plain empty states', async () => {
    renderTaskUi(<MyTasksPage />, { route: '/tasks' });
    await screen.findByText('Send the grant report');

    expect(within(section('Overdue')).getByLabelText('1 task')).toBeInTheDocument();
    expect(within(section('Due today')).getByText('Nothing due today.')).toBeInTheDocument();
    expect(within(section('Upcoming')).getByText('Brief the volunteers')).toBeInTheDocument();
    expect(within(section('Upcoming')).getByLabelText('24 tasks')).toBeInTheDocument();
    expect(within(section('Upcoming')).getByRole('link', { name: 'See all 24' })).toHaveAttribute(
      'href',
      '/tasks/all?assignee=me&due=upcoming',
    );
    expect(
      within(section('No due date')).getByText('Every task of yours has a date.'),
    ).toBeVisible();
  });

  it('asks for your own work, compared with this device’s day', async () => {
    renderTaskUi(<MyTasksPage />, { route: '/tasks' });
    await screen.findByText('Send the grant report');
    const requests = vi
      .mocked(api.get)
      .mock.calls.map(([path]) => new URL(path, 'http://localhost').searchParams);
    const buckets = requests.map((search) => search.get('due'));
    expect(buckets).toEqual(expect.arrayContaining(['overdue', 'today', 'upcoming', 'none']));
    for (const search of requests) {
      expect(search.get('assigneeId')).toBe('me');
      expect(search.get('today')).toBe(localDateKey());
    }
  });

  it('adds what you have finished when asked', async () => {
    renderTaskUi(<MyTasksPage />, { route: '/tasks' });
    await screen.findByText('Send the grant report');
    expect(screen.queryByRole('region', { name: 'Completed' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Show completed' }));
    await waitFor(() =>
      expect(within(section('Completed')).getByText('Print the badges')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/tasks?completed=1');
  });

  it('opens a task in the drawer', async () => {
    renderTaskUi(<MyTasksPage />, { route: '/tasks' });
    const row = await screen.findByRole('button', { name: `${late.key} ${late.title}` });
    // What the row shows as chips is read out too, overdue above all.
    expect(row).toHaveAccessibleDescription(/To do.*Medium priority.*Overdue/);
    fireEvent.click(row);
    expect(screen.getByTestId('location')).toHaveTextContent(`/tasks?task=${late.key}`);
  });
});

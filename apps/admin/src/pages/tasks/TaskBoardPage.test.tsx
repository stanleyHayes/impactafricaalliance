import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { boardOf, listItem, paged, renderTaskUi } from '../../components/tasks/task-test-fixtures';
import { api } from '../../lib/api-client';

import TaskBoardPage from './TaskBoardPage';

const mocks = vi.hoisted(() => ({
  permissions: ['tasks:read', 'tasks:create', 'tasks:update'] as string[],
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'a'.repeat(24), role: 'editor', permissions: mocks.permissions },
  }),
}));
vi.mock('../../lib/api-client', () => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return { api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, ApiError };
});

const venue = listItem({ id: 'c1', number: 11, status: 'todo', title: 'Book the venue' });
const brief = listItem({
  id: 'c2',
  number: 12,
  status: 'done',
  title: 'Write the brief',
  boardOrder: 4096,
});

beforeEach(() => {
  mocks.permissions = ['tasks:read', 'tasks:create', 'tasks:update'];
  vi.mocked(api.get).mockImplementation(async (path: string) =>
    path.startsWith('/admin/tasks/board') ? boardOf([venue, brief], { done: 140 }) : paged([]),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const column = (name: string): HTMLElement => screen.getByRole('region', { name });

describe('TaskBoardPage', () => {
  it('shows every column in order, with totals and a note when a column is capped', async () => {
    renderTaskUi(<TaskBoardPage />, { route: '/tasks/board' });
    await screen.findByText('Book the venue');
    const names = ['Backlog', 'To do', 'In progress', 'Blocked', 'In review', 'Done'];
    for (const name of names) expect(column(name)).toBeInTheDocument();
    expect(within(column('Done')).getByLabelText('140 tasks')).toBeInTheDocument();
    expect(within(column('Done')).getByText(/Showing 1 of 140/)).toBeInTheDocument();
  });

  it('moves a card at once from its menu, and puts it back when the server refuses', async () => {
    let refuse: (error: Error) => void = () => undefined;
    vi.mocked(api.patch).mockReturnValue(
      new Promise((_resolve, reject) => {
        refuse = reject;
      }),
    );
    renderTaskUi(<TaskBoardPage />, { route: '/tasks/board' });
    await screen.findByText('Book the venue');

    fireEvent.click(screen.getByRole('button', { name: 'Move IAA-11' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Done' }));

    // Shown in its new column before the server has answered.
    await waitFor(() => expect(within(column('Done')).getByText('Book the venue')).toBeVisible());
    expect(within(column('To do')).queryByText('Book the venue')).not.toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith(`/admin/tasks/${venue.id}/move`, {
      status: 'done',
      // The top of the Done column: above the card already there.
      boardOrder: brief.boardOrder - 1024,
    });

    await act(async () => refuse(new Error('You cannot do that')));

    await waitFor(() =>
      expect(within(column('To do')).getByText('Book the venue')).toBeInTheDocument(),
    );
    expect(within(column('Done')).queryByText('Book the venue')).not.toBeInTheDocument();
    expect(await screen.findByText(/IAA-11 could not be moved to Done/)).toBeInTheDocument();
    expect(screen.getByText(/It is back where it was/)).toBeInTheDocument();
  });

  it('opens a card in the drawer by its key', async () => {
    renderTaskUi(<TaskBoardPage />, { route: '/tasks/board' });
    fireEvent.click(await screen.findByText('Book the venue'));
    expect(screen.getByTestId('location')).toHaveTextContent('/tasks/board?task=IAA-11');
  });

  it('adds a new task to the project the board is showing', async () => {
    const projectId = 'e'.repeat(24);
    vi.mocked(api.post).mockResolvedValue({ ...venue, key: 'IAA-13', title: 'Hire the chairs' });
    renderTaskUi(<TaskBoardPage />, { route: `/tasks/board?project=${projectId}` });
    await screen.findByText('Book the venue');
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    const title = await screen.findByRole('textbox', { name: /Title/ });
    fireEvent.change(title, { target: { value: 'Hire the chairs' } });
    fireEvent.submit(title.closest('form') ?? document.body);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/admin/tasks',
        expect.objectContaining({ title: 'Hire the chairs', projectId }),
      ),
    );
  });

  it('shows the board read-only without permission to update tasks', async () => {
    mocks.permissions = ['tasks:read'];
    renderTaskUi(<TaskBoardPage />, { route: '/tasks/board' });
    await screen.findByText('Book the venue');
    expect(screen.queryByRole('button', { name: 'Move IAA-11' })).not.toBeInTheDocument();
    expect(screen.getByText(/An administrator can grant you permission/)).toBeInTheDocument();
  });
});

import type { Task } from '@iaa/shared';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fullTask, paged, renderTaskUi } from '../../components/tasks/task-test-fixtures';
import { api } from '../../lib/api-client';
import { goToStep } from '../../test/step-menu';

import TaskEditorPage from './TaskEditorPage';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'a'.repeat(24),
      role: 'editor',
      permissions: ['tasks:read', 'tasks:create', 'tasks:update'],
    },
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

const projectId = 'e'.repeat(24);
const existing: Task = fullTask({
  id: 'd'.repeat(24),
  key: 'IAA-7',
  title: 'Print the programmes',
  labels: ['print'],
});

beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/admin/tasks/IAA-7') return existing;
    if (path === `/admin/projects/${projectId}`) {
      return {
        id: projectId,
        title: 'Girls in STEM',
        slug: 'girls-in-stem',
        milestones: [{ id: 'launch', title: 'Launch event' }],
      };
    }
    return paged([]);
  });
  vi.mocked(api.post).mockImplementation(async (_path: string, body: unknown) =>
    fullTask({ ...(body as Partial<Task>), id: 'f'.repeat(24), key: 'IAA-9' }),
  );
  vi.mocked(api.patch).mockImplementation(async () => existing);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const heading = (name: string) => screen.findByRole('heading', { name, level: 2 });
const title = (): HTMLElement => screen.getByRole('textbox', { name: /Title/ });
/** Pressing Enter in a field submits its form, which is what this does. */
const pressEnter = (): void => {
  fireEvent.submit(title().closest('form') ?? document.body);
};

describe('TaskEditorPage', () => {
  it('checks each step before moving on and saves only from the review', async () => {
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/new' });
    await heading('Basics');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('Check the highlighted fields before continuing.'),
    ).toBeVisible();
    expect(screen.getByText(/at least three characters/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basics', level: 2 })).toBeInTheDocument();

    fireEvent.change(title(), { target: { value: 'Book the launch venue' } });
    // Enter on an intermediate step moves on after checking it; it never saves.
    pressEnter();
    await heading('Assignment');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await heading('Schedule');

    fireEvent.change(screen.getByRole('spinbutton', { name: /Estimate/ }), {
      target: { value: '-3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Enter a number of hours from 0 to 1000/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Estimate/ }), {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await heading('Details');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await heading('Review');
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByText('Book the launch venue')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/admin/tasks',
        expect.objectContaining({
          title: 'Book the launch venue',
          status: 'todo',
          priority: 'medium',
          estimateHours: 6,
          assigneeIds: [],
        }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tasks/IAA-9'));
  });

  it('starts with the project from the address', async () => {
    renderTaskUi(<TaskEditorPage />, { route: `/tasks/new?projectId=${projectId}` });
    fireEvent.change(await screen.findByRole('textbox', { name: /Title/ }), {
      target: { value: 'Plan the launch' },
    });
    pressEnter();
    await heading('Assignment');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Project' })).toHaveValue('Girls in STEM'),
    );
  });

  it('loads an existing task and sends only what changed', async () => {
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/IAA-7/edit', path: '/tasks/:taskKey/edit' });
    await heading('Basics');
    expect(title()).toHaveValue('Print the programmes');

    fireEvent.change(title(), { target: { value: 'Print 200 programmes' } });
    // Every step of a saved task can be visited at once.
    await goToStep(4);
    await heading('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Update task' }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(`/admin/tasks/${existing.id}`, {
        title: 'Print 200 programmes',
      }),
    );
  });

  it('sends only what was edited, even after a refetch brings a colleague’s change', async () => {
    const { client } = renderTaskUi(<TaskEditorPage />, {
      route: '/tasks/IAA-7/edit',
      path: '/tasks/:taskKey/edit',
    });
    await heading('Basics');
    // A colleague moves the due date; a write in this tab refreshes every task.
    const colleagues = { ...existing, dueDate: '2026-11-01T12:00:00.000Z' };
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path === '/admin/tasks/IAA-7' ? colleagues : paged([]),
    );
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['tasks'] });
    });
    await waitFor(() =>
      expect(client.getQueryData(['tasks', 'detail', 'IAA-7'])).toMatchObject({
        dueDate: colleagues.dueDate,
      }),
    );

    fireEvent.change(title(), { target: { value: 'New title' } });
    await goToStep(4);
    await heading('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Update task' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch).toHaveBeenCalledWith(`/admin/tasks/${existing.id}`, { title: 'New title' });
  });

  it('keeps the form and what was typed when a refetch behind it fails', async () => {
    const { ApiError } = await import('../../lib/api-client');
    const { client } = renderTaskUi(<TaskEditorPage />, {
      route: '/tasks/IAA-7/edit',
      path: '/tasks/:taskKey/edit',
    });
    await heading('Basics');
    fireEvent.change(title(), { target: { value: 'Print 300 programmes' } });

    vi.mocked(api.get).mockRejectedValue(new ApiError(500, 'X', 'down'));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['tasks'] });
    });

    expect(
      await screen.findByText(/The latest copy of this task could not be loaded/),
    ).toBeInTheDocument();
    expect(title()).toHaveValue('Print 300 programmes');
    expect(screen.queryByText('This task could not be loaded.')).not.toBeInTheDocument();
    expect(screen.queryByText('down')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('goes back to the step the API refused, with the field marked', async () => {
    const refusal = Object.assign(
      new Error('Choose assignees who are active members of the team'),
      {
        status: 400,
        details: [
          {
            path: 'assigneeIds',
            message: 'Choose assignees who are active members of the team',
            ids: ['b'.repeat(24)],
          },
        ],
      },
    );
    vi.mocked(api.patch).mockRejectedValue(refusal);
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/IAA-7/edit', path: '/tasks/:taskKey/edit' });
    await heading('Basics');
    fireEvent.change(title(), { target: { value: 'Print 200 programmes' } });
    await goToStep(4);
    await heading('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Update task' }));

    await heading('Assignment');
    expect(
      screen.getByText(
        'The task was not saved. Choose assignees who are active members of the team',
      ),
    ).toBeInTheDocument();
    // The field's own message, under the picker it belongs to.
    expect(
      screen.getAllByText('Choose assignees who are active members of the team').length,
    ).toBeGreaterThan(0);
    // What was typed on the other steps is still there.
    await goToStep(0);
    await heading('Basics');
    expect(title()).toHaveValue('Print 200 programmes');
  });

  it('names the chosen people on the review', async () => {
    const ama = { id: 'b'.repeat(24), name: 'Ama Mensah', email: 'ama@iaa.test', role: 'editor' };
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === '/admin/tasks/IAA-7') return { ...existing, assigneeIds: [ama.id] };
      if (path.startsWith('/admin/people')) return paged([ama]);
      return paged([]);
    });
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/IAA-7/edit', path: '/tasks/:taskKey/edit' });
    await heading('Basics');
    await goToStep(4);
    await heading('Review');
    expect(await screen.findByText('Ama Mensah')).toBeInTheDocument();
  });

  it('will not move on from, or save, a due date that is only half typed', async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path === '/admin/tasks/IAA-7'
        ? { ...existing, dueDate: '2026-10-15T12:00:00.000Z' }
        : paged([]),
    );
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/IAA-7/edit', path: '/tasks/:taskKey/edit' });
    await heading('Basics');
    await goToStep(2);
    await heading('Schedule');
    const due = screen.getByRole('group', { name: /Due date/ });
    const day = within(due).getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    fireEvent.keyDown(day, { key: 'Delete' });
    expect(
      await within(due.parentElement ?? due).findByText(
        'Finish typing the date, or clear the field.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('Finish typing the date, or clear it, before continuing.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Schedule', level: 2 })).toBeInTheDocument();
    // Jumping ahead from the step rail is held back the same way.
    await goToStep(4);
    expect(screen.getByRole('heading', { name: 'Schedule', level: 2 })).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('names the description box, so it is announced as Description', async () => {
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/new' });
    await heading('Basics');
    expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
  });

  it('reviews with the shared summary: Edit per section, and Not set for empty values', async () => {
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/IAA-7/edit', path: '/tasks/:taskKey/edit' });
    await heading('Basics');
    await goToStep(4);
    await heading('Review');
    const schedule = screen.getByRole('region', { name: 'Schedule' });
    expect(within(schedule).getAllByText('Not set').length).toBe(3);
    expect(screen.queryByText('None')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit schedule' }));
    await heading('Schedule');
  });

  it('says so when the task to edit does not exist', async () => {
    const { ApiError } = await import('../../lib/api-client');
    vi.mocked(api.get).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Task not found'));
    renderTaskUi(<TaskEditorPage />, { route: '/tasks/IAA-99/edit', path: '/tasks/:taskKey/edit' });
    expect(await screen.findByText(/There is no task IAA-99/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See all tasks' })).toHaveAttribute(
      'href',
      '/tasks/all',
    );
  });
});

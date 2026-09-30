import type { Task } from '@iaa/shared';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';

import { QuickCreateTaskButton } from './QuickCreateTaskButton';
import { QuickCreateTaskDialog } from './QuickCreateTaskDialog';
import { fullTask, paged, renderTaskUi } from './task-test-fixtures';

const mocks = vi.hoisted(() => ({
  permissions: ['tasks:read', 'tasks:create', 'projects:read'] as string[],
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
const created: Task = fullTask({ id: 'f'.repeat(24), key: 'IAA-9', title: 'Order the banners' });

beforeEach(() => {
  mocks.permissions = ['tasks:read', 'tasks:create', 'projects:read'];
  vi.mocked(api.get).mockResolvedValue(paged([]));
  vi.mocked(api.post).mockResolvedValue(created);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const titleField = (): HTMLElement => screen.getByRole('textbox', { name: /Title/ });
const submitWithEnter = (): void => {
  fireEvent.submit(titleField().closest('form') ?? document.body);
};

describe('QuickCreateTaskDialog', () => {
  it('creates the task on Enter, with the preset project', async () => {
    const onCreated = vi.fn();
    renderTaskUi(
      <QuickCreateTaskDialog
        open
        onClose={vi.fn()}
        onCreated={onCreated}
        defaults={{
          projectId,
          project: { id: projectId, title: 'Girls in STEM', slug: 'girls-in-stem' },
        }}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Project' })).toHaveValue('Girls in STEM');

    submitWithEnter();
    expect(await screen.findByText(/at least three characters/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.change(titleField(), { target: { value: 'Order the banners' } });
    submitWithEnter();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/tasks', {
        title: 'Order the banners',
        priority: 'medium',
        assigneeIds: [],
        projectId,
      }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  });

  it('does not create the task while the due date is only half typed', async () => {
    renderTaskUi(<QuickCreateTaskDialog open onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(titleField(), { target: { value: 'Order the banners' } });
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    for (const digit of ['1', '5']) {
      day.textContent = digit;
      fireEvent.input(day);
    }
    // Leaving the field for the title, where Enter is pressed.
    fireEvent.blur(day);
    expect(
      await screen.findByText('Finish typing the date, or clear the field.'),
    ).toBeInTheDocument();

    submitWithEnter();
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    // Neither Enter nor the button creates it, with or without a due date.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('keeps what was typed when the save fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('The server is asleep.'));
    renderTaskUi(<QuickCreateTaskDialog open onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(titleField(), { target: { value: 'Order the banners' } });
    submitWithEnter();
    expect(await screen.findByText('The server is asleep.')).toBeInTheDocument();
    expect(titleField()).toHaveValue('Order the banners');
  });

  it('cannot be dismissed while the task is being created', async () => {
    let finish: (task: Task) => void = () => undefined;
    vi.mocked(api.post).mockReturnValue(
      new Promise<Task>((resolve) => {
        finish = resolve;
      }),
    );
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderTaskUi(<QuickCreateTaskDialog open onClose={onClose} onCreated={onCreated} />);
    fireEvent.change(titleField(), { target: { value: 'Order the banners' } });
    submitWithEnter();
    expect(await screen.findByRole('button', { name: 'Creating…' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    finish(created);
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  });
});

describe('QuickCreateTaskButton', () => {
  it('is hidden from people who cannot create tasks', () => {
    mocks.permissions = ['tasks:read'];
    renderTaskUi(<QuickCreateTaskButton />);
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument();
  });

  it('is hidden from people who can create tasks but not see them', () => {
    mocks.permissions = ['tasks:create'];
    renderTaskUi(<QuickCreateTaskButton />);
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument();
  });

  it('opens the dialog and, once created, offers to open the task', async () => {
    renderTaskUi(<QuickCreateTaskButton />, { route: '/events' });
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    fireEvent.change(await screen.findByRole('textbox', { name: /Title/ }), {
      target: { value: 'Order the banners' },
    });
    submitWithEnter();

    expect(await screen.findByText('IAA-9 created: Order the banners')).toBeInTheDocument();
    // Found once the dialog has finished closing and the page is readable again.
    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
    // The events page has no task drawer, so the task opens on its own page.
    expect(screen.getByTestId('location')).toHaveTextContent('/tasks/IAA-9');
  });

  it('opens a new task in the drawer on a page that has one', async () => {
    renderTaskUi(<QuickCreateTaskButton />, { route: '/tasks/board' });
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    fireEvent.change(await screen.findByRole('textbox', { name: /Title/ }), {
      target: { value: 'Order the banners' },
    });
    submitWithEnter();
    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/tasks/board?task=IAA-9');
  });
});

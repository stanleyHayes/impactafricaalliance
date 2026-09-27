import type { Task, TaskUpdate } from '@iaa/shared';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';

import { forgetTaskDrafts } from './task-drafts';
import { fullTask, paged, renderTaskUi } from './task-test-fixtures';
import { renderMentions } from './TaskComments';
import { TaskDrawerHost } from './TaskDrawer';

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

const task: Task = fullTask({
  id: 'd'.repeat(24),
  key: 'IAA-7',
  title: 'Print the programmes',
  description: 'Two hundred copies, **double-sided**.',
});

beforeEach(() => {
  mocks.permissions = ['tasks:read', 'tasks:create', 'tasks:update'];
  vi.mocked(api.get).mockImplementation(async (path: string) =>
    path === '/admin/tasks/IAA-7' ? task : paged([]),
  );
  vi.mocked(api.patch).mockImplementation(async (_path: string, body: unknown) => ({
    ...task,
    ...(body as TaskUpdate),
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  forgetTaskDrafts();
});

const openDrawer = async (): Promise<HTMLElement> => {
  renderTaskUi(<TaskDrawerHost />, { route: '/tasks/all?task=IAA-7' });
  await screen.findByRole('heading', { name: 'Print the programmes' });
  return screen.getByRole('presentation');
};

describe('TaskDrawer', () => {
  it('opens the task named in the address', async () => {
    const drawer = await openDrawer();
    expect(within(drawer).getByText('IAA-7')).toBeInTheDocument();
    expect(within(drawer).getByText('double-sided')).toBeInTheDocument();
    expect(within(drawer).getByRole('region', { name: 'Checklist' })).toBeInTheDocument();
    expect(within(drawer).getByRole('region', { name: 'Activity' })).toBeInTheDocument();
  });

  it('saves the title where it stands and says so', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    const input = screen.getByRole('textbox', { name: 'Title' });
    fireEvent.change(input, { target: { value: 'Print 200 programmes' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(`/admin/tasks/${task.id}`, {
        title: 'Print 200 programmes',
      }),
    );
    expect(await screen.findByText('Title saved')).toBeInTheDocument();
  });

  it('keeps a title that is too short from being saved', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    const input = screen.getByRole('textbox', { name: 'Title' });
    fireEvent.change(input, { target: { value: 'No' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText(/at least three characters/)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('says when a title save fails and gives back what was typed', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('The server is asleep.'));
    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    const input = screen.getByRole('textbox', { name: 'Title' });
    fireEvent.change(input, { target: { value: 'A different title' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(
      await screen.findByText('Title was not saved. The server is asleep.'),
    ).toBeInTheDocument();
    // Open again with the new wording, ready for another go.
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('A different title');
  });

  it('keeps the description editor and its text when the save fails', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('The server is asleep.'));
    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Edit description' }));
    const editor = screen.getAllByRole('textbox').find((box) => box.tagName === 'TEXTAREA');
    if (!editor) throw new Error('No description box');
    fireEvent.change(editor, { target: { value: 'A long brief that took a while to write.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save description' }));

    expect(
      await screen.findByText('Description was not saved. The server is asleep.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save description' })).toBeEnabled();
    expect(editor).toHaveValue('A long brief that took a while to write.');
  });

  it('keeps a half-written comment when the drawer closes and brings it back', async () => {
    await openDrawer();
    const box = screen.getByRole('textbox', { name: 'Add a comment' });
    fireEvent.change(box, { target: { value: 'The printer needs the final PDF by Friday.' } });
    // Escape, a click beside the drawer, or another task: the drawer goes.
    cleanup();

    await openDrawer();
    expect(screen.getByRole('textbox', { name: 'Add a comment' })).toHaveValue(
      'The printer needs the final PDF by Friday.',
    );
  });

  it('reopens a description left mid-edit, still being edited', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Edit description' }));
    const editor = screen.getAllByRole('textbox').find((box) => box.tagName === 'TEXTAREA');
    if (!editor) throw new Error('No description box');
    fireEvent.change(editor, { target: { value: 'Two hundred copies, single-sided.' } });
    cleanup();

    await openDrawer();
    expect(screen.getByRole('button', { name: 'Save description' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Two hundred copies, single-sided.')).toBeInTheDocument();
  });

  it('can be closed while the task is still loading or cannot load', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Could not reach the server.'));
    renderTaskUi(<TaskDrawerHost />, { route: '/tasks/all?task=IAA-7' });
    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close task' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/tasks\/all$/);
  });

  it('closes by taking the task out of the address', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Close task' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/tasks\/all$/);
  });

  it('is read-only, and says who can change that, without permission to update', async () => {
    mocks.permissions = ['tasks:read'];
    await openDrawer();
    expect(screen.queryByRole('button', { name: 'Edit title' })).not.toBeInTheDocument();
    expect(screen.getByText(/You can read this task but not change it/)).toBeInTheDocument();
  });
});

describe('renderMentions', () => {
  it('shows mention tokens as bold names, never as links', () => {
    expect(renderMentions('Thanks @[Ama Mensah](64b7f0c2a1b2c3d4e5f60718)!')).toBe(
      'Thanks **@Ama Mensah**!',
    );
    expect(renderMentions('@[Kofi *K* Boateng](64b7f0c2a1b2c3d4e5f60718)')).toBe(
      '**@Kofi \\*K\\* Boateng**',
    );
  });
});

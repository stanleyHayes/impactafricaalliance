import type { TaskBoard } from '@iaa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardOf, listItem } from '../components/tasks/task-test-fixtures';

import { api } from './api-client';
import { applyMove, taskBoardKey, taskDetailKey, taskQueryString, useMoveTask } from './tasks';

vi.mock('./api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const first = listItem({ id: 'a1', number: 101, status: 'todo', boardOrder: 1024 });
const second = listItem({ id: 'a2', number: 102, status: 'todo', boardOrder: 2048 });
const reviewing = listItem({ id: 'a3', number: 103, status: 'review', boardOrder: 1024 });

const cardsIn = (board: TaskBoard | undefined, status: string): string[] =>
  board?.columns.find((column) => column.status === status)?.items.map((item) => item.key) ?? [];

describe('taskQueryString', () => {
  it('sends the device’s own day with a due bucket', () => {
    const query = new URLSearchParams(
      taskQueryString({
        assigneeId: 'me',
        due: 'today',
        today: '2026-10-05',
        status: ['todo', 'done'],
      }),
    );
    expect(query.get('assigneeId')).toBe('me');
    expect(query.get('due')).toBe('today');
    expect(query.get('today')).toBe('2026-10-05');
    expect(query.get('status')).toBe('todo,done');
  });

  it('leaves out what is not asked for', () => {
    expect(taskQueryString({})).toBe('');
    expect(taskQueryString({ q: '   ', page: 1 })).toBe('');
  });

  it('keys a task the same whatever case its key is typed in', () => {
    expect(taskDetailKey('iaa-7')).toEqual(taskDetailKey('IAA-7'));
  });
});

describe('applyMove', () => {
  const board = boardOf([first, second, reviewing]);

  it('moves a card between columns and keeps both totals right', () => {
    const moved = applyMove(board, { task: first, status: 'review', boardOrder: 512 });
    expect(cardsIn(moved, 'todo')).toEqual(['IAA-102']);
    expect(cardsIn(moved, 'review')).toEqual(['IAA-101', 'IAA-103']);
    expect(moved.columns.find((column) => column.status === 'todo')?.total).toBe(1);
    expect(moved.columns.find((column) => column.status === 'review')?.total).toBe(2);
  });

  it('reorders within a column by the new position', () => {
    const moved = applyMove(board, { task: first, status: 'todo', boardOrder: 3000 });
    expect(cardsIn(moved, 'todo')).toEqual(['IAA-102', 'IAA-101']);
    expect(moved.columns.find((column) => column.status === 'todo')?.total).toBe(2);
  });

  it('leaves the board alone for a card it does not hold', () => {
    const stranger = listItem({ id: 'zz', status: 'todo' });
    expect(applyMove(board, { task: stranger, status: 'done', boardOrder: 1 })).toBe(board);
  });
});

describe('useMoveTask', () => {
  const setup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(taskBoardKey(''), boardOf([first, second, reviewing]));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useMoveTask(), { wrapper });
    const board = (): TaskBoard | undefined => client.getQueryData<TaskBoard>(taskBoardKey(''));
    return { client, result, board };
  };

  it('shows the move at once and keeps it when the server agrees', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    vi.mocked(api.patch).mockReturnValue(new Promise((done) => (resolve = done)));
    const { result, board } = setup();

    act(() => result.current.mutate({ task: first, status: 'done', boardOrder: 1024 }));

    await waitFor(() => expect(cardsIn(board(), 'done')).toEqual(['IAA-101']));
    expect(api.patch).toHaveBeenCalledWith(`/admin/tasks/${first.id}/move`, {
      status: 'done',
      boardOrder: 1024,
    });
    await act(async () => resolve({ ...first, status: 'done' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('puts the card back exactly where it was when the server refuses', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Server says no'));
    const { result, board } = setup();
    const before = board();

    act(() => result.current.mutate({ task: second, status: 'blocked', boardOrder: 1 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(board()).toEqual(before);
    expect(cardsIn(board(), 'todo')).toEqual(['IAA-101', 'IAA-102']);
    expect(result.current.error?.message).toBe('Server says no');
  });
});

import type { Task } from '@iaa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';

import { fullTask } from './task-test-fixtures';
import { useInlineSave } from './use-inline-save';

vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const task: Task = fullTask({ id: 'd'.repeat(24), key: 'IAA-7' });

/** A promise the test settles by hand, as a slow server would. */
const deferred = (): { promise: Promise<Task>; resolve: (task: Task) => void } => {
  let resolve: (value: Task) => void = () => undefined;
  const promise = new Promise<Task>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

const renderSave = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useInlineSave(task), { wrapper });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useInlineSave', () => {
  it('sends a second change to a field only once the first has settled', async () => {
    const first = deferred();
    vi.mocked(api.patch)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ ...task, dueDate: '2026-10-25T12:00:00.000Z' });
    const { result } = renderSave();

    let saves: Promise<boolean>[] = [];
    act(() => {
      saves = [
        result.current.save({ dueDate: '2026-10-02T12:00:00.000Z' }, 'Due date'),
        result.current.save({ dueDate: '2026-10-25T12:00:00.000Z' }, 'Due date'),
      ];
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    // The newer value shows while the older one is still on its way.
    expect(result.current.current.dueDate).toBe('2026-10-25T12:00:00.000Z');
    // Held back: sent now, it could land before the first and be overwritten.
    await act(async () => {
      await new Promise((settle) => setTimeout(settle, 20));
    });
    expect(api.patch).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve({ ...task, dueDate: '2026-10-02T12:00:00.000Z' });
      await Promise.all(saves);
    });
    expect(api.patch).toHaveBeenCalledTimes(2);
    expect(api.patch).toHaveBeenLastCalledWith(`/admin/tasks/${task.id}`, {
      dueDate: '2026-10-25T12:00:00.000Z',
    });
  });

  it('drops a waiting change once a newer one to the same field replaces it', async () => {
    const first = deferred();
    vi.mocked(api.patch).mockReturnValueOnce(first.promise).mockResolvedValue(task);
    const { result } = renderSave();

    let saves: Promise<boolean>[] = [];
    act(() => {
      saves = [
        result.current.save({ status: 'in-progress' }, 'Status'),
        result.current.save({ status: 'review' }, 'Status'),
        result.current.save({ status: 'done' }, 'Status'),
      ];
    });
    await act(async () => {
      first.resolve({ ...task, status: 'in-progress' });
      await Promise.all(saves);
    });
    expect(vi.mocked(api.patch).mock.calls.map(([, body]) => body)).toEqual([
      { status: 'in-progress' },
      { status: 'done' },
    ]);
  });

  it('saves different fields side by side', async () => {
    const first = deferred();
    vi.mocked(api.patch).mockReturnValueOnce(first.promise).mockResolvedValue(task);
    const { result } = renderSave();

    act(() => {
      void result.current.save({ status: 'review' }, 'Status');
      void result.current.save({ priority: 'high' }, 'Priority');
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    await act(async () => first.resolve(task));
  });
});

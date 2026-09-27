import type { Project } from '@iaa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { projectFixture } from '../pages/projects/project-test-helpers';

import { api } from './api-client';
import {
  projectActivity,
  projectKey,
  projectListPath,
  projectPath,
  PROJECTS_QUERY_KEY,
  useChangeProjectStatus,
  useDeleteProject,
  useUpdateProject,
} from './projects';

vi.mock('./api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// 23:30 on 5 October wherever the tests run: the device's day, whatever UTC says.
const setDeviceDay = (): void => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 5, 23, 30));
};

describe('projectListPath', () => {
  beforeEach(setDeviceDay);

  it("asks for the page, size and sort with the device's day, leaving empty filters out", () => {
    expect(projectListPath({ view: 'all', page: 2, q: '  ', status: '', priority: '' })).toBe(
      '/admin/projects?page=2&pageSize=12&sort=updated&today=2026-10-05',
    );
  });

  it('turns the tabs into the API filters', () => {
    expect(projectListPath({ view: 'mine', page: 1 })).toContain('mine=true');
    const archived = projectListPath({ view: 'archived', page: 1, status: 'active' });
    // The archived tab is the archived status, whatever the status filter says.
    expect(archived).toContain('status=archived');
    expect(archived).not.toContain('status=active');
  });

  it('passes search and filters through', () => {
    const path = projectListPath({
      view: 'all',
      page: 1,
      q: 'hub & co',
      status: 'active',
      priority: 'urgent',
      programme: 'digital-skills',
      sort: 'title',
    });
    const params = new URL(path, 'http://localhost').searchParams;
    expect(Object.fromEntries(params)).toEqual({
      page: '1',
      pageSize: '12',
      sort: 'title',
      q: 'hub & co',
      status: 'active',
      priority: 'urgent',
      programme: 'digital-skills',
      today: '2026-10-05',
    });
  });
});

describe('projectPath', () => {
  beforeEach(setDeviceDay);

  it("sends the device's day, so the overdue count is the reader's", () => {
    expect(projectPath('p1')).toBe('/admin/projects/p1?today=2026-10-05');
  });
});

describe('project query keys', () => {
  it('start with the module key, so one invalidation reaches them all', () => {
    expect(projectKey('p1').slice(0, 1)).toEqual([...PROJECTS_QUERY_KEY]);
    expect(projectActivity('p1')).toEqual({
      endpoint: '/admin/projects/p1/activity',
      queryKey: ['projects', 'activity', 'p1'],
    });
  });
});

describe('project writes refresh what the task forms show', () => {
  const project = projectFixture({ id: 'p1' });
  // The keys `lib/tasks` keeps its copies under: the milestone choice, the
  // project picker, and a task row that may carry an unlinked milestone.
  const taskProjectKey = ['tasks', 'project', 'p1'];
  const pickerKey = ['tasks', 'project-options', ''];
  const taskListKey = ['tasks', 'list', 'projectId=p1'];

  const setup = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(taskProjectKey, { id: 'p1', milestones: [{ id: 'launch' }] });
    client.setQueryData(pickerKey, { items: [], total: 0 });
    client.setQueryData(taskListKey, { items: [], total: 0 });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
  };

  const isStale = (client: QueryClient, key: readonly unknown[]): boolean | undefined =>
    client.getQueryState(key)?.isInvalidated;

  it('after the plan is saved', async () => {
    vi.mocked(api.patch).mockResolvedValue({ ...project, milestones: [] } satisfies Project);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProject(), { wrapper });
    await result.current.mutateAsync({ id: 'p1', body: { milestones: [] } });
    expect(isStale(client, taskProjectKey)).toBe(true);
    expect(isStale(client, pickerKey)).toBe(true);
    expect(isStale(client, taskListKey)).toBe(true);
  });

  it('after the project is archived', async () => {
    vi.mocked(api.patch).mockResolvedValue({ ...project, status: 'archived' } satisfies Project);
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useChangeProjectStatus(), { wrapper });
    await result.current.mutateAsync({ id: 'p1', status: 'archived' });
    expect(isStale(client, taskProjectKey)).toBe(true);
    expect(isStale(client, pickerKey)).toBe(true);
  });

  it('after the project is deleted, dropping the copy of it', async () => {
    vi.mocked(api.delete).mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    client.setQueryData(projectKey('p1'), project);
    const { result } = renderHook(() => useDeleteProject(), { wrapper });
    await result.current.mutateAsync('p1');
    expect(client.getQueryState(taskProjectKey)).toBeUndefined();
    expect(client.getQueryState(projectKey('p1'))).toBeUndefined();
    expect(isStale(client, pickerKey)).toBe(true);
    expect(isStale(client, taskListKey)).toBe(true);
  });
});

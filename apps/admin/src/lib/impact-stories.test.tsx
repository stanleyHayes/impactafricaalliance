import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { api } from './api-client';
import { storyStatusActions, useCreateStoryFromProject } from './impact-stories';

vi.mock('./api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const labels = (status: Parameters<typeof storyStatusActions>[0], isAdmin: boolean): string[] =>
  storyStatusActions(status, { isAdmin }).map((action) => action.label);

describe('the status buttons each role is offered', () => {
  it('lets an editor move a story between draft and review, never onto or off the site', () => {
    expect(labels('draft', false)).toEqual(['Submit for review']);
    expect(labels('in-review', false)).toEqual(['Return to draft']);
    expect(labels('published', false)).toEqual([]);
    // Bringing an archived story back as a draft publishes nothing, so the
    // shared rule leaves it open to editors.
    expect(labels('archived', false)).toEqual(['Restore as draft']);
  });

  it('gives an administrator publishing, unpublishing, archiving and restoring', () => {
    expect(labels('draft', true)).toEqual(['Submit for review', 'Publish', 'Archive']);
    expect(labels('in-review', true)).toEqual(['Return to draft', 'Publish', 'Archive']);
    expect(labels('published', true)).toEqual(['Unpublish', 'Archive']);
    expect(labels('archived', true)).toEqual(['Restore as draft']);
  });

  it('asks first before publishing, unpublishing or archiving', () => {
    const confirmed = (status: Parameters<typeof storyStatusActions>[0]): boolean[] =>
      storyStatusActions(status, { isAdmin: true }).map((action) => action.confirm);
    expect(confirmed('published')).toEqual([true, true]);
    expect(confirmed('in-review')).toEqual([false, true, true]);
    expect(confirmed('archived')).toEqual([false]);
  });
});

describe('after a story is written', () => {
  it('refreshes the projects as well, whose story counts have changed', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(api.post).mockResolvedValue({ id: 'story-1' });
    const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateStoryFromProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('64b000000000000000000009');
    });

    const prefixes = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(prefixes).toEqual(expect.arrayContaining([['impact-stories'], ['projects']]));
  });
});

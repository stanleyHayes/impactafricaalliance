import { describe, expect, it } from 'vitest';

import { projectActivity, projectKey, projectListPath, PROJECTS_QUERY_KEY } from './projects';

describe('projectListPath', () => {
  it('asks for the page, size and sort, leaving empty filters out', () => {
    expect(projectListPath({ view: 'all', page: 2, q: '  ', status: '', priority: '' })).toBe(
      '/admin/projects?page=2&pageSize=12&sort=updated',
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
    });
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

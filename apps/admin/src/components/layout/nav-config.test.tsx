import type { PublicUser } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import { buildNavGroups, type NavGroup } from './nav-config';

const userWith = (permissions: string[], role: 'admin' | 'editor' = 'editor'): PublicUser =>
  ({ id: 'u1', name: 'Ama Mensah', email: 'ama@example.org', role, permissions }) as PublicUser;

const group = (groups: NavGroup[], title: string): NavGroup | undefined =>
  groups.find((candidate) => candidate.title === title);

const labels = (groups: NavGroup[], title: string): string[] =>
  group(groups, title)?.items.map((item) => item.label) ?? [];

describe('work module navigation', () => {
  it('adds Work and Applications between Overview and Content', () => {
    const groups = buildNavGroups(
      userWith([
        'projects:read',
        'tasks:read',
        'forms:read',
        'applications:read',
        'impact-stories:read',
        'stories:read',
      ]),
    );
    expect(groups.map((candidate) => candidate.title).slice(0, 4)).toEqual([
      'Overview',
      'Work',
      'Applications',
      'Content',
    ]);
    expect(labels(groups, 'Work')).toEqual(['Projects', 'Tasks']);
    expect(labels(groups, 'Applications')).toEqual(['Forms', 'Applications', 'Review queue']);
  });

  it('lists Impact stories in Content ahead of the CMS lists, and calls the old stories Testimonials', () => {
    const groups = buildNavGroups(userWith(['impact-stories:read', 'stories:read']));
    const content = labels(groups, 'Content');
    expect(content[0]).toBe('Impact stories');
    expect(content).toContain('Testimonials');
    expect(content).not.toContain('Impact Stories');
  });

  it('hides each item without its read permission', () => {
    const groups = buildNavGroups(userWith(['tasks:read', 'forms:read']));
    expect(labels(groups, 'Work')).toEqual(['Tasks']);
    // Applications holds personal data; an editor without the grant sees only Forms.
    expect(labels(groups, 'Applications')).toEqual(['Forms']);
    expect(labels(buildNavGroups(userWith(['submissions:read'])), 'Content')).not.toContain(
      'Impact stories',
    );
  });

  it('drops a group with nothing in it', () => {
    const groups = buildNavGroups(userWith(['submissions:read']));
    expect(group(groups, 'Work')).toBeUndefined();
    expect(group(groups, 'Applications')).toBeUndefined();
  });

  it('shows the due-task and new-application counts as badges', () => {
    const groups = buildNavGroups(userWith(['tasks:read', 'applications:read']), {
      tasksDue: 3,
      applicationsNew: 5,
    });
    const tasks = group(groups, 'Work')?.items.find((item) => item.label === 'Tasks');
    const applications = group(groups, 'Applications')?.items.find(
      (item) => item.label === 'Applications',
    );
    expect(tasks?.badge).toBe(3);
    expect(applications?.badge).toBe(5);
    expect(applications?.end).toBe(true);
  });
});

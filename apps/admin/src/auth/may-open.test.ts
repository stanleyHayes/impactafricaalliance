import type { PublicUser } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import { mayOpenPath } from './may-open';

const person = (role: 'admin' | 'editor', permissions: string[]): PublicUser =>
  ({ id: 'u1', name: 'Ama Mensah', role, permissions }) as unknown as PublicUser;

describe('which pages someone may open', () => {
  it('needs the read permission named by the first segment', () => {
    const editor = person('editor', ['tasks:read']);
    expect(mayOpenPath(editor, '/tasks/all')).toBe(true);
    expect(mayOpenPath(editor, '/projects/p1')).toBe(false);
  });

  it('reads CMS collections from the second segment, ignoring a query or anchor', () => {
    const editor = person('editor', ['team:read']);
    expect(mayOpenPath(editor, '/content/team?tier=ambassador')).toBe(true);
    expect(mayOpenPath(editor, '/content/articles#top')).toBe(false);
  });

  it('counts notifications as submissions', () => {
    expect(mayOpenPath(person('editor', []), '/account/notifications')).toBe(false);
    expect(mayOpenPath(person('editor', ['submissions:read']), '/account/notifications')).toBe(
      true,
    );
    expect(mayOpenPath(person('editor', []), '/account/settings')).toBe(true);
  });

  it('keeps donations, users and social connections for administrators', () => {
    const editor = person('editor', ['donations:read', 'users:read']);
    expect(mayOpenPath(editor, '/donations')).toBe(false);
    expect(mayOpenPath(editor, '/users')).toBe(false);
    expect(mayOpenPath(editor, '/social-connections')).toBe(false);
    const admin = person('admin', ['donations:read']);
    expect(mayOpenPath(admin, '/donations')).toBe(true);
    expect(mayOpenPath(admin, '/users')).toBe(false);
    expect(mayOpenPath(admin, '/social-connections')).toBe(true);
  });

  it('opens the media library with its own permission', () => {
    expect(mayOpenPath(person('editor', ['media-library:read']), '/media')).toBe(true);
    expect(mayOpenPath(person('editor', ['media:create']), '/media')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { ADMIN_RESOURCES, EDITOR_READ_EXCLUDED, ROLE_TEMPLATES, UserRole } from './enums.js';

const editor = ROLE_TEMPLATES[UserRole.Editor];

describe('the editor role template', () => {
  it('does not let every editor read applicant data', () => {
    expect(EDITOR_READ_EXCLUDED).toEqual(['applications']);
    expect(editor).not.toContain('applications:read');
    expect(editor.some((permission) => permission.startsWith('applications:'))).toBe(false);
  });

  // The permission matrix reads this list to explain the gap; a push from
  // anywhere would silently widen or narrow it for the rest of the process.
  it('keeps the exclusion list fixed', () => {
    expect(Object.isFrozen(EDITOR_READ_EXCLUDED)).toBe(true);
  });

  it('still reads everything else', () => {
    for (const resource of ADMIN_RESOURCES.filter((key) => key !== 'applications')) {
      expect(editor).toContain(`${resource}:read`);
    }
  });

  it('creates and updates the new work modules', () => {
    for (const resource of ['projects', 'tasks', 'forms', 'impact-stories'] as const) {
      expect(editor).toContain(`${resource}:create`);
      expect(editor).toContain(`${resource}:update`);
    }
  });

  it('never deletes', () => {
    expect(editor.some((permission) => permission.endsWith(':delete'))).toBe(false);
  });

  it('leaves administrators with everything, applications included', () => {
    expect(ROLE_TEMPLATES[UserRole.Admin]).toEqual(
      expect.arrayContaining(['applications:read', 'applications:update', 'impact-stories:delete']),
    );
  });
});

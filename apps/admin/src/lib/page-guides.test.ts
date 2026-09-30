import { describe, expect, it } from 'vitest';

import { pageGuides } from './page-guides';

/** A guide's steps as one string, to search for the words a screen uses. */
const guideText = (key: string): string => {
  const guide = pageGuides[key];
  if (!guide) throw new Error(`No guide called ${key}`);
  return guide.steps.join(' ');
};

// The guides must use the words on the screens they describe, or a reader
// looks for a group or a button that is not there. These are the labels as
// the screens print them.
describe('page guides', () => {
  it('names the My tasks groups and the Show completed switch as the page does', () => {
    // MyTasksPage section titles, and its switch.
    const text = guideText('my-tasks');
    for (const title of ['Overdue', 'Due today', 'Upcoming', 'No due date', 'Show completed']) {
      expect(text).toContain(title);
    }
    expect(text).not.toMatch(/\bNo date\b/);
  });

  it('points to the Move menu on a board card, not buttons that do not exist', () => {
    // BoardCard has one "…" menu button, labelled "Move IAA-n".
    const text = guideText('task-board');
    expect(text).toContain('Move menu');
    expect(text).not.toContain('move buttons');
  });

  it('names the No due date group in the task editor guide', () => {
    expect(guideText('task-editor')).toContain('No due date');
  });

  it('calls shareable photos what the media tab calls them', () => {
    // ProjectMediaTab and the photo dialog say "Cleared for public use".
    const text = guideText('project-detail');
    expect(text).toContain('Cleared for public use');
    expect(text).not.toMatch(/\bshareable\b/);
  });
});

describe('the site images guide', () => {
  it('names the actions and badges the slot cards show', () => {
    // SiteImageSlotCard's buttons and status chips.
    const text = guideText('site-images');
    for (const word of [
      'Replace',
      'Edit alt text',
      'Reset to default',
      'Default',
      'Shared upload',
    ]) {
      expect(text).toContain(word);
    }
  });
});

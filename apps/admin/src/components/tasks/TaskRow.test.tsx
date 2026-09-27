import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { listItem, person } from './task-test-fixtures';
import { TaskRow } from './TaskRow';

afterEach(cleanup);

const project = { id: 'e'.repeat(24), title: 'Girls in STEM', slug: 'girls-in-stem' };

const renderRow = (...args: Parameters<typeof listItem>) => {
  const task = listItem(...args);
  render(
    <ThemeProvider theme={theme}>
      <ul>
        <TaskRow task={task} onOpen={vi.fn()} showStatus={false} />
      </ul>
    </ThemeProvider>,
  );
  return task;
};

describe('TaskRow', () => {
  it('is named by key and title, and describes everything else the row shows', () => {
    renderRow({
      number: 1,
      title: 'Book venue for hub five',
      status: 'todo',
      priority: 'high',
      dueDate: '2020-09-24T12:00:00.000Z',
      project,
      projectId: project.id,
      checklistDone: 2,
      checklistTotal: 5,
      commentCount: 1,
      assignees: [person('b'.repeat(24), 'Ama Mensah')],
    });
    const row = screen.getByRole('button', { name: 'IAA-1 Book venue for hub five' });
    // The status is said even in a list grouped by status, where no chip shows it.
    // "Sept" or "Sep", as the runtime's date data spells it.
    expect(row).toHaveAccessibleDescription(
      /^To do\. High priority\. Overdue · 24 Sept? 2020\. Girls in STEM\. 2 of 5 checklist items done\. 1 comment\. Assigned to Ama Mensah$/,
    );
  });

  it('says when nobody has the task', () => {
    renderRow({ number: 2, title: 'Order the banners', priority: 'low' });
    expect(
      screen.getByRole('button', { name: 'IAA-2 Order the banners' }),
    ).toHaveAccessibleDescription(/To do.*Low priority.*Unassigned/);
  });

  it('marks finished work without fading the row below readable contrast', () => {
    renderRow({ number: 3, title: 'Write the brief', status: 'done' });
    const row = screen.getByRole('button', { name: 'IAA-3 Write the brief' });
    expect(Number(getComputedStyle(row).opacity || '1')).toBe(1);
    expect(screen.getByText('Write the brief')).toHaveStyle({ textDecoration: 'line-through' });
  });
});

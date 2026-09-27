import type { WorkPriority } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { theme } from '../../theme/theme';
import { ProjectPriorityChip } from '../projects/ProjectChips';

import { TaskPriorityChip } from './TaskPriorityChip';

afterEach(cleanup);

/** The chip's variant and colour, as MUI names them in its classes. */
const lookOf = (element: HTMLElement): string[] =>
  Array.from(element.closest('.MuiChip-root')?.classList ?? []).filter((name) =>
    /^MuiChip-(outlined|filled|color)/.test(name),
  );

describe('priority chips', () => {
  it.each<WorkPriority>(['low', 'medium', 'high', 'urgent'])(
    'draws %s the same on a task and on a project',
    (priority) => {
      render(
        <ThemeProvider theme={theme}>
          <TaskPriorityChip priority={priority} />
          <ProjectPriorityChip priority={priority} />
        </ThemeProvider>,
      );
      const [task, project] = screen.getAllByText(/^(Low|Medium|High|Urgent)/);
      if (!task || !project) throw new Error('Both chips should render');
      expect(lookOf(task)).toEqual(lookOf(project));
      expect(project).toHaveTextContent(/priority$/);
    },
  );

  it('fills the levels that need attention and keeps the others quiet', () => {
    render(
      <ThemeProvider theme={theme}>
        <TaskPriorityChip priority="high" />
        <TaskPriorityChip priority="medium" />
      </ThemeProvider>,
    );
    expect(lookOf(screen.getByText('High'))).toEqual(
      expect.arrayContaining(['MuiChip-filled', 'MuiChip-colorWarning']),
    );
    expect(lookOf(screen.getByText('Medium'))).toContain('MuiChip-outlined');
  });
});

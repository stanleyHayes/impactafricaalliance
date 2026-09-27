import { describe, expect, it } from 'vitest';

import {
  emptyTaskForm,
  formToInput,
  formToPatch,
  taskStepErrors,
  taskToForm,
  wholeFormProblem,
} from './task-form';
import { fullTask } from './task-test-fixtures';

const task = fullTask({
  id: 'd'.repeat(24),
  title: 'Print the programmes',
  dueDate: '2026-10-05T12:00:00.000Z',
  estimateHours: 3,
  labels: ['print'],
});

describe('task form steps', () => {
  it('checks each step on its own', () => {
    const form = { ...emptyTaskForm(), title: 'No', estimate: 'lots' };
    expect(taskStepErrors(form, 0).title).toMatch(/three characters/);
    expect(taskStepErrors(form, 1)).toEqual({});
    expect(taskStepErrors(form, 2).estimate).toMatch(/number of hours/);
    expect(
      taskStepErrors(
        { ...form, startDate: '2026-10-09T12:00:00.000Z', dueDate: '2026-10-01T12:00:00.000Z' },
        2,
      ).dueDate,
    ).toMatch(/before the start date/);
  });

  it('sends the reader back to the first step with a problem', () => {
    const form = { ...emptyTaskForm(), title: 'Book the venue', estimate: '-1' };
    expect(wholeFormProblem(form)).toMatchObject({ step: 2 });
    expect(wholeFormProblem({ ...form, estimate: '' })).toBeNull();
  });

  it('leaves empty optional values out of a new task', () => {
    const input = formToInput({ ...emptyTaskForm('e'.repeat(24)), title: '  Book the venue ' });
    expect(input).toEqual({
      title: 'Book the venue',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigneeIds: [],
      labels: [],
      dependencyIds: [],
      projectId: 'e'.repeat(24),
    });
  });
});

describe('formToPatch', () => {
  it('sends nothing for an untouched task', () => {
    expect(formToPatch(taskToForm(task), task)).toEqual({});
  });

  it('sends only the changes, with cleared values as null', () => {
    const form = {
      ...taskToForm(task),
      title: 'Print 200 programmes',
      dueDate: null,
      estimate: '',
    };
    expect(formToPatch(form, task)).toEqual({
      title: 'Print 200 programmes',
      dueDate: null,
      estimateHours: null,
    });
  });
});

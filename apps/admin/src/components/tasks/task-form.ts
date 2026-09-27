import {
  taskInputSchema,
  type ProjectRef,
  type Task,
  type TaskInput,
  type TaskRef,
  type TaskStatus,
  type TaskUpdate,
  type WorkPriority,
} from '@iaa/shared';

/**
 * The stepwise task form (`/tasks/new`, `/tasks/:taskKey/edit`): its steps,
 * its state, what each step checks and what is sent. Creating and editing
 * share all of it (AGENTS.md).
 */

export const TASK_FORM_STEPS = ['Basics', 'Assignment', 'Schedule', 'Details', 'Review'] as const;
export const TASK_REVIEW_STEP = TASK_FORM_STEPS.length - 1;

export interface TaskFormState {
  title: string;
  description: string;
  assigneeIds: string[];
  projectId: string | null;
  /** The chosen project's name, when known, so the picker need not look it up. */
  project: ProjectRef | null;
  milestoneId: string | null;
  parent: TaskRef | null;
  startDate: string | null;
  dueDate: string | null;
  /** As typed, so a half-typed number is not lost; checked on Continue. */
  estimate: string;
  status: TaskStatus;
  priority: WorkPriority;
  labels: string[];
  dependencies: TaskRef[];
}

export type TaskFormField = keyof TaskFormState;
export type TaskFormErrors = Partial<Record<TaskFormField, string>>;

/** Which step each field is on, to return to the right one when saving finds a problem. */
export const STEP_OF_FIELD: Record<TaskFormField, number> = {
  title: 0,
  description: 0,
  assigneeIds: 1,
  projectId: 1,
  project: 1,
  milestoneId: 1,
  parent: 1,
  startDate: 2,
  dueDate: 2,
  estimate: 2,
  status: 3,
  priority: 3,
  labels: 3,
  dependencies: 3,
};

export const emptyTaskForm = (projectId?: string | null): TaskFormState => ({
  title: '',
  description: '',
  assigneeIds: [],
  projectId: projectId ?? null,
  project: null,
  milestoneId: null,
  parent: null,
  startDate: null,
  dueDate: null,
  estimate: '',
  status: 'todo',
  priority: 'medium',
  labels: [],
  dependencies: [],
});

export const taskToForm = (task: Task): TaskFormState => ({
  title: task.title,
  description: task.description,
  assigneeIds: task.assigneeIds,
  projectId: task.projectId ?? null,
  project: task.project ?? null,
  milestoneId: task.milestoneId ?? null,
  parent: task.parent ?? null,
  startDate: task.startDate ?? null,
  dueDate: task.dueDate ?? null,
  estimate:
    task.estimateHours === null || task.estimateHours === undefined
      ? ''
      : String(task.estimateHours),
  status: task.status,
  priority: task.priority,
  labels: task.labels,
  dependencies: task.dependencies,
});

const ESTIMATE_MAX = 1000;

const estimateValue = (text: string): number | null | 'invalid' => {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 && value <= ESTIMATE_MAX ? value : 'invalid';
};

const basicsErrors = (form: TaskFormState): TaskFormErrors => {
  const errors: TaskFormErrors = {};
  const title = form.title.trim();
  if (title.length < 3) errors.title = 'Give the task a title of at least three characters.';
  else if (title.length > 200) errors.title = 'Keep the title under 200 characters.';
  if (form.description.length > 20000) {
    errors.description = 'Keep the description under 20,000 characters.';
  }
  return errors;
};

const assignmentErrors = (form: TaskFormState): TaskFormErrors => {
  const errors: TaskFormErrors = {};
  if (form.assigneeIds.length > 10) errors.assigneeIds = 'Assign at most ten people.';
  if (form.milestoneId && !form.projectId) {
    errors.milestoneId = 'Choose a project before choosing one of its milestones.';
  }
  return errors;
};

const scheduleErrors = (form: TaskFormState): TaskFormErrors => {
  const errors: TaskFormErrors = {};
  if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
    errors.dueDate = 'The due date cannot be before the start date.';
  }
  if (estimateValue(form.estimate) === 'invalid') {
    errors.estimate = `Enter a number of hours from 0 to ${ESTIMATE_MAX}, or leave it empty.`;
  }
  return errors;
};

const detailsErrors = (form: TaskFormState): TaskFormErrors => {
  const errors: TaskFormErrors = {};
  if (form.labels.length > 12) errors.labels = 'Use at most twelve labels.';
  else if (form.labels.some((label) => label.length > 40)) {
    errors.labels = 'Keep each label under 40 characters.';
  }
  if (form.dependencies.length > 20) errors.dependencies = 'Choose at most twenty tasks.';
  return errors;
};

const STEP_CHECKS: ((form: TaskFormState) => TaskFormErrors)[] = [
  basicsErrors,
  assignmentErrors,
  scheduleErrors,
  detailsErrors,
  () => ({}),
];

/** The problems on one step, by field. Empty when the step can be left. */
export const taskStepErrors = (form: TaskFormState, step: number): TaskFormErrors =>
  STEP_CHECKS[step]?.(form) ?? {};

/** What a new task is created with. */
export const formToInput = (form: TaskFormState): Partial<TaskInput> => {
  const estimate = estimateValue(form.estimate);
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    priority: form.priority,
    assigneeIds: form.assigneeIds,
    labels: form.labels,
    dependencyIds: form.dependencies.map((task) => task.id),
    ...(form.projectId ? { projectId: form.projectId } : {}),
    ...(form.projectId && form.milestoneId ? { milestoneId: form.milestoneId } : {}),
    ...(form.parent ? { parentTaskId: form.parent.id } : {}),
    ...(form.startDate ? { startDate: form.startDate } : {}),
    ...(form.dueDate ? { dueDate: form.dueDate } : {}),
    ...(typeof estimate === 'number' ? { estimateHours: estimate } : {}),
  };
};

/**
 * Every rule in `taskInputSchema`, the same one the API applies, run over the
 * whole form before saving. Returns the first problem with the step it is on,
 * or null when the form can be saved.
 */
export const wholeFormProblem = (form: TaskFormState): { step: number; message: string } | null => {
  for (let step = 0; step < TASK_REVIEW_STEP; step += 1) {
    const errors = Object.values(taskStepErrors(form, step));
    if (errors[0]) return { step, message: errors[0] };
  }
  const parsed = taskInputSchema.safeParse(formToInput(form));
  if (parsed.success) return null;
  const issue = parsed.error.issues[0];
  const field = String(issue?.path[0] ?? 'title');
  const fieldMap: Record<string, TaskFormField> = {
    projectId: 'projectId',
    milestoneId: 'milestoneId',
    parentTaskId: 'parent',
    dependencyIds: 'dependencies',
    estimateHours: 'estimate',
  };
  const formField = fieldMap[field] ?? (field as TaskFormField);
  return { step: STEP_OF_FIELD[formField] ?? 0, message: issue?.message ?? 'Check the task.' };
};

/** The API's field names (`taskInputSchema`) as the form holds them. */
const FORM_FIELD_OF_API: Record<string, TaskFormField> = {
  title: 'title',
  description: 'description',
  assigneeIds: 'assigneeIds',
  projectId: 'projectId',
  milestoneId: 'milestoneId',
  parentTaskId: 'parent',
  startDate: 'startDate',
  dueDate: 'dueDate',
  estimateHours: 'estimate',
  status: 'status',
  priority: 'priority',
  labels: 'labels',
  dependencyIds: 'dependencies',
};

interface DetailIssue {
  path: string;
  message: string;
}

const isDetailIssue = (value: unknown): value is DetailIssue =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as DetailIssue).path === 'string' &&
  typeof (value as DetailIssue).message === 'string';

/**
 * Where a save the API refused should send the reader: the earliest step with
 * a field the API named, and the message for each of that step's fields.
 *
 * The API checks what the browser cannot: that a colleague is still active, a
 * milestone belongs to the project, a parent would not make a loop. Its 400
 * names the field (`details[].path`), so the form can go back to it (AGENTS.md:
 * return to the relevant step). Null when the error names no field the form
 * has, such as a network failure; the page then shows the message as it is.
 */
export const serverTaskProblem = (
  error: unknown,
): { step: number; errors: TaskFormErrors; message: string } | null => {
  const details = (error as { details?: unknown } | null)?.details;
  const located = (Array.isArray(details) ? details : []).filter(isDetailIssue).flatMap((issue) => {
    const field = FORM_FIELD_OF_API[issue.path.split('.')[0] ?? ''];
    return field ? [{ field, message: issue.message }] : [];
  });
  const first = located[0];
  if (!first) return null;
  const step = Math.min(...located.map((entry) => STEP_OF_FIELD[entry.field]));
  const onStep = located.filter((entry) => STEP_OF_FIELD[entry.field] === step);
  return {
    step,
    errors: Object.fromEntries(onStep.map((entry) => [entry.field, entry.message])),
    message: onStep[0]?.message ?? first.message,
  };
};

type Comparable = string | number | null | readonly string[];

const same = (left: Comparable, right: Comparable): boolean =>
  Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length && left.every((value, index) => value === right[index])
    : left === right;

/** The editable fields of a task as the form would save them, empty values as null. */
const editableValues = (form: TaskFormState): Record<string, Comparable> => {
  const input = formToInput(form);
  return {
    title: input.title ?? '',
    description: input.description ?? '',
    status: form.status,
    priority: form.priority,
    assigneeIds: form.assigneeIds,
    labels: form.labels,
    dependencyIds: form.dependencies.map((ref) => ref.id),
    projectId: form.projectId,
    milestoneId: form.projectId ? form.milestoneId : null,
    parentTaskId: form.parent?.id ?? null,
    startDate: form.startDate,
    dueDate: form.dueDate,
    estimateHours: input.estimateHours ?? null,
  };
};

const storedValues = (task: Task): Record<string, Comparable> => ({
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assigneeIds: task.assigneeIds,
  labels: task.labels,
  dependencyIds: task.dependencyIds,
  projectId: task.projectId ?? null,
  milestoneId: task.milestoneId ?? null,
  parentTaskId: task.parentTaskId ?? null,
  startDate: task.startDate ?? null,
  dueDate: task.dueDate ?? null,
  estimateHours: task.estimateHours ?? null,
});

/**
 * Only what changed, for an edit. Sending the whole task would put back any
 * field a colleague changed in the drawer while this form was open. Cleared
 * values go as null, which the API reads as "remove".
 */
export const formToPatch = (form: TaskFormState, task: Task): TaskUpdate => {
  const next = editableValues(form);
  const stored = storedValues(task);
  const patch: Record<string, Comparable> = {};
  for (const [field, value] of Object.entries(next)) {
    if (!same(value, stored[field] ?? null)) patch[field] = value;
  }
  return patch as TaskUpdate;
};

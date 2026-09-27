import type { PersonSummary, Task, TaskStatus, WorkPriority } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { DateField } from '../../components/fields/DateField';
import { OptionSelect, type SelectChoice } from '../../components/fields/OptionSelect';
import { TagsField } from '../../components/fields/TagsField';
import { FormStepNavigation } from '../../components/forms/FormStepNavigation';
import { MarkdownEditor } from '../../components/markdown/MarkdownEditor';
import { PageHeader } from '../../components/PageHeader';
import { FormPageSkeleton } from '../../components/PageSkeleton';
import { UserPicker } from '../../components/people/UserPicker';
import { ProjectPicker } from '../../components/tasks/ProjectPicker';
import {
  formatCalendarDay,
  taskPriorityLabel,
  taskStatusLabel,
} from '../../components/tasks/task-display';
import {
  emptyTaskForm,
  formToInput,
  formToPatch,
  serverTaskProblem,
  TASK_FORM_STEPS,
  TASK_REVIEW_STEP,
  taskStepErrors,
  taskToForm,
  wholeFormProblem,
  type TaskFormErrors,
  type TaskFormState,
} from '../../components/tasks/task-form';
import { TaskPicker } from '../../components/tasks/TaskPicker';
import { ApiError } from '../../lib/api-client';
import { pageGuides } from '../../lib/page-guides';
import { usePeople } from '../../lib/people';
import { TASK_STATUS_OPTIONS, WORK_PRIORITY_OPTIONS } from '../../lib/select-options';
import { useCreateTask, useTask, useTaskProject, useUpdateTask } from '../../lib/tasks';

type SetField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => void;

interface StepProps {
  form: TaskFormState;
  set: SetField;
  errors: TaskFormErrors;
  disabled: boolean;
  taskId?: string;
}

const BasicsStep = ({ form, set, errors, disabled }: StepProps): JSX.Element => (
  <Stack spacing={3}>
    <TextField
      label="Title"
      value={form.title}
      onChange={(event) => set('title', event.target.value)}
      required
      fullWidth
      autoFocus
      disabled={disabled}
      error={Boolean(errors.title)}
      helperText={
        errors.title ?? 'Say what done looks like, such as "Book the venue for the launch".'
      }
      slotProps={{ htmlInput: { maxLength: 200 } }}
    />
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Description
      </Typography>
      <MarkdownEditor
        value={form.description}
        onChange={(value) => set('description', value)}
        error={errors.description}
        minRows={8}
      />
    </Box>
  </Stack>
);

const AssignmentStep = ({ form, set, errors, disabled, taskId }: StepProps): JSX.Element => {
  const project = useTaskProject(form.projectId);
  const milestones: SelectChoice[] = [
    {
      value: '',
      label: 'No milestone',
      description: 'The task belongs to the project as a whole.',
    },
    ...(project.data?.milestones ?? []).map((milestone) => ({
      value: milestone.id,
      label: milestone.title,
    })),
  ];
  return (
    <Stack spacing={3}>
      <UserPicker
        multiple
        max={10}
        label="Assignees"
        value={form.assigneeIds}
        onChange={(value) => set('assigneeIds', value)}
        error={errors.assigneeIds}
        disabled={disabled}
        helperText="Up to ten people. Only active colleagues are listed."
      />
      <ProjectPicker
        label="Project"
        value={form.projectId}
        known={form.project}
        onChange={(value) => {
          set('projectId', value);
          set('project', null);
          // A milestone belongs to one project.
          set('milestoneId', null);
        }}
        disabled={disabled}
        error={errors.projectId}
        helperText="Optional. Leave empty for work outside any project."
      />
      <OptionSelect
        label="Milestone"
        options={milestones}
        value={form.milestoneId ?? ''}
        onChange={(value) => set('milestoneId', value || null)}
        disabled={disabled || !form.projectId}
        placeholder={form.projectId ? 'No milestone' : 'Choose a project first'}
        error={errors.milestoneId}
        helperText={project.isError ? 'The milestones could not be loaded.' : undefined}
      />
      <TaskPicker
        label="Parent task"
        value={form.parent}
        excludeIds={taskId ? [taskId] : []}
        onChange={(value) => set('parent', value)}
        disabled={disabled}
        error={errors.parent}
        helperText="Optional. Makes this a subtask of a bigger piece of work."
      />
    </Stack>
  );
};

const ScheduleStep = ({ form, set, errors, disabled }: StepProps): JSX.Element => (
  <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <DateField
        label="Start date"
        value={form.startDate}
        onChange={(value) => set('startDate', value)}
        error={errors.startDate}
        disabled={disabled}
      />
      <DateField
        label="Due date"
        value={form.dueDate}
        onChange={(value) => set('dueDate', value)}
        error={errors.dueDate}
        minDate={form.startDate}
        disabled={disabled}
        helperText="A task without one appears under No due date."
      />
    </Stack>
    <TextField
      label="Estimate (hours)"
      type="number"
      value={form.estimate}
      onChange={(event) => set('estimate', event.target.value)}
      error={Boolean(errors.estimate)}
      helperText={errors.estimate ?? 'Optional. A rough guess is fine.'}
      disabled={disabled}
      slotProps={{ htmlInput: { min: 0, max: 1000, step: 0.5 } }}
      sx={{ maxWidth: 260 }}
    />
  </Stack>
);

const DetailsStep = ({ form, set, errors, disabled, taskId }: StepProps): JSX.Element => (
  <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <OptionSelect
        label="Status"
        options={TASK_STATUS_OPTIONS}
        value={form.status}
        onChange={(value) => set('status', value as TaskStatus)}
        error={errors.status}
        disabled={disabled}
      />
      <OptionSelect
        label="Priority"
        options={WORK_PRIORITY_OPTIONS}
        value={form.priority}
        onChange={(value) => set('priority', value as WorkPriority)}
        error={errors.priority}
        disabled={disabled}
      />
    </Stack>
    <TagsField
      label="Labels"
      value={form.labels}
      onChange={(value) => set('labels', value)}
      error={errors.labels}
    />
    <TaskPicker
      multiple
      label="Depends on"
      value={form.dependencies}
      excludeIds={taskId ? [taskId] : []}
      onChange={(value) => set('dependencies', value)}
      error={errors.dependencies}
      disabled={disabled}
      helperText="Optional. Tasks that must finish before this one can."
    />
  </Stack>
);

const ReviewRow = ({ label, children }: { label: string; children: ReactNode }): JSX.Element => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" component="p">
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
      {children}
    </Typography>
  </Box>
);

const ReviewGroup = ({
  title,
  step,
  onEdit,
  disabled,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  disabled: boolean;
  children: ReactNode;
}): JSX.Element => (
  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" component="h3">
        {title}
      </Typography>
      <Button
        size="small"
        startIcon={<EditOutlinedIcon />}
        onClick={() => onEdit(step)}
        disabled={disabled}
        aria-label={`Edit ${title.toLowerCase()}`}
      >
        Edit
      </Button>
    </Stack>
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      {children}
    </Box>
  </Box>
);

/** The first lines of the description, enough to recognise it. */
const excerpt = (text: string, length = 160): string => {
  const trimmed = text.trim();
  if (!trimmed) return 'None';
  return trimmed.length > length ? `${trimmed.slice(0, length)}…` : trimmed;
};

const orNone = (value: string | null | undefined, format = (text: string) => text): string =>
  value ? format(value) : 'None';

/** The chosen people by name, in the order chosen; a count until their names arrive. */
const assigneeSummary = (
  ids: readonly string[],
  people: readonly PersonSummary[] | undefined,
): string => {
  if (ids.length === 0) return 'Nobody yet';
  const byId = new Map((people ?? []).map((person) => [person.id, person.name]));
  const names = ids.map((id) => byId.get(id));
  if (names.some((name) => name === undefined)) return `${ids.length} chosen`;
  return names.join(', ');
};

const ReviewStep = ({
  form,
  onEdit,
  disabled,
}: {
  form: TaskFormState;
  onEdit: (step: number) => void;
  disabled: boolean;
}): JSX.Element => {
  const project = useTaskProject(form.projectId);
  const people = usePeople(form.assigneeIds);
  const projectName = form.project?.title ?? project.data?.title;
  const milestone = project.data?.milestones.find((item) => item.id === form.milestoneId);
  return (
    <Stack spacing={2}>
      <ReviewGroup title="Basics" step={0} onEdit={onEdit} disabled={disabled}>
        <ReviewRow label="Title">{form.title.trim()}</ReviewRow>
        <ReviewRow label="Description">{excerpt(form.description)}</ReviewRow>
      </ReviewGroup>
      <ReviewGroup title="Assignment" step={1} onEdit={onEdit} disabled={disabled}>
        <ReviewRow label="Assignees">{assigneeSummary(form.assigneeIds, people.data)}</ReviewRow>
        <ReviewRow label="Project">
          {form.projectId ? (projectName ?? 'Loading…') : 'None'}
        </ReviewRow>
        <ReviewRow label="Milestone">{milestone?.title ?? 'None'}</ReviewRow>
        <ReviewRow label="Parent task">
          {form.parent ? `${form.parent.key}: ${form.parent.title}` : 'None'}
        </ReviewRow>
      </ReviewGroup>
      <ReviewGroup title="Schedule" step={2} onEdit={onEdit} disabled={disabled}>
        <ReviewRow label="Start date">{orNone(form.startDate, formatCalendarDay)}</ReviewRow>
        <ReviewRow label="Due date">{orNone(form.dueDate, formatCalendarDay)}</ReviewRow>
        <ReviewRow label="Estimate">
          {form.estimate.trim() ? `${form.estimate} hours` : 'None'}
        </ReviewRow>
      </ReviewGroup>
      <ReviewGroup title="Details" step={3} onEdit={onEdit} disabled={disabled}>
        <ReviewRow label="Status">{taskStatusLabel(form.status)}</ReviewRow>
        <ReviewRow label="Priority">{taskPriorityLabel(form.priority)}</ReviewRow>
        <ReviewRow label="Labels">
          {form.labels.length === 0 ? (
            'None'
          ) : (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {form.labels.map((label) => (
                <Chip key={label} size="small" label={label} />
              ))}
            </Stack>
          )}
        </ReviewRow>
        <ReviewRow label="Depends on">
          {form.dependencies.length === 0
            ? 'None'
            : form.dependencies.map((task) => task.key).join(', ')}
        </ReviewRow>
      </ReviewGroup>
    </Stack>
  );
};

const submitLabel = (saving: boolean, step: number, editing: boolean): string => {
  if (saving) return 'Saving…';
  if (step < TASK_REVIEW_STEP) return 'Continue';
  return editing ? 'Update task' : 'Create task';
};

const STEP_VIEWS = [BasicsStep, AssignmentStep, ScheduleStep, DetailsStep];

const TaskEditorForm = ({
  task,
  initialProjectId,
}: {
  task?: Task;
  initialProjectId: string | null;
}): JSX.Element => {
  const navigate = useNavigate();
  const create = useCreateTask();
  const update = useUpdateTask();
  const [form, setForm] = useState<TaskFormState>(() =>
    task ? taskToForm(task) : emptyTaskForm(initialProjectId),
  );
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(task ? TASK_REVIEW_STEP : 0);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;
  const firstRender = useRef(true);

  useEffect(() => {
    // Focus follows the step, but not on arrival: the title field has it then.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const set: SetField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    setProblem(null);
  };

  const changeStep = (next: number): void => {
    if (saving) return;
    if (next > step) {
      const found = taskStepErrors(form, step);
      if (Object.values(found).some(Boolean)) {
        setErrors(found);
        setProblem('Check the highlighted fields before continuing.');
        return;
      }
    }
    setErrors({});
    setProblem(null);
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
  };

  const save = (): void => {
    const found = wholeFormProblem(form);
    if (found) {
      setStep(found.step);
      setErrors(taskStepErrors(form, found.step));
      setProblem(found.message);
      return;
    }
    const done = (saved: Task): void => {
      navigate(`/tasks/${saved.key}`);
    };
    // A refusal that names a field goes back to its step, with the field
    // marked; anything else stays on Review with the message below.
    const refused = (error: Error): void => {
      const found = serverTaskProblem(error);
      if (!found) return;
      create.reset();
      update.reset();
      setStep(found.step);
      setErrors(found.errors);
      setProblem(`The task was not saved. ${found.message}`);
    };
    if (task) {
      const patch = formToPatch(form, task);
      if (Object.keys(patch).length === 0) {
        navigate(`/tasks/${task.key}`);
        return;
      }
      update.mutate({ id: task.id, patch }, { onSuccess: done, onError: refused });
    } else {
      create.mutate(formToInput(form), { onSuccess: done, onError: refused });
    }
  };

  // Enter anywhere but the last step moves on, after checking the step; only
  // the Review step saves (AGENTS.md).
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (saving) return;
    if (step < TASK_REVIEW_STEP) changeStep(step + 1);
    else save();
  };

  const StepView = STEP_VIEWS[step];
  const cancelTo = task ? `/tasks/${task.key}` : '/tasks';

  return (
    <>
      <PageHeader
        icon={<TaskAltIcon />}
        title={task ? `Edit ${task.key}` : 'New task'}
        description="Set the task out step by step: basics, assignment, schedule and details. Nothing is saved until the Review step."
        help={pageGuides['task-editor']}
        action={
          <Button
            component={RouterLink}
            to={cancelTo}
            startIcon={<ArrowBackRoundedIcon />}
            disabled={saving}
            fullWidth
          >
            {task ? 'Back to task' : 'My tasks'}
          </Button>
        }
      />
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <FormStepNavigation
          steps={TASK_FORM_STEPS}
          activeStep={step}
          maxStep={maxStep}
          onStepChange={changeStep}
          disabled={saving}
        />
        <Box
          component="form"
          noValidate
          onSubmit={submit}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography
              ref={heading}
              tabIndex={-1}
              component="h2"
              variant="h5"
              sx={{ mb: 3, outline: 'none' }}
            >
              {TASK_FORM_STEPS[step]}
            </Typography>
            <Stack spacing={3}>
              {StepView ? (
                <StepView
                  form={form}
                  set={set}
                  errors={errors}
                  disabled={saving}
                  taskId={task?.id}
                />
              ) : (
                <ReviewStep form={form} onEdit={changeStep} disabled={saving} />
              )}
              {problem && <Alert severity="error">{problem}</Alert>}
              {saveError && (
                <Alert severity="error">
                  {saveError.message || 'The task could not be saved. Your changes are still here.'}
                </Alert>
              )}
            </Stack>
          </Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={2}
            sx={{
              p: { xs: 2, md: 3 },
              bgcolor: 'background.default',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Button
              onClick={() => (step > 0 ? changeStep(step - 1) : navigate(cancelTo))}
              disabled={saving}
            >
              {step > 0 ? 'Back' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {submitLabel(saving, step, Boolean(task))}
            </Button>
          </Stack>
        </Box>
      </Box>
    </>
  );
};

/** A task that could not be loaded for editing: missing, or the request failed. */
const TaskLoadProblem = ({
  taskKey,
  error,
  onRetry,
}: {
  taskKey: string;
  error: Error | null;
  onRetry: () => void;
}): JSX.Element => {
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <Stack spacing={2}>
      <PageHeader title={`Edit ${taskKey.toUpperCase()}`} icon={<TaskAltIcon />} />
      <Alert
        severity={missing ? 'warning' : 'error'}
        action={
          missing ? undefined : (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {missing
          ? `There is no task ${taskKey.toUpperCase()}. It may have been deleted.`
          : (error?.message ?? 'This task could not be loaded.')}
      </Alert>
      <Box>
        <Button component={RouterLink} to="/tasks/all">
          See all tasks
        </Button>
      </Box>
    </Stack>
  );
};

/**
 * Creating (`/tasks/new`, `?projectId=` presets the project) and editing
 * (`/tasks/:taskKey/edit`) a task, in named steps with a review before
 * anything is saved. An existing task loads behind a skeleton; one that
 * cannot be found says so and offers a way back.
 */
const TaskEditorPage = (): JSX.Element => {
  const { taskKey } = useParams();
  const [params] = useSearchParams();
  const query = useTask(taskKey);

  if (taskKey && query.isPending) {
    return (
      <>
        <PageHeader title={`Edit ${taskKey.toUpperCase()}`} icon={<TaskAltIcon />} />
        <FormPageSkeleton steps fields={3} />
      </>
    );
  }
  if (taskKey && (query.isError || !query.data)) {
    return (
      <TaskLoadProblem taskKey={taskKey} error={query.error} onRetry={() => void query.refetch()} />
    );
  }
  return (
    <TaskEditorForm
      key={taskKey ?? `new-${params.get('projectId') ?? ''}`}
      task={taskKey ? query.data : undefined}
      initialProjectId={params.get('projectId')}
    />
  );
};

export default TaskEditorPage;

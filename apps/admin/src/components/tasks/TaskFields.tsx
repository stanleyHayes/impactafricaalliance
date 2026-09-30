import type { Task, TaskStatus, WorkPriority } from '@iaa/shared';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type KeyboardEvent } from 'react';

import { useHasPermission } from '../../auth/useCan';
import { TASK_STATUS_OPTIONS, WORK_PRIORITY_OPTIONS } from '../../lib/select-options';
import { useTaskProject } from '../../lib/tasks';
import { DateField } from '../fields/DateField';
import { OptionSelect, type SelectChoice } from '../fields/OptionSelect';
import { TagsField } from '../fields/TagsField';
import { UserPicker } from '../people/UserPicker';

import { ProjectPicker } from './ProjectPicker';
import { TaskPicker } from './TaskPicker';
import type { InlineSave } from './use-inline-save';

const NO_MILESTONE: SelectChoice = {
  value: '',
  label: 'No milestone',
  description: 'The task belongs to the project as a whole.',
};

const ESTIMATE_MAX = 1000;

/** The estimate as typed, or the problem with it. */
const parseEstimate = (text: string): { value: number | null } | { problem: string } => {
  if (text.trim() === '') return { value: null };
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > ESTIMATE_MAX) {
    return { problem: `Enter a number of hours from 0 to ${ESTIMATE_MAX}.` };
  }
  return { value };
};

/**
 * Hours, saved when the field is left or Enter is pressed rather than on
 * every keystroke, so typing "12" does not save "1" first.
 */
const EstimateField = ({
  value,
  disabled,
  onSave,
}: {
  value: number | null | undefined;
  disabled: boolean;
  onSave: (value: number | null) => void;
}): JSX.Element => {
  const stored = value === null || value === undefined ? '' : String(value);
  const [text, setText] = useState(stored);
  const [synced, setSynced] = useState(stored);
  const [problem, setProblem] = useState<string | null>(null);
  // A saved value arriving from elsewhere replaces what is shown.
  if (stored !== synced) {
    setSynced(stored);
    setText(stored);
  }
  const commit = (): void => {
    const parsed = parseEstimate(text);
    if ('problem' in parsed) {
      setProblem(parsed.problem);
      return;
    }
    setProblem(null);
    if (parsed.value !== (value ?? null)) onSave(parsed.value);
  };
  return (
    <TextField
      label="Estimate (hours)"
      type="number"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
      }}
      disabled={disabled}
      error={Boolean(problem)}
      helperText={problem ?? 'Saved when you leave the field.'}
      fullWidth
      slotProps={{ htmlInput: { min: 0, max: ESTIMATE_MAX, step: 0.5 } }}
    />
  );
};

/** Labels as chips, for someone who can read the task but not change it. */
const ReadOnlyLabels = ({ labels }: { labels: string[] }): JSX.Element => (
  <Box>
    <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.5 }}>
      Labels
    </Typography>
    {labels.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        None
      </Typography>
    ) : (
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
        {labels.map((label) => (
          <Chip key={label} size="small" label={label} />
        ))}
      </Stack>
    )}
  </Box>
);

/** A date's cell: a whole row in the task page's narrow side column, else half of one. */
const dateCellSxFor = (narrow: boolean | undefined) =>
  narrow ? { gridColumn: { lg: '1 / -1' } } : undefined;

const dateProblem = (start: string | null | undefined, due: string | null | undefined) =>
  start && due && due < start ? 'The due date cannot be before the start date.' : undefined;

/**
 * The task's project and milestone. Both come from the projects module, so
 * someone who cannot read projects does not see them at all (and nothing is
 * fetched on their behalf); the task keeps whatever project it has.
 */
const TaskProjectFields = ({
  task,
  inline,
  disabled,
}: {
  task: Task;
  inline: InlineSave;
  disabled: boolean;
}): JSX.Element | null => {
  const { current, save } = inline;
  const canReadProjects = useHasPermission('read', 'projects');
  const project = useTaskProject(canReadProjects ? current.projectId : null);
  if (!canReadProjects) return null;
  const milestoneOptions: SelectChoice[] = [
    NO_MILESTONE,
    ...(project.data?.milestones ?? []).map((milestone) => ({
      value: milestone.id,
      label: milestone.title,
    })),
  ];
  return (
    <>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <ProjectPicker
          label="Project"
          value={current.projectId ?? null}
          known={task.project}
          onChange={(value) => save({ projectId: value }, 'Project')}
          disabled={disabled}
          helperText="Moving the task to another project clears its milestone."
        />
      </Box>
      <OptionSelect
        label="Milestone"
        options={milestoneOptions}
        value={current.milestoneId ?? ''}
        onChange={(value) => save({ milestoneId: value || null }, 'Milestone')}
        disabled={disabled || !current.projectId}
        placeholder={current.projectId ? 'No milestone' : 'Choose a project first'}
        helperText={project.isError ? 'The milestones could not be loaded.' : undefined}
      />
    </>
  );
};

/**
 * The task's properties, each saved the moment it changes: status, priority,
 * people, dates, labels, project, milestone, estimate, parent and
 * dependencies. Read-only without `tasks:update`.
 *
 * Dates are saved once settled (the field left, Enter, or a day picked from
 * the calendar), never on each keystroke, for the same reason as the
 * estimate: typing "25" over the 15th passes through the 2nd.
 */
export const TaskFields = ({
  task,
  inline,
  canEdit,
  narrow,
}: {
  task: Task;
  inline: InlineSave;
  canEdit: boolean;
  /**
   * Laid out in the task page's side column, which is only 380px wide from
   * the `lg` breakpoint: there each date takes a whole row, because half of
   * it cannot show "24 Sept 2026" beside the calendar and clear buttons.
   */
  narrow?: boolean;
}): JSX.Element => {
  const { current, save } = inline;
  const disabled = !canEdit;
  const [dateError, setDateError] = useState<string | undefined>();

  const dateCellSx = dateCellSxFor(narrow);

  const saveDate = (field: 'startDate' | 'dueDate', value: string | null): void => {
    const start = field === 'startDate' ? value : current.startDate;
    const due = field === 'dueDate' ? value : current.dueDate;
    const problem = dateProblem(start, due);
    setDateError(problem);
    if (!problem) save({ [field]: value }, field === 'dueDate' ? 'Due date' : 'Start date');
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 2,
      }}
    >
      <OptionSelect
        label="Status"
        options={TASK_STATUS_OPTIONS}
        value={current.status}
        onChange={(value) => save({ status: value as TaskStatus }, 'Status')}
        disabled={disabled}
      />
      <OptionSelect
        label="Priority"
        options={WORK_PRIORITY_OPTIONS}
        value={current.priority}
        onChange={(value) => save({ priority: value as WorkPriority }, 'Priority')}
        disabled={disabled}
      />
      <Box sx={{ gridColumn: '1 / -1' }}>
        <UserPicker
          multiple
          max={10}
          label="Assignees"
          value={current.assigneeIds}
          onChange={(value) => save({ assigneeIds: value }, 'Assignees')}
          disabled={disabled}
        />
      </Box>
      <Box sx={dateCellSx}>
        <DateField
          label="Start date"
          commit="settled"
          value={current.startDate}
          onChange={(value) => saveDate('startDate', value)}
          disabled={disabled}
        />
      </Box>
      <Box sx={dateCellSx}>
        <DateField
          label="Due date"
          commit="settled"
          value={current.dueDate}
          onChange={(value) => saveDate('dueDate', value)}
          error={dateError}
          disabled={disabled}
        />
      </Box>
      <TaskProjectFields task={task} inline={inline} disabled={disabled} />
      <EstimateField
        value={current.estimateHours}
        disabled={disabled}
        onSave={(value) => save({ estimateHours: value }, 'Estimate')}
      />
      <Box sx={{ gridColumn: '1 / -1' }}>
        {canEdit ? (
          <TagsField
            label="Labels"
            value={current.labels}
            onChange={(value) => save({ labels: value }, 'Labels')}
          />
        ) : (
          <ReadOnlyLabels labels={current.labels} />
        )}
      </Box>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <TaskPicker
          label="Parent task"
          value={task.parent ?? null}
          excludeIds={[task.id]}
          onChange={(value) => save({ parentTaskId: value?.id ?? null }, 'Parent task')}
          disabled={disabled}
          helperText="Makes this a subtask of another task."
        />
      </Box>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <TaskPicker
          multiple
          label="Depends on"
          value={task.dependencies}
          excludeIds={[task.id]}
          onChange={(value) => save({ dependencyIds: value.map((ref) => ref.id) }, 'Dependencies')}
          disabled={disabled}
          helperText="Tasks that must finish before this one can."
        />
      </Box>
      <Stack spacing={0.25} sx={{ gridColumn: '1 / -1' }}>
        <Typography variant="caption" color="text.secondary">
          Reported by {task.reporter?.name ?? 'a former colleague'} on{' '}
          {new Date(task.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
        </Typography>
        {task.completedAt && (
          <Typography variant="caption" color="text.secondary">
            Finished on{' '}
            {new Date(task.completedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

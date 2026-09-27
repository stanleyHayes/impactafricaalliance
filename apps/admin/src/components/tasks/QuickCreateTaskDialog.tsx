import type { ProjectRef, Task, WorkPriority } from '@iaa/shared';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useState, type FormEvent } from 'react';

import { WORK_PRIORITY_OPTIONS } from '../../lib/select-options';
import { useCreateTask } from '../../lib/tasks';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';
import { DateField } from '../fields/DateField';
import { OptionSelect } from '../fields/OptionSelect';
import { UserPicker } from '../people/UserPicker';

import { ProjectPicker } from './ProjectPicker';

/** What the dialog starts with: a project's Tasks tab presets its project, My tasks presets you. */
export interface QuickCreateDefaults {
  projectId?: string | null;
  /** The preset project's name, so the picker can show it without a lookup. */
  project?: ProjectRef | null;
  assigneeIds?: string[];
}

export interface QuickCreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the new task once the API has it. */
  onCreated: (task: Task) => void;
  defaults?: QuickCreateDefaults;
}

interface QuickTaskForm {
  title: string;
  projectId: string | null;
  assigneeIds: string[];
  dueDate: string | null;
  priority: WorkPriority;
}

const TITLE_MIN = 3;
const TITLE_MAX = 200;

const titleProblem = (title: string): string | null => {
  const length = title.trim().length;
  if (length < TITLE_MIN) return 'Give the task a title of at least three characters.';
  if (length > TITLE_MAX) return 'Keep the title under 200 characters.';
  return null;
};

const QuickCreateForm = ({
  onClose,
  onCreated,
  defaults,
  onBusyChange,
}: Omit<QuickCreateTaskDialogProps, 'open'> & {
  onBusyChange: (busy: boolean) => void;
}): JSX.Element => {
  const create = useCreateTask();
  const [form, setForm] = useState<QuickTaskForm>({
    title: '',
    projectId: defaults?.projectId ?? null,
    assigneeIds: defaults?.assigneeIds ?? [],
    dueDate: null,
    priority: 'medium',
  });
  const [showErrors, setShowErrors] = useState(false);
  const problem = titleProblem(form.title);
  const busy = create.isPending;
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  const set = <K extends keyof QuickTaskForm>(key: K, value: QuickTaskForm[K]): void =>
    setForm((current) => ({ ...current, [key]: value }));

  // Enter in the title submits: five short fields do not need steps (AGENTS.md).
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy) return;
    if (problem) {
      setShowErrors(true);
      return;
    }
    create.mutate(
      {
        title: form.title.trim(),
        priority: form.priority,
        assigneeIds: form.assigneeIds,
        ...(form.projectId ? { projectId: form.projectId } : {}),
        ...(form.dueDate ? { dueDate: form.dueDate } : {}),
      },
      { onSuccess: (task) => onCreated(task) },
    );
  };

  return (
    <form noValidate onSubmit={submit}>
      <DialogHeader
        icon={<AddTaskRoundedIcon />}
        eyebrow="Tasks"
        title="New task"
        description="The essentials now; add a description, checklist or files once it exists."
        onClose={busy ? undefined : onClose}
      />
      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <TextField
            label="Title"
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            required
            autoFocus
            fullWidth
            disabled={busy}
            error={showErrors && Boolean(problem)}
            helperText={showErrors && problem ? problem : 'Say what done looks like.'}
            slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
          />
          <ProjectPicker
            label="Project"
            value={form.projectId}
            known={defaults?.project}
            onChange={(value) => set('projectId', value)}
            disabled={busy}
            helperText="Optional. Leave empty for work outside any project."
          />
          <UserPicker
            multiple
            max={10}
            label="Assignees"
            value={form.assigneeIds}
            onChange={(value) => set('assigneeIds', value)}
            disabled={busy}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DateField
              label="Due date"
              value={form.dueDate}
              onChange={(value) => set('dueDate', value)}
              disabled={busy}
            />
            <OptionSelect
              label="Priority"
              options={WORK_PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(value) => set('priority', value as WorkPriority)}
              disabled={busy}
            />
          </Stack>
          {create.isError && (
            <Alert severity="error">
              {create.error.message || 'The task could not be created. Please try again.'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Creating…' : 'Create task'}
        </Button>
      </DialogFooter>
    </form>
  );
};

/**
 * A task in five fields, from anywhere: the top bar, My tasks, a project's
 * Tasks tab. Enter creates it. Anything longer belongs on the full task form
 * (`/tasks/new`), which has steps.
 */
export const QuickCreateTaskDialog = ({
  open,
  onClose,
  onCreated,
  defaults,
}: QuickCreateTaskDialogProps): JSX.Element => {
  // Escape and the backdrop cannot close the dialog while the task is being
  // created: the answer would arrive with nowhere to show it.
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx, 'aria-label': 'New task' } }}
    >
      {/* Mounted only while open, so each opening starts from a clean form. */}
      {open && (
        <QuickCreateForm
          onClose={onClose}
          onCreated={onCreated}
          defaults={defaults}
          onBusyChange={setBusy}
        />
      )}
    </Dialog>
  );
};

/**
 * "IAA-42 created", with a way to open it. The console has no global toast,
 * so each place that creates a task shows this beside its dialog.
 */
export const TaskCreatedSnackbar = ({
  task,
  onOpen,
  onClose,
}: {
  task: Pick<Task, 'key' | 'title'> | null;
  onOpen: (key: string) => void;
  onClose: () => void;
}): JSX.Element => (
  <Snackbar
    open={task !== null}
    autoHideDuration={8000}
    onClose={(_event, reason) => {
      if (reason !== 'clickaway') onClose();
    }}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  >
    <Alert
      severity="success"
      variant="filled"
      onClose={onClose}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => {
            if (task) onOpen(task.key);
            onClose();
          }}
        >
          Open
        </Button>
      }
      sx={{ alignItems: 'center' }}
    >
      {task ? `${task.key} created: ${task.title}` : ''}
    </Alert>
  </Snackbar>
);

import { TASK_ATTACHMENT_LIMIT, type Task } from '@iaa/shared';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';
import { ApiError } from '../../lib/api-client';
import { taskChangeLabel } from '../../lib/select-options';
import {
  useAddTaskAttachment,
  useArchiveTask,
  useDeleteTask,
  useRemoveTaskAttachment,
  useTask,
} from '../../lib/tasks';
import { ActivityTimeline } from '../audit/ActivityTimeline';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { EmptyState } from '../EmptyState';
import { FileAttachmentList } from '../files/FileAttachmentList';
import { Markdown } from '../markdown/Markdown';
import { MarkdownEditor } from '../markdown/MarkdownEditor';

import { hasTaskDraft, useTaskDraft } from './task-drafts';
import { TaskChecklist } from './TaskChecklist';
import { TaskComments } from './TaskComments';
import { TaskFields } from './TaskFields';
import { TaskProjectName } from './TaskProjectName';
import { TaskStatusChip } from './TaskStatusChip';
import { useInlineSave, type InlineSaveState } from './use-inline-save';

export type TaskDetailVariant = 'drawer' | 'page';

const TITLE_MIN = 3;
const TITLE_MAX = 200;

/** One titled part of the task: details, checklist, comments. */
const Section = ({ title, children }: { title: string; children: ReactNode }): JSX.Element => (
  <Box component="section" aria-label={title}>
    <Typography
      component="h3"
      variant="overline"
      sx={{ display: 'block', mb: 1.25, color: 'text.secondary', fontWeight: 750, lineHeight: 1.6 }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

/** "Saving…", "Due date saved", or what went wrong, read out as it changes. */
const SaveStatusLine = ({ state }: { state: InlineSaveState }): JSX.Element => (
  <Box aria-live="polite" sx={{ minHeight: 24 }}>
    {state.status === 'saving' && (
      <Typography variant="caption" color="text.secondary">
        {state.message}
      </Typography>
    )}
    {state.status === 'saved' && (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'success.main' }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 16 }} aria-hidden />
        <Typography variant="caption" sx={{ fontWeight: 650 }}>
          {state.message}
        </Typography>
      </Stack>
    )}
    {state.status === 'error' && (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'error.main' }}>
        <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} aria-hidden />
        <Typography variant="caption" sx={{ fontWeight: 650 }}>
          {state.message}
        </Typography>
      </Stack>
    )}
  </Box>
);

/**
 * The title, edited where it stands: Enter or leaving the field saves, Escape
 * cancels. The new title shows at once; if the save is refused the field opens
 * again with what was typed, so nothing has to be typed twice.
 */
const TaskTitle = ({
  title: current,
  canEdit,
  onSave,
  variant,
}: {
  title: string;
  canEdit: boolean;
  onSave: (title: string) => Promise<boolean>;
  variant: TaskDetailVariant;
}): JSX.Element => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [problem, setProblem] = useState<string | null>(null);

  const finish = (): void => {
    const title = draft.trim();
    if (title.length < TITLE_MIN) {
      setProblem('Give the task a title of at least three characters.');
      return;
    }
    setProblem(null);
    setEditing(false);
    if (title === current) return;
    void onSave(title).then((saved) => {
      if (saved) return;
      setDraft(title);
      setEditing(true);
    });
  };

  const handleKeys = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish();
    } else if (event.key === 'Escape') {
      // Cancels the edit without closing the drawer around it.
      event.stopPropagation();
      setDraft(current);
      setProblem(null);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <TextField
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeys}
        onBlur={finish}
        label="Title"
        autoFocus
        fullWidth
        error={Boolean(problem)}
        helperText={problem ?? 'Enter to save, Escape to cancel.'}
        slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
      />
    );
  }
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      {/* The sans record title, as EventDetail's is: the serif h2 face is for page titles. */}
      <Typography
        variant="h3"
        component="h2"
        sx={{
          fontSize: { xs: '1.35rem', sm: variant === 'page' ? '1.8rem' : '1.5rem' },
          lineHeight: 1.25,
          overflowWrap: 'anywhere',
          flexGrow: 1,
        }}
      >
        {current}
      </Typography>
      {canEdit && (
        <Tooltip title="Edit title">
          <IconButton
            aria-label="Edit title"
            onClick={() => {
              setDraft(current);
              setEditing(true);
            }}
            size="small"
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};

const DESCRIPTION_MAX = 20000;

/**
 * The description in Markdown, with Edit, Save and Cancel. The editor stays
 * open until the save lands, so a refused save (the server asleep, say)
 * never throws away what was written; and text left mid-edit when the
 * drawer closes is there again, still being edited, when the task reopens.
 */
const TaskDescription = ({
  task,
  canEdit,
  onSave,
}: {
  task: Task;
  canEdit: boolean;
  onSave: (description: string) => Promise<boolean>;
}): JSX.Element => {
  const [editing, setEditing] = useState(() => canEdit && hasTaskDraft(task.id, 'description'));
  const [saving, setSaving] = useState(false);
  const draft = useTaskDraft(task.id, 'description', task.description);
  const tooLong = draft.value.trim().length > DESCRIPTION_MAX;

  const save = (): void => {
    const description = draft.value.trim();
    if (description === task.description) {
      draft.clear(task.description);
      setEditing(false);
      return;
    }
    setSaving(true);
    void onSave(description).then((saved) => {
      setSaving(false);
      if (!saved) return;
      draft.clear(description);
      setEditing(false);
    });
  };

  if (editing) {
    return (
      <Stack spacing={1.5}>
        <MarkdownEditor
          value={draft.value}
          onChange={draft.set}
          minRows={6}
          error={tooLong ? 'Keep the description under 20,000 characters.' : undefined}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            disabled={saving}
            onClick={() => {
              draft.clear(task.description);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={saving || tooLong}>
            {saving ? 'Saving…' : 'Save description'}
          </Button>
        </Stack>
      </Stack>
    );
  }
  return (
    <Box>
      {task.description ? (
        <Box sx={{ '& > :first-of-type': { mt: 0 } }}>
          <Markdown>{task.description}</Markdown>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No description yet.{canEdit ? ' Add the background someone needs to pick this up.' : ''}
        </Typography>
      )}
      {canEdit && (
        <Button
          size="small"
          startIcon={<EditNoteRoundedIcon />}
          onClick={() => {
            draft.clear(task.description);
            setEditing(true);
          }}
          sx={{ mt: 1 }}
        >
          {task.description ? 'Edit description' : 'Add a description'}
        </Button>
      )}
    </Box>
  );
};

const commentsPhrase = (count: number): string => {
  if (count === 0) return '';
  return count === 1 ? ', with its comment' : `, with its ${count} comments`;
};

/** Archive, restore and delete, each confirmed by name where it cannot be undone at once. */
const TaskActions = ({
  task,
  variant,
  onDeleted,
}: {
  task: Task;
  variant: TaskDetailVariant;
  onDeleted: () => void;
}): JSX.Element => {
  const canEdit = useHasPermission('update', 'tasks');
  const canDelete = useHasPermission('delete', 'tasks');
  const archive = useArchiveTask();
  const remove = useDeleteTask();
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);
  const archived = Boolean(task.archivedAt);
  // A refusal belongs to the attempt it answered: reopening starts clean.
  const closeConfirm = (): void => {
    setConfirm(null);
    archive.reset();
    remove.reset();
  };

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {variant === 'drawer' && (
        <Button
          component={RouterLink}
          to={`/tasks/${task.key}`}
          size="small"
          startIcon={<OpenInFullRoundedIcon />}
        >
          Open full page
        </Button>
      )}
      {canEdit && (
        <Button
          component={RouterLink}
          to={`/tasks/${task.key}/edit`}
          size="small"
          startIcon={<EditOutlinedIcon />}
        >
          Edit step by step
        </Button>
      )}
      {canEdit && archived && (
        <Button
          size="small"
          startIcon={<UnarchiveOutlinedIcon />}
          disabled={archive.isPending}
          onClick={() => archive.mutate({ id: task.id, archived: false })}
        >
          {archive.isPending ? 'Restoring…' : 'Restore'}
        </Button>
      )}
      {archived && archive.isError && confirm === null && (
        <Alert severity="error" sx={{ flexBasis: '100%' }}>
          {task.key} was not restored. {archive.error.message}
        </Alert>
      )}
      {canEdit && !archived && (
        <Button
          size="small"
          startIcon={<ArchiveOutlinedIcon />}
          onClick={() => setConfirm('archive')}
        >
          Archive
        </Button>
      )}
      {canDelete && (
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutlineRoundedIcon />}
          onClick={() => setConfirm('delete')}
        >
          Delete
        </Button>
      )}
      <ConfirmDialog
        open={confirm === 'archive'}
        title={`Archive ${task.key}?`}
        eyebrow="Tasks"
        icon={<ArchiveOutlinedIcon />}
        description={
          <>
            <strong>
              {task.key}: {task.title}
            </strong>{' '}
            will leave every list and the board. Its comments and history are kept, and you can
            restore it from this page.
          </>
        }
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        pending={archive.isPending}
        error={archive.isError ? archive.error.message : null}
        onConfirm={() =>
          archive.mutate({ id: task.id, archived: true }, { onSuccess: () => setConfirm(null) })
        }
        onClose={closeConfirm}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title={`Delete ${task.key}?`}
        eyebrow="Tasks"
        tone="error"
        description={
          <>
            <strong>
              {task.key}: {task.title}
            </strong>{' '}
            will be deleted for good{commentsPhrase(task.commentCount)}. Subtasks and tasks that
            depend on it stay, without the link. This cannot be undone. Archive it instead if it
            might be needed again.
          </>
        }
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onConfirm={() =>
          remove.mutate(
            { id: task.id, key: task.key },
            {
              onSuccess: () => {
                setConfirm(null);
                onDeleted();
              },
            },
          )
        }
        onClose={closeConfirm}
      />
    </Stack>
  );
};

/** The task itself once loaded. */
const TaskDetailBody = ({
  task,
  variant,
  onClose,
}: {
  task: Task;
  variant: TaskDetailVariant;
  onClose?: () => void;
}): JSX.Element => {
  const navigate = useNavigate();
  const canEdit = useHasPermission('update', 'tasks');
  const inline = useInlineSave(task);
  const addAttachment = useAddTaskAttachment();
  const removeAttachment = useRemoveTaskAttachment();

  const header = (
    <Stack spacing={1}>
      {/* The chips wrap in their own cell, so Close stays at the top right on a phone. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          columnGap: 1,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Chip size="small" label={task.key} sx={{ fontWeight: 750 }} />
          <TaskStatusChip status={inline.current.status} />
          {task.archivedAt && <Chip size="small" variant="outlined" label="Archived" />}
          <TaskProjectName project={task.project} link />
        </Stack>
        {onClose && (
          <Tooltip title="Close">
            <IconButton aria-label="Close task" onClick={onClose} edge="end">
              <CloseRoundedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <TaskTitle
        title={inline.current.title}
        canEdit={canEdit}
        variant={variant}
        onSave={(title) => inline.save({ title }, 'Title')}
      />
      <SaveStatusLine state={inline.state} />
      {task.parent && (
        <Typography variant="body2" color="text.secondary">
          Subtask of{' '}
          <Link component={RouterLink} to={`/tasks/${task.parent.key}`}>
            {task.parent.key}: {task.parent.title}
          </Link>
        </Typography>
      )}
    </Stack>
  );

  const details = (
    <Section title="Details">
      <TaskFields task={task} inline={inline} canEdit={canEdit} narrow={variant === 'page'} />
    </Section>
  );
  const activity = (
    <Section title="Activity">
      <ActivityTimeline
        endpoint={`/admin/tasks/${task.id}/activity`}
        queryKey={['tasks', 'activity', task.id]}
        formatValue={taskChangeLabel}
      />
    </Section>
  );
  const main = (
    <Stack spacing={4}>
      <Section title="Description">
        <TaskDescription
          task={task}
          canEdit={canEdit}
          onSave={(description) => inline.save({ description }, 'Description')}
        />
      </Section>
      {task.subtasks && task.subtasks.length > 0 && (
        <Section title="Subtasks">
          <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
            {task.subtasks.map((subtask) => (
              <li key={subtask.id}>
                <Link component={RouterLink} to={`/tasks/${subtask.key}`}>
                  {subtask.key}: {subtask.title}
                </Link>
              </li>
            ))}
          </Stack>
        </Section>
      )}
      <Section title="Checklist">
        <TaskChecklist task={task} canEdit={canEdit} />
      </Section>
      <Section title="Attachments">
        <FileAttachmentList
          items={task.attachments}
          canEdit={canEdit}
          onAdd={(input) => addAttachment.mutateAsync({ taskId: task.id, input })}
          onRemove={(attachmentId) =>
            removeAttachment.mutateAsync({ taskId: task.id, attachmentId })
          }
          max={TASK_ATTACHMENT_LIMIT}
          folder="documents"
          emptyText="No documents attached to this task yet."
        />
      </Section>
      <Section title={`Comments${task.commentCount ? ` (${task.commentCount})` : ''}`}>
        <TaskComments task={task} canComment={canEdit} />
      </Section>
    </Stack>
  );
  const footer = (
    <TaskActions
      task={task}
      variant={variant}
      onDeleted={() => (onClose ? onClose() : navigate('/tasks/all'))}
    />
  );
  const readOnlyNote = !canEdit && (
    <Alert severity="info">
      You can read this task but not change it. An administrator can grant you permission to update
      tasks under Users.
    </Alert>
  );

  if (variant === 'drawer') {
    return (
      <Stack spacing={3}>
        {header}
        {readOnlyNote}
        {details}
        {main}
        {activity}
        {footer}
      </Stack>
    );
  }
  return (
    <Stack spacing={3}>
      {header}
      {readOnlyNote}
      {footer}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 380px' },
          gap: 4,
          alignItems: 'start',
        }}
      >
        {main}
        <Stack spacing={4}>
          {details}
          {activity}
        </Stack>
      </Box>
    </Stack>
  );
};

/** The loading shape of a task: the header, the field grid and the sections below. */
export const TaskDetailSkeleton = ({ variant }: { variant: TaskDetailVariant }): JSX.Element => (
  <Stack spacing={3} aria-hidden>
    <Stack direction="row" spacing={1}>
      <Skeleton variant="rounded" width={64} height={24} sx={{ borderRadius: 4 }} />
      <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 4 }} />
    </Stack>
    <Skeleton variant="text" width="75%" sx={{ fontSize: '1.6rem' }} />
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: variant === 'page' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={56} sx={{ borderRadius: 1.5 }} />
      ))}
    </Box>
    <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2.5 }} />
    <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2.5 }} />
  </Stack>
);

/**
 * One task's details, checklist, files, comments and activity: the drawer
 * opened by `?task=IAA-42` and the task's own page share this, so a task
 * looks and behaves the same wherever it is opened.
 */
export const TaskDetailContent = ({
  taskKey,
  variant,
  onClose,
}: {
  taskKey: string;
  variant: TaskDetailVariant;
  onClose?: () => void;
}): JSX.Element => {
  const query = useTask(taskKey);
  const navigate = useNavigate();
  // The drawer covers the whole screen on a phone, so it keeps a way out
  // while the task loads or when it cannot.
  const closeBar = onClose && (
    <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
      <Chip size="small" label={taskKey.toUpperCase()} sx={{ fontWeight: 750 }} />
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title="Close">
        <IconButton aria-label="Close task" onClick={onClose} edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
  if (query.isPending) {
    return (
      <>
        {closeBar}
        <TaskDetailSkeleton variant={variant} />
      </>
    );
  }
  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    if (missing) {
      return (
        <EmptyState
          icon={<SearchOffRoundedIcon />}
          title={`There is no task ${taskKey.toUpperCase()}`}
          description="It may have been deleted, or the key in the link may be mistyped. All tasks lists everything the team is working on."
          primaryAction={
            onClose
              ? { label: 'Close', onClick: onClose }
              : { label: 'See all tasks', onClick: () => navigate('/tasks/all') }
          }
        />
      );
    }
    return (
      <>
        {closeBar}
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        >
          {query.error.message || 'This task could not be loaded.'}
        </Alert>
      </>
    );
  }
  return (
    <TaskDetailBody key={query.data.id} task={query.data} variant={variant} onClose={onClose} />
  );
};

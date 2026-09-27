import type { Task, TaskBoardColumn } from '@iaa/shared';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';
import { useTaskBoard } from '../../lib/tasks';
import { DetailSection } from '../detail/DetailSection';
import { EmptyState } from '../EmptyState';

import { QuickCreateTaskDialog, TaskCreatedSnackbar } from './QuickCreateTaskDialog';
import { TaskDrawerHost } from './TaskDrawer';
import { TaskRow, TaskRowsSkeleton } from './TaskRow';
import { TaskStatusChip } from './TaskStatusChip';
import { useTaskDrawer } from './use-task-drawer';

export interface ProjectTasksPanelProps {
  /** The project whose tasks to list. */
  projectId: string;
}

/** One status group: its heading and count, then its tasks. */
const StatusGroup = ({
  column,
  projectId,
  onOpen,
}: {
  column: TaskBoardColumn;
  projectId: string;
  onOpen: (key: string) => void;
}): JSX.Element => {
  const headingId = `project-tasks-${column.status}`;
  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}
      >
        <Box id={headingId} component="h3" sx={{ m: 0, display: 'flex' }}>
          <TaskStatusChip status={column.status} />
        </Box>
        <Chip
          size="small"
          variant="outlined"
          label={column.total}
          aria-label={`${column.total} ${column.total === 1 ? 'task' : 'tasks'}`}
          sx={{ fontWeight: 700 }}
        />
      </Stack>
      <Box component="ul" sx={{ m: 0, p: 0.5 }}>
        {column.items.map((task) => (
          <TaskRow key={task.id} task={task} onOpen={onOpen} showStatus={false} />
        ))}
      </Box>
      {column.total > column.items.length && (
        <Typography variant="body2" sx={{ px: 2, pb: 1.5 }}>
          Showing {column.items.length} of {column.total}.{' '}
          <Link
            component={RouterLink}
            to={`/tasks/all?project=${projectId}&status=${column.status}&done=1`}
          >
            See them all
          </Link>
        </Typography>
      )}
    </Box>
  );
};

/**
 * The tasks linked to one project, grouped by status with a count on each
 * group, on the project's Tasks tab, in the same tinted-header section card
 * as the project's other tabs.
 *
 * Owned by the tasks module, so a task looks and behaves the same here as on
 * the task pages: a row opens it in the drawer, "Add task" opens the quick
 * create with this project already chosen, and the board link shows the same
 * tasks as cards.
 */
export const ProjectTasksPanel = ({ projectId }: ProjectTasksPanelProps): JSX.Element => {
  const canRead = useHasPermission('read', 'tasks');
  const canCreate = useHasPermission('create', 'tasks');
  const board = useTaskBoard({ projectId }, canRead);
  const { open } = useTaskDrawer();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Task | null>(null);

  if (!canRead) {
    return (
      <Alert severity="info">
        You cannot see tasks. An administrator can grant you access to tasks under Users.
      </Alert>
    );
  }

  const columns = board.data?.columns ?? [];
  const total = columns.reduce((sum, column) => sum + column.total, 0);
  const done = columns.find((column) => column.status === 'done')?.total ?? 0;

  const renderBody = (): JSX.Element => {
    if (board.isPending) return <TaskRowsSkeleton rows={4} />;
    if (board.isError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void board.refetch()}>
              Retry
            </Button>
          }
        >
          {board.error.message || "The project's tasks could not be loaded."}
        </Alert>
      );
    }
    if (total === 0) {
      return (
        <EmptyState
          compact
          icon={<ChecklistRoundedIcon />}
          title="No tasks on this project yet"
          description="Break the project into tasks and assign them, and each one will be listed here by status. Finished tasks count towards the project's progress."
          primaryAction={
            canCreate
              ? {
                  label: 'Add the first task',
                  icon: <AddTaskRoundedIcon />,
                  onClick: () => setCreating(true),
                }
              : undefined
          }
        />
      );
    }
    return (
      <Stack spacing={2}>
        {columns
          .filter((column) => column.total > 0)
          .map((column) => (
            <StatusGroup key={column.status} column={column} projectId={projectId} onOpen={open} />
          ))}
      </Stack>
    );
  };

  return (
    <Box>
      <DetailSection
        title="Tasks"
        icon={<AssignmentTurnedInOutlinedIcon />}
        description="Work on this project, grouped by status."
        action={
          canCreate ? (
            <Button startIcon={<AddTaskRoundedIcon />} onClick={() => setCreating(true)}>
              Add task
            </Button>
          ) : undefined
        }
      >
        {total > 0 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ flexGrow: 1 }}
              aria-live="polite"
            >
              {`${total} ${total === 1 ? 'task' : 'tasks'}, ${done} done`}
            </Typography>
            <Button
              component={RouterLink}
              to={`/tasks/board?project=${projectId}`}
              size="small"
              startIcon={<ViewKanbanOutlinedIcon />}
            >
              Open on the board
            </Button>
          </Stack>
        )}
        {renderBody()}
      </DetailSection>
      <QuickCreateTaskDialog
        open={creating}
        onClose={() => setCreating(false)}
        defaults={{ projectId }}
        onCreated={(task) => {
          setCreating(false);
          setCreated(task);
        }}
      />
      <TaskCreatedSnackbar task={created} onOpen={open} onClose={() => setCreated(null)} />
      <TaskDrawerHost />
    </Box>
  );
};

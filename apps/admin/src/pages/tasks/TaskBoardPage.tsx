import type { Task, TaskListItem, TaskStatus } from '@iaa/shared';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';

import { useHasPermission } from '../../auth/useCan';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { planMoveTo, planStep, type BoardPosition } from '../../components/tasks/board/board-order';
import { TaskBoardSkeleton, TaskBoardView } from '../../components/tasks/board/TaskBoardView';
import {
  QuickCreateTaskDialog,
  TaskCreatedSnackbar,
} from '../../components/tasks/QuickCreateTaskDialog';
import { taskStatusLabel } from '../../components/tasks/task-display';
import { TaskDrawerHost } from '../../components/tasks/TaskDrawer';
import { TaskFilters } from '../../components/tasks/TaskFilters';
import { TaskViewTabs } from '../../components/tasks/TaskViewTabs';
import { useTaskDrawer } from '../../components/tasks/use-task-drawer';
import { useTaskFilters } from '../../components/tasks/use-task-filters';
import { pageGuides } from '../../lib/page-guides';
import { useMoveTask, useTaskBoard } from '../../lib/tasks';
import { VISUALLY_HIDDEN } from '../../lib/visually-hidden';

/**
 * Tasks as cards in status columns. Moving a card changes its status and
 * position at once, before the server answers; if the server refuses, the
 * card goes back and the page says why (plan D13).
 */
const TaskBoardPage = (): JSX.Element => {
  const canMove = useHasPermission('update', 'tasks');
  const canCreate = useHasPermission('create', 'tasks');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const controls = useTaskFilters();
  const board = useTaskBoard(controls.params);
  const move = useMoveTask();
  const { open } = useTaskDrawer();
  const [failure, setFailure] = useState<string | null>(null);
  // Read out once a menu move is saved; drags are announced by the board itself.
  const [announcement, setAnnouncement] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Task | null>(null);

  /** Sends a move. Resolves once the server has answered, whatever it said. */
  const send = (
    task: TaskListItem,
    position: BoardPosition | null,
    done?: string,
  ): Promise<void> => {
    if (!position) return Promise.resolve();
    // The promise rather than mutate's callbacks, which only fire for the
    // latest move: a quick second move must not hide the first one's failure.
    return move
      .mutateAsync({ task, ...position })
      .then(() => {
        if (done) setAnnouncement(done);
      })
      .catch((error: unknown) =>
        setFailure(
          `${task.key} could not be moved to ${taskStatusLabel(position.status)}. ${
            error instanceof Error && error.message ? error.message : 'Please try again.'
          } It is back where it was.`,
        ),
      );
  };

  const moveTo = (task: TaskListItem, status: TaskStatus): Promise<void> =>
    send(
      task,
      board.data ? planMoveTo(board.data, task.id, status) : null,
      `${task.key} moved to ${taskStatusLabel(status)}`,
    );
  const step = (task: TaskListItem, direction: -1 | 1): Promise<void> =>
    send(
      task,
      board.data ? planStep(board.data, task.id, direction) : null,
      `${task.key} moved ${direction < 0 ? 'up' : 'down'}`,
    );

  const renderBoard = (): JSX.Element => {
    if (board.isPending) return <TaskBoardSkeleton />;
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
          {board.error.message || 'The board could not be loaded.'}
        </Alert>
      );
    }
    const empty = board.data.columns.every((column) => column.total === 0);
    if (empty && controls.activeCount === 0) {
      return (
        <EmptyState
          icon={<ViewKanbanIcon />}
          title="The board is empty"
          description="Every task the team creates appears here as a card in its status column."
          primaryAction={
            canCreate
              ? {
                  label: 'New task',
                  icon: <AddTaskRoundedIcon />,
                  onClick: () => setCreating(true),
                }
              : undefined
          }
        />
      );
    }
    return (
      <>
        {empty && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={controls.clear}>
                Clear filters
              </Button>
            }
          >
            No tasks match these filters.
          </Alert>
        )}
        {!canMove && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You can see the board but not move cards. An administrator can grant you permission to
            update tasks under Users.
          </Alert>
        )}
        <TaskBoardView
          board={board.data}
          canMove={canMove}
          reducedMotion={reducedMotion}
          onOpen={open}
          onMove={(task, position) => void send(task, position)}
          onMoveTo={moveTo}
          onStep={step}
        />
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Task board"
        description="Tasks as cards in status columns. Move a card to change its status."
        icon={<ViewKanbanIcon />}
        help={pageGuides['task-board']}
        action={
          canCreate && (
            <Button
              variant="contained"
              startIcon={<AddTaskRoundedIcon />}
              onClick={() => setCreating(true)}
              fullWidth
            >
              New task
            </Button>
          )
        }
      />
      <TaskViewTabs />
      <TaskFilters controls={controls} showDoneToggle={false} />
      {renderBoard()}
      <Box role="status" aria-live="polite" sx={VISUALLY_HIDDEN}>
        {announcement}
      </Box>
      <Snackbar
        open={failure !== null}
        autoHideDuration={8000}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') setFailure(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setFailure(null)}>
          {failure}
        </Alert>
      </Snackbar>
      <QuickCreateTaskDialog
        open={creating}
        onClose={() => setCreating(false)}
        // A board narrowed to one project adds to that project, so the new
        // card lands on the board being looked at.
        defaults={{
          projectId:
            controls.filters.project && controls.filters.project !== 'none'
              ? controls.filters.project
              : null,
        }}
        onCreated={(task) => {
          setCreating(false);
          setCreated(task);
        }}
      />
      <TaskCreatedSnackbar task={created} onOpen={open} onClose={() => setCreated(null)} />
      <TaskDrawerHost />
    </>
  );
};

export default TaskBoardPage;

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { TaskBoard, TaskBoardColumn, TaskListItem, TaskStatus } from '@iaa/shared';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { taskStatusLabel } from '../task-display';
import { TaskStatusChip } from '../TaskStatusChip';

import { COLUMN_ID_PREFIX, columnDropId, planDrop, type BoardPosition } from './board-order';
import { BoardCard, BoardCardOverlay, type CardActions } from './BoardCard';

const COLUMN_WIDTH = 288;

const columnLabelOf = (board: TaskBoard, id: UniqueIdentifier | undefined): string => {
  if (id === undefined) return 'nowhere';
  const text = String(id);
  if (text.startsWith(COLUMN_ID_PREFIX)) {
    return taskStatusLabel(text.slice(COLUMN_ID_PREFIX.length) as TaskStatus);
  }
  const column = board.columns.find((candidate) =>
    candidate.items.some((item) => item.id === text),
  );
  return column ? taskStatusLabel(column.status) : 'another card';
};

const BoardColumnView = ({
  column,
  canMove,
  reducedMotion,
  actions,
}: {
  column: TaskBoardColumn;
  canMove: boolean;
  reducedMotion: boolean;
  actions: CardActions;
}): JSX.Element => {
  const { setNodeRef, isOver } = useDroppable({
    id: columnDropId(column.status),
    data: { type: 'column', status: column.status },
  });
  const ids = useMemo(() => column.items.map((item) => item.id), [column.items]);
  const capped = column.total > column.items.length;
  const headingId = `board-column-${column.status}`;

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        flex: `0 0 ${COLUMN_WIDTH}px`,
        maxWidth: '85vw',
        display: 'flex',
        flexDirection: 'column',
        scrollSnapAlign: 'start',
        borderRadius: 3,
        border: 1,
        borderColor: isOver ? 'primary.main' : 'divider',
        bgcolor: (theme) => alpha(theme.palette.primary.main, isOver ? 0.08 : 0.03),
        transition: reducedMotion ? 'none' : 'border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <Box id={headingId} component="h2" sx={{ m: 0, display: 'flex' }}>
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
      <SortableContext id={column.status} items={ids} strategy={verticalListSortingStrategy}>
        <Box
          component="ol"
          ref={setNodeRef}
          sx={{
            m: 0,
            px: 1.25,
            pb: 1.25,
            display: 'grid',
            gap: 1,
            alignContent: 'start',
            minHeight: 96,
            flexGrow: 1,
          }}
        >
          {column.items.map((task, index) => (
            <BoardCard
              key={task.id}
              task={task}
              index={index}
              count={column.items.length}
              canMove={canMove}
              reducedMotion={reducedMotion}
              actions={actions}
            />
          ))}
          {column.items.length === 0 && (
            <Typography
              component="li"
              variant="body2"
              color="text.secondary"
              sx={{
                listStyle: 'none',
                p: 2,
                textAlign: 'center',
                border: 1,
                borderStyle: 'dashed',
                borderColor: 'divider',
                borderRadius: 2.5,
              }}
            >
              {canMove ? 'Nothing here. Drop a card to move it here.' : 'Nothing here.'}
            </Typography>
          )}
        </Box>
      </SortableContext>
      {capped && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1.75, pb: 1.5 }}>
          Showing {column.items.length} of {column.total}. Filter the board to find the rest.
        </Typography>
      )}
    </Box>
  );
};

/** A row of columns that scrolls sideways inside itself, so the page never does. */
const boardRowSx = {
  display: 'flex',
  gap: 2,
  alignItems: 'stretch',
  overflowX: 'auto',
  pb: 2,
  scrollSnapType: { xs: 'x mandatory', md: 'none' },
  overscrollBehaviorX: 'contain',
} as const;

export interface TaskBoardViewProps {
  board: TaskBoard;
  canMove: boolean;
  reducedMotion: boolean;
  onOpen: (key: string) => void;
  onMove: (task: TaskListItem, position: BoardPosition) => void;
  onMoveTo: (task: TaskListItem, status: TaskStatus) => void;
  onStep: (task: TaskListItem, direction: -1 | 1) => void;
}

/**
 * The Kanban board: a column per status in `TASK_BOARD_COLUMNS` order.
 *
 * Built on dnd-kit, which handles mouse, touch and keyboard dragging and
 * announces each step to screen readers. The board only reports where a card
 * was dropped; the page sends the move and puts the card back if the server
 * refuses it (plan D13).
 */
export const TaskBoardView = ({
  board,
  canMove,
  reducedMotion,
  onOpen,
  onMove,
  onMoveTo,
  onStep,
}: TaskBoardViewProps): JSX.Element => {
  const sensors = useSensors(
    // A few pixels of movement before a drag, so a click still opens the card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press on touch screens, so a swipe still scrolls the column.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () =>
      board.columns.flatMap((column) => column.items).find((item) => item.id === activeId) ?? null,
    [board, activeId],
  );
  const keyOf = (id: UniqueIdentifier): string =>
    board.columns.flatMap((column) => column.items).find((item) => item.id === String(id))?.key ??
    'The card';

  const announcements: Announcements = {
    onDragStart: ({ active: card }) =>
      `Picked up ${keyOf(card.id)}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`,
    onDragOver: ({ active: card, over }) =>
      over ? `${keyOf(card.id)} is over ${columnLabelOf(board, over.id)}.` : undefined,
    onDragEnd: ({ active: card, over }) =>
      over
        ? `${keyOf(card.id)} dropped in ${columnLabelOf(board, over.id)}.`
        : `${keyOf(card.id)} dropped where it was.`,
    onDragCancel: ({ active: card }) => `Moving ${keyOf(card.id)} was cancelled.`,
  };

  const handleDragStart = (event: DragStartEvent): void => setActiveId(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveId(null);
    if (!event.over || !active) return;
    const position = planDrop(board, String(event.active.id), String(event.over.id));
    if (position) onMove(active, position);
  };

  const actions: CardActions = { onOpen, onMoveTo, onStep };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To move a card, press Space to pick it up, the arrow keys to move it, and Space again to drop it. The More button on each card offers the same moves as a menu.',
        },
      }}
    >
      <Box sx={boardRowSx}>
        {board.columns.map((column) => (
          <BoardColumnView
            key={column.status}
            column={column}
            canMove={canMove}
            reducedMotion={reducedMotion}
            actions={actions}
          />
        ))}
      </Box>
      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {active ? <BoardCardOverlay task={active} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

/** The loading shape of the board: its columns, each with a few cards. */
export const TaskBoardSkeleton = (): JSX.Element => (
  <Box sx={boardRowSx} aria-hidden>
    {[3, 2, 4, 1, 2, 2].map((cards, index) => (
      <Box
        key={index}
        sx={{
          flex: `0 0 ${COLUMN_WIDTH}px`,
          maxWidth: '85vw',
          p: 1.5,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: 4 }} />
          <Skeleton variant="rounded" width={32} height={24} sx={{ borderRadius: 4 }} />
        </Stack>
        <Stack spacing={1}>
          {Array.from({ length: cards }, (_, card) => (
            <Skeleton key={card} variant="rounded" height={104} sx={{ borderRadius: 2.5 }} />
          ))}
        </Stack>
      </Box>
    ))}
  </Box>
);

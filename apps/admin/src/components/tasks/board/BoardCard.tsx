import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskListItem, TaskStatus } from '@iaa/shared';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useState, type KeyboardEventHandler, type MouseEvent } from 'react';

import { TASK_STATUS_OPTIONS } from '../../../lib/select-options';
import { handleSx, skinned, surfaceSx, tokenVar } from '../../../theme/surfaces';
import { PersonAvatars } from '../PersonAvatars';
import { TaskDueChip } from '../TaskDueChip';
import { TaskPriorityChip } from '../TaskPriorityChip';
import { ChecklistCount } from '../TaskRow';

/** What a card can ask the board to do: open it, or move it by menu. */
export interface CardActions {
  onOpen: (key: string) => void;
  onMoveTo: (task: TaskListItem, status: TaskStatus) => void;
  onStep: (task: TaskListItem, direction: -1 | 1) => void;
  /**
   * Hands the board the card's Move button, and returns what to call when it
   * goes, so focus can follow a card the menu moved to another column: that
   * column draws the card afresh, and the button that had focus is gone.
   */
  registerMoveButton: (taskId: string, button: HTMLButtonElement) => () => void;
}

/** A card's face: what the board shows of a task, dragged or not. */
export const CardFace = ({ task }: { task: TaskListItem }): JSX.Element => (
  <Stack spacing={1}>
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
      <TaskPriorityChip priority={task.priority} />
      <TaskDueChip dueDate={task.dueDate} status={task.status} />
    </Stack>
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <ChecklistCount task={task} />
        {task.project && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
            {task.project.title}
          </Typography>
        )}
      </Stack>
      <PersonAvatars people={task.assignees} size={24} />
    </Stack>
  </Stack>
);

const cardLayoutSx = {
  position: 'relative',
  p: 1.5,
  borderRadius: 2.5,
  cursor: 'grab',
  touchAction: 'manipulation',
  // The skin's card: paper with a divider edge in Classic.
  ...surfaceSx.card,
} as const;

/**
 * Under the pointer Classic tints the edge; the other skins keep their own
 * edge and lift the card instead, which is how their clickable cards answer.
 */
const cardHoverSx = skinned(
  { '&:hover': { borderColor: 'primary.light' } },
  { '&:hover': { borderColor: tokenVar('surfaceBorderColor'), ...surfaceSx.cardHover } },
);

/**
 * One task on the board.
 *
 * Dragged with a mouse from anywhere on the card, or on a touch screen after a
 * short press so the column can still scroll. From the keyboard, the handle
 * picks the card up (Space), arrows move it and Space drops it; the Move
 * menu offers the same moves as plain buttons (move up, move down, move to
 * another status) for anyone who would rather not drag at all.
 */
export const BoardCard = ({
  task,
  index,
  count,
  canMove,
  reducedMotion,
  actions,
}: {
  task: TaskListItem;
  index: number;
  count: number;
  canMove: boolean;
  reducedMotion: boolean;
  actions: CardActions;
}): JSX.Element => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'card', status: task.status },
    disabled: !canMove,
    transition: reducedMotion ? null : undefined,
  });
  // Mouse and touch start a drag from anywhere on the card; the keyboard only
  // from the handle, so Enter and Space on the title still open the task.
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const handleKeyDown = onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined;
  const menuItem = (run: () => void) => () => {
    setMenuAnchor(null);
    run();
  };
  const stop = (event: MouseEvent): void => event.stopPropagation();
  const { registerMoveButton } = actions;
  // Stable, so the board hears of the button only when it arrives or goes.
  const moveButtonRef = useCallback(
    (button: HTMLButtonElement | null) =>
      button ? registerMoveButton(task.id, button) : undefined,
    [registerMoveButton, task.id],
  );

  return (
    <Box
      component="li"
      ref={setNodeRef}
      {...pointerListeners}
      onClick={() => actions.onOpen(task.key)}
      sx={[
        cardLayoutSx,
        cardHoverSx,
        {
          listStyle: 'none',
          opacity: isDragging ? 0.4 : 1,
          cursor: canMove ? 'grab' : 'pointer',
          transform: CSS.Translate.toString(transform),
          transition: reducedMotion ? undefined : transition,
        },
        // The gap a lifted card leaves is pressed into the column (no shadow in Classic).
        isDragging && { boxShadow: tokenVar('surfacePressedShadow') },
      ]}
    >
      <Stack direction="row" spacing={0.5} alignItems="flex-start">
        {canMove && (
          <IconButton
            ref={setActivatorNodeRef}
            {...attributes}
            onKeyDown={handleKeyDown}
            onClick={stop}
            size="small"
            aria-label={`Drag ${task.key}`}
            sx={{ ml: -0.75, mt: -0.25, color: 'text.secondary', cursor: 'grab', ...handleSx }}
          >
            <DragIndicatorRoundedIcon fontSize="small" />
          </IconButton>
        )}
        <ButtonBase
          onClick={(event) => {
            stop(event);
            actions.onOpen(task.key);
          }}
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: 'block',
            textAlign: 'left',
            borderRadius: 1,
            '&.Mui-focusVisible': { outline: tokenVar('focusRing') },
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.secondary' }}>
            {task.key}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 650, overflowWrap: 'anywhere', lineHeight: 1.4 }}
          >
            {task.title}
          </Typography>
        </ButtonBase>
        {canMove && (
          <IconButton
            ref={moveButtonRef}
            size="small"
            aria-label={`Move ${task.key}`}
            aria-haspopup="menu"
            onClick={(event) => {
              stop(event);
              setMenuAnchor(event.currentTarget);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            sx={{ mr: -0.75, mt: -0.25 }}
          >
            <MoreHorizRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <Box sx={{ mt: 1 }}>
        <CardFace task={task} />
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        // The menu renders in a portal, but React still passes its events up
        // to the card: without these a choice would also open the task or
        // start a drag.
        onClick={stop}
        onMouseDown={stop}
      >
        <MenuItem disabled={index === 0} onClick={menuItem(() => actions.onStep(task, -1))}>
          <ListItemIcon>
            <ArrowUpwardRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move up</ListItemText>
        </MenuItem>
        <MenuItem disabled={index >= count - 1} onClick={menuItem(() => actions.onStep(task, 1))}>
          <ListItemIcon>
            <ArrowDownwardRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move down</ListItemText>
        </MenuItem>
        <Divider />
        <ListSubheader sx={{ lineHeight: 2.5 }}>Move to…</ListSubheader>
        {TASK_STATUS_OPTIONS.map((option) => {
          const current = option.value === task.status;
          return (
            <MenuItem
              key={option.value}
              disabled={current}
              onClick={menuItem(() => actions.onMoveTo(task, option.value as TaskStatus))}
            >
              <ListItemIcon>
                {current ? <CheckRoundedIcon fontSize="small" /> : option.icon}
              </ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
};

/** The card as it follows the pointer while dragging. */
export const BoardCardOverlay = ({ task }: { task: TaskListItem }): JSX.Element => (
  <Box
    sx={[
      cardLayoutSx,
      cardHoverSx,
      {
        cursor: 'grabbing',
        // It is always under the pointer, so the hover lift must not replace the drag shadow.
        '&, &:hover': { boxShadow: 12 },
        transform: 'rotate(1.5deg)',
        '@media (prefers-reduced-motion: reduce)': { transform: 'none' },
      },
    ]}
  >
    <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.secondary' }}>
      {task.key}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 650, mb: 1, overflowWrap: 'anywhere' }}>
      {task.title}
    </Typography>
    <CardFace task={task} />
  </Box>
);

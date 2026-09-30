import type { TaskListItem } from '@iaa/shared';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { useHasPermission } from '../../auth/useCan';
import { VISUALLY_HIDDEN } from '../../lib/visually-hidden';
import { skinned, tokenVar } from '../../theme/surfaces';

import { PersonAvatars } from './PersonAvatars';
import { dueState, taskPriorityLabel, taskStatusLabel } from './task-display';
import { TaskDueChip } from './TaskDueChip';
import { TaskPriorityChip } from './TaskPriorityChip';
import { TaskProjectName } from './TaskProjectName';
import { TaskStatusChip } from './TaskStatusChip';

/** "3/5" beside a checklist icon, or nothing for a task without one. */
export const ChecklistCount = ({ task }: { task: TaskListItem }): JSX.Element | null =>
  task.checklistTotal > 0 ? (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      aria-label={`${task.checklistDone} of ${task.checklistTotal} checklist items done`}
      sx={{ color: task.checklistDone === task.checklistTotal ? 'success.main' : 'text.secondary' }}
    >
      <ChecklistRoundedIcon sx={{ fontSize: 16 }} aria-hidden />
      <Typography variant="caption" sx={{ fontWeight: 650 }} aria-hidden>
        {task.checklistDone}/{task.checklistTotal}
      </Typography>
    </Stack>
  ) : null;

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * What a row shows besides its key and title, in words, for screen readers:
 * a button's content is not read out, so the chips and counts would otherwise
 * be heard by nobody. The status is always said, even in a list grouped by it.
 * The project is said only to someone who may read projects, as it is shown.
 */
export const taskRowSummary = (task: TaskListItem, showProject: boolean): string =>
  [
    taskStatusLabel(task.status),
    `${taskPriorityLabel(task.priority)} priority`,
    dueState(task.dueDate, task.status).label,
    showProject ? task.project?.title : null,
    task.checklistTotal > 0
      ? `${task.checklistDone} of ${task.checklistTotal} checklist items done`
      : null,
    task.commentCount > 0 ? plural(task.commentCount, 'comment', 'comments') : null,
    task.assignees.length > 0
      ? `Assigned to ${task.assignees.map((person) => person.name).join(', ')}`
      : 'Unassigned',
  ]
    .filter(Boolean)
    .join('. ');

/**
 * A row's answer to the pointer. Classic tints it with the primary, as the
 * All tasks table tints its rows. The other skins keep that table's row tint
 * (their list-item fill is frosted white in Glass, which vanishes on a frosted
 * card), add their list item's depth (a lift, an edge, a soft clay bump), and
 * press the row in while it is pushed.
 */
const rowStatesSx = skinned(
  { '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06) } },
  {
    '&:hover': { bgcolor: tokenVar('gridRowHover'), boxShadow: tokenVar('itemHoverShadow') },
    '&:active': { boxShadow: tokenVar('surfacePressedShadow') },
  },
);

/**
 * One task in a compact list: My tasks, a project's Tasks tab. The whole row
 * opens the task; on a phone the chips wrap under the title rather than
 * pushing the page sideways.
 *
 * Named by its key and title, and described by the rest (`taskRowSummary`).
 * Finished work is struck through and quieter in colour, never faded as a
 * whole: faded, the small text fell below the contrast it needs to be read.
 */
export const TaskRow = ({
  task,
  onOpen,
  showStatus = true,
}: {
  task: TaskListItem;
  onOpen: (key: string) => void;
  showStatus?: boolean;
}): JSX.Element => {
  const id = useId();
  const done = task.status === 'done';
  const canReadProjects = useHasPermission('read', 'projects');
  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <ButtonBase
        onClick={() => onOpen(task.key)}
        aria-labelledby={`${id}-key ${id}-title`}
        aria-describedby={`${id}-summary`}
        sx={[
          {
            width: '100%',
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(0, 1fr) auto auto' },
            alignItems: 'center',
            gap: { xs: 1, md: 2 },
            px: { xs: 1.5, md: 2 },
            py: 1.25,
            textAlign: 'left',
            borderRadius: 2,
            // Inside the row, where the list's edge cannot clip it. Classic: 2px solid primary.
            '&.Mui-focusVisible': { outline: tokenVar('focusRing'), outlineOffset: -2 },
          },
          rowStatesSx,
        ]}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0 }}>
            <Typography
              id={`${id}-key`}
              variant="caption"
              sx={{ fontWeight: 750, color: 'text.secondary', flexShrink: 0 }}
            >
              {task.key}
            </Typography>
            <Typography
              id={`${id}-title`}
              variant="body2"
              sx={{
                fontWeight: 650,
                minWidth: 0,
                color: done ? 'text.secondary' : 'text.primary',
                textDecoration: done ? 'line-through' : 'none',
              }}
              noWrap
            >
              {task.title}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            sx={{ mt: 0.75 }}
          >
            {showStatus && <TaskStatusChip status={task.status} />}
            <TaskPriorityChip priority={task.priority} />
            <TaskDueChip dueDate={task.dueDate} status={task.status} />
            <TaskProjectName project={task.project} sx={{ maxWidth: 220 }} />
          </Stack>
        </Box>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ display: { xs: 'none', md: 'flex' }, color: 'text.secondary' }}
        >
          <ChecklistCount task={task} />
          {task.commentCount > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 15 }} aria-hidden />
              <Typography variant="caption" sx={{ fontWeight: 650 }} aria-hidden>
                {task.commentCount}
              </Typography>
            </Stack>
          )}
        </Stack>
        <PersonAvatars people={task.assignees} />
        {/* Absolutely placed, so it takes no cell in the row's grid. */}
        <Box component="span" id={`${id}-summary`} sx={VISUALLY_HIDDEN}>
          {taskRowSummary(task, canReadProjects)}
        </Box>
      </ButtonBase>
    </Box>
  );
};

/** The loading shape of a compact list: rows the height a task row takes. */
export const TaskRowsSkeleton = ({ rows = 3 }: { rows?: number }): JSX.Element => (
  <Stack spacing={1} aria-hidden sx={{ px: { xs: 1.5, md: 2 }, py: 1 }}>
    {Array.from({ length: rows }, (_, index) => (
      <Box
        key={index}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Box>
          <Skeleton width={index % 2 ? '55%' : '70%'} />
          <Stack direction="row" spacing={0.75}>
            <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 4 }} />
            <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 4 }} />
          </Stack>
        </Box>
        <Skeleton variant="circular" width={26} height={26} />
      </Box>
    ))}
  </Stack>
);

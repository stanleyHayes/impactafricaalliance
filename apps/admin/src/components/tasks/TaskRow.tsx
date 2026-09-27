import type { TaskListItem } from '@iaa/shared';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { PersonAvatars } from './PersonAvatars';
import { TaskDueChip } from './TaskDueChip';
import { TaskPriorityChip } from './TaskPriorityChip';
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

/**
 * One task in a compact list: My tasks, a project's Tasks tab. The whole row
 * opens the task; on a phone the chips wrap under the title rather than
 * pushing the page sideways.
 */
export const TaskRow = ({
  task,
  onOpen,
  showStatus = true,
}: {
  task: TaskListItem;
  onOpen: (key: string) => void;
  showStatus?: boolean;
}): JSX.Element => (
  <Box component="li" sx={{ listStyle: 'none' }}>
    <ButtonBase
      onClick={() => onOpen(task.key)}
      aria-label={`Open ${task.key}: ${task.title}`}
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(0, 1fr) auto auto' },
        alignItems: 'center',
        gap: { xs: 1, md: 2 },
        px: { xs: 1.5, md: 2 },
        py: 1.25,
        textAlign: 'left',
        borderRadius: 2,
        opacity: task.status === 'done' ? 0.72 : 1,
        '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06) },
        '&.Mui-focusVisible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: -2,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 750, color: 'text.secondary', flexShrink: 0 }}
          >
            {task.key}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 650,
              minWidth: 0,
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
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
          {task.project && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
              {task.project.title}
            </Typography>
          )}
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
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            aria-label={`${task.commentCount} comments`}
          >
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 15 }} aria-hidden />
            <Typography variant="caption" sx={{ fontWeight: 650 }} aria-hidden>
              {task.commentCount}
            </Typography>
          </Stack>
        )}
      </Stack>
      <PersonAvatars people={task.assignees} />
    </ButtonBase>
  </Box>
);

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

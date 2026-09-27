import type { TaskStatus } from '@iaa/shared';
import Chip, { type ChipProps } from '@mui/material/Chip';
import type { ReactElement } from 'react';

import { TASK_STATUS_OPTIONS } from '../../lib/select-options';

const COLOURS: Record<TaskStatus, ChipProps['color']> = {
  backlog: 'default',
  todo: 'default',
  'in-progress': 'info',
  blocked: 'error',
  review: 'warning',
  done: 'success',
};

/** A task's status in the words, icon and colour the rest of the console uses for it. */
export const TaskStatusChip = ({
  status,
  size = 'small',
}: {
  status: TaskStatus;
  size?: ChipProps['size'];
}): JSX.Element => {
  const option = TASK_STATUS_OPTIONS.find((candidate) => candidate.value === status);
  return (
    <Chip
      size={size}
      color={COLOURS[status]}
      variant={status === 'backlog' ? 'outlined' : 'filled'}
      icon={(option?.icon as ReactElement | undefined) ?? undefined}
      label={option?.label ?? status}
      sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
    />
  );
};

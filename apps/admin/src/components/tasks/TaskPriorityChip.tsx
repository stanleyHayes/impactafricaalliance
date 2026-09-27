import type { WorkPriority } from '@iaa/shared';
import Chip, { type ChipProps } from '@mui/material/Chip';
import type { ReactElement } from 'react';

import { WORK_PRIORITY_OPTIONS } from '../../lib/select-options';

const COLOURS: Record<WorkPriority, ChipProps['color']> = {
  low: 'default',
  medium: 'default',
  high: 'warning',
  urgent: 'error',
};

/**
 * How pressing a task is. Low and medium stay quiet and outlined, so the
 * coloured chips on a busy board are the ones that need attention.
 */
export const TaskPriorityChip = ({
  priority,
  size = 'small',
}: {
  priority: WorkPriority;
  size?: ChipProps['size'];
}): JSX.Element => {
  const option = WORK_PRIORITY_OPTIONS.find((candidate) => candidate.value === priority);
  const quiet = priority === 'low' || priority === 'medium';
  return (
    <Chip
      size={size}
      color={COLOURS[priority]}
      variant={quiet ? 'outlined' : 'filled'}
      icon={(option?.icon as ReactElement | undefined) ?? undefined}
      label={option?.label ?? priority}
      sx={{ fontWeight: 650, '& .MuiChip-icon': { fontSize: 16 } }}
    />
  );
};

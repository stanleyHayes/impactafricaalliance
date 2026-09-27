import type { WorkPriority } from '@iaa/shared';
import Chip, { type ChipProps } from '@mui/material/Chip';
import { isValidElement } from 'react';

import { WORK_PRIORITY_OPTIONS } from '../../lib/select-options';

const COLOURS: Record<WorkPriority, ChipProps['color']> = {
  low: 'default',
  medium: 'default',
  high: 'warning',
  urgent: 'error',
};

/**
 * How pressing a piece of work is: a task's priority and a project's, drawn
 * the same way wherever it appears, since both use the same four levels. Low
 * and medium stay quiet and outlined, so the filled chips on a busy board or
 * list are the ones that need attention.
 *
 * `short` says just the level ("High"), for a row of chips or a column headed
 * "Priority"; `long` says "High priority" where it stands alone.
 */
export const WorkPriorityChip = ({
  priority,
  size = 'small',
  wording = 'short',
}: {
  priority: WorkPriority;
  size?: ChipProps['size'];
  wording?: 'short' | 'long';
}): JSX.Element => {
  const option = WORK_PRIORITY_OPTIONS.find((candidate) => candidate.value === priority);
  const quiet = priority === 'low' || priority === 'medium';
  const level = option?.label ?? priority;
  // Chip clones its icon to add a class, so it must be the element itself.
  const icon = isValidElement(option?.icon) ? option.icon : undefined;
  return (
    <Chip
      size={size}
      color={COLOURS[priority]}
      variant={quiet ? 'outlined' : 'filled'}
      icon={icon}
      label={wording === 'long' ? `${level} priority` : level}
      sx={{ fontWeight: 650, '& .MuiChip-icon': { fontSize: size === 'medium' ? 17 : 16 } }}
    />
  );
};

/** A task's priority, as every task view shows it. */
export const TaskPriorityChip = ({
  priority,
  size = 'small',
}: {
  priority: WorkPriority;
  size?: ChipProps['size'];
}): JSX.Element => <WorkPriorityChip priority={priority} size={size} />;

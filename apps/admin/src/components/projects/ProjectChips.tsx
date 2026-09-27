import type { ProjectStatus, WorkPriority } from '@iaa/shared';
import Chip, { type ChipProps } from '@mui/material/Chip';
import { isValidElement, type ReactElement } from 'react';

import { PROJECT_STATUS_OPTIONS } from '../../lib/select-options';
import { WorkPriorityChip } from '../tasks/TaskPriorityChip';

import { statusLabel } from './project-format';

type Tone = NonNullable<ChipProps['color']>;

/** Chip colour for each status: live work stands out, finished and paused work recede. */
const STATUS_TONE: Record<ProjectStatus, Tone> = {
  draft: 'default',
  planned: 'info',
  active: 'success',
  'on-hold': 'warning',
  completed: 'primary',
  archived: 'default',
};

// Chip clones its icon to add a class, so it must be the element itself, never
// wrapped in a fragment (which cannot take one).
const iconFor = (
  options: typeof PROJECT_STATUS_OPTIONS,
  value: string,
): ReactElement | undefined => {
  const icon = options.find((option) => option.value === value)?.icon;
  return isValidElement(icon) ? icon : undefined;
};

/** A project's status, with the icon the status menu uses. */
export const ProjectStatusChip = ({
  status,
  size = 'small',
}: {
  status: ProjectStatus;
  size?: ChipProps['size'];
}): JSX.Element => (
  <Chip
    size={size}
    color={STATUS_TONE[status]}
    variant={status === 'archived' ? 'outlined' : 'filled'}
    icon={iconFor(PROJECT_STATUS_OPTIONS, status)}
    label={statusLabel(status)}
    sx={{ fontWeight: 650, '& .MuiChip-icon': { fontSize: 17 } }}
  />
);

/**
 * A project's priority, spelt out so it does not rely on colour alone. Drawn
 * by `WorkPriorityChip`, as a task's is, so the same level looks the same on
 * a project and on its tasks.
 */
export const ProjectPriorityChip = ({
  priority,
  size = 'small',
  short = false,
}: {
  priority: WorkPriority;
  size?: ChipProps['size'];
  /** Just the level, for a column already headed "Priority". */
  short?: boolean;
}): JSX.Element => (
  <WorkPriorityChip priority={priority} size={size} wording={short ? 'short' : 'long'} />
);

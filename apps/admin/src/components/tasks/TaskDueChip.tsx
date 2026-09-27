import type { TaskStatus } from '@iaa/shared';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import Chip, { type ChipProps } from '@mui/material/Chip';

import { dueState, type DueState } from './task-display';

const colourOf = (state: DueState, status: TaskStatus): ChipProps['color'] => {
  if (state.late) return 'error';
  return state.bucket === 'today' && status !== 'done' ? 'warning' : 'default';
};

/**
 * A task's due date: "Due today", "Due 9 Oct", or "Overdue · 3 Oct" in the
 * error colour for open work past its day. Renders nothing without a date.
 */
export const TaskDueChip = ({
  dueDate,
  status,
  size = 'small',
}: {
  dueDate: string | null | undefined;
  status: TaskStatus;
  size?: ChipProps['size'];
}): JSX.Element | null => {
  const state = dueState(dueDate, status);
  if (!state.label) return null;
  const colour = colourOf(state, status);
  return (
    <Chip
      size={size}
      icon={<EventRoundedIcon />}
      label={state.label}
      color={colour}
      variant={colour === 'default' ? 'outlined' : 'filled'}
      sx={{ fontWeight: 650, '& .MuiChip-icon': { fontSize: 15 } }}
    />
  );
};

import type { Task } from '@iaa/shared';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import IconButton from '@mui/material/IconButton';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';

import { useHasPermission } from '../../auth/useCan';
import { skinned } from '../../theme/surfaces';
import { topBarActionSkin } from '../layout/top-bar-action';

import { QuickCreateTaskDialog, TaskCreatedSnackbar } from './QuickCreateTaskDialog';
import { useOpenTask } from './use-task-drawer';

/**
 * The button's look. Classic: a quiet glyph that gains a primary tint under
 * the pointer. The other skins make it one of their raised controls, by the
 * recipe every top-bar action shares, so the bar's actions read as one set.
 */
const triggerSx = skinned(
  {
    color: 'text.secondary',
    '&:hover': {
      color: 'text.primary',
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
    },
  },
  topBarActionSkin,
);

/**
 * "New task" in the top bar, so a task can be written down from any page the
 * moment it comes up.
 *
 * Shown only to people who can read and create tasks. Opens the five-field quick
 * create; once saved, "Open" shows the task in the drawer on a task page, or
 * on its own page anywhere else.
 */
export const QuickCreateTaskButton = (): JSX.Element | null => {
  const canRead = useHasPermission('read', 'tasks');
  const canCreate = useHasPermission('create', 'tasks') && canRead;
  const openTask = useOpenTask();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<Task | null>(null);
  if (!canCreate) return null;
  return (
    <>
      <Tooltip title="New task">
        <IconButton
          aria-label="New task"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          sx={triggerSx}
        >
          <AddTaskRoundedIcon />
        </IconButton>
      </Tooltip>
      <QuickCreateTaskDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(task) => {
          setOpen(false);
          setCreated(task);
        }}
      />
      <TaskCreatedSnackbar task={created} onOpen={openTask} onClose={() => setCreated(null)} />
    </>
  );
};

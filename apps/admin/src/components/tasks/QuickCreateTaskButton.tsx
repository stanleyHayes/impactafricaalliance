import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import IconButton from '@mui/material/IconButton';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';

/**
 * "New task" in the top bar, so a task can be written down from any page the
 * moment it comes up.
 *
 * Shown only to people who can create tasks. Owned by the tasks module, which
 * will open its quick-create dialog here; until then it goes to the full
 * task form.
 */
export const QuickCreateTaskButton = (): JSX.Element | null => {
  const navigate = useNavigate();
  const canCreate = useHasPermission('create', 'tasks');
  if (!canCreate) return null;
  return (
    <Tooltip title="New task">
      <IconButton
        aria-label="New task"
        onClick={() => navigate('/tasks/new')}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'text.primary',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <AddTaskRoundedIcon />
      </IconButton>
    </Tooltip>
  );
};

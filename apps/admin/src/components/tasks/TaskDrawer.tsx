import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';

import { TaskDetailContent } from './TaskDetailContent';
import { useTaskDrawer } from './use-task-drawer';

export interface TaskDrawerProps {
  /** The task to show, by key. Null closes the drawer. */
  taskKey: string | null;
  onClose: () => void;
}

/**
 * A task beside the list it was opened from: a right-hand panel over the
 * page, full width on a phone. Everything in it saves as it changes, so
 * closing it never loses work.
 *
 * It is a modal, so it sits at the modal layer rather than MUI's drawer layer:
 * the fixed top bar is one above the drawer layer, and would otherwise cover
 * the drawer's first row, Close button included, and stay clickable over it.
 * What the drawer opens itself (menus, date pickers, confirmations) is
 * portalled after it, so still stacks on top.
 */
export const TaskDrawer = ({ taskKey, onClose }: TaskDrawerProps): JSX.Element => (
  <Drawer
    anchor="right"
    open={Boolean(taskKey)}
    onClose={onClose}
    sx={{ zIndex: (theme) => theme.zIndex.modal }}
    slotProps={{
      paper: {
        'aria-label': taskKey ? `Task ${taskKey.toUpperCase()}` : 'Task',
        sx: {
          width: { xs: '100%', sm: 560, md: 680 },
          maxWidth: '100%',
          bgcolor: 'background.default',
          backgroundImage: 'none',
        },
      },
    }}
  >
    {taskKey && (
      <Box sx={{ p: { xs: 2, sm: 3 }, pb: 6 }}>
        <TaskDetailContent key={taskKey} taskKey={taskKey} variant="drawer" onClose={onClose} />
      </Box>
    )}
  </Drawer>
);

/**
 * The drawer as a page hosts it: opened and closed by `?task=<key>`, so a
 * task can be linked to and Back closes it. Place once on each page that
 * lists tasks.
 */
export const TaskDrawerHost = (): JSX.Element => {
  const { taskKey, close } = useTaskDrawer();
  return <TaskDrawer taskKey={taskKey} onClose={close} />;
};

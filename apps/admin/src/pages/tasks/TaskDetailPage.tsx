import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { PageHeader } from '../../components/PageHeader';
import { TaskDetailContent } from '../../components/tasks/TaskDetailContent';

/**
 * One task at its own address, `/tasks/IAA-42`, for links shared in chat or
 * email. The same content as the drawer, laid out for a full page: the work
 * on the left, its properties and history on the right.
 */
const TaskDetailPage = (): JSX.Element => {
  const { taskKey = '' } = useParams();
  return (
    <>
      <PageHeader
        // Keys are typed in any case; they are shown as issued.
        title={taskKey ? taskKey.toUpperCase() : 'Task'}
        description="A task's details, checklist, attachments, comments and activity. Changes save as you make them."
        icon={<TaskAltIcon />}
        action={
          <Button
            component={RouterLink}
            to="/tasks/all"
            startIcon={<ArrowBackRoundedIcon />}
            fullWidth
          >
            All tasks
          </Button>
        }
      />
      <Box
        sx={{
          p: { xs: 2, md: 3 },
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <TaskDetailContent key={taskKey} taskKey={taskKey} variant="page" />
      </Box>
    </>
  );
};

export default TaskDetailPage;

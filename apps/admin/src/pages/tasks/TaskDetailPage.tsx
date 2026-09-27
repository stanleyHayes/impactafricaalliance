import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useParams } from 'react-router-dom';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';

/**
 * One task at its own address, `/tasks/IAA-42`, for links shared in chat or
 * email.
 *
 * Placeholder until the tasks module lands. The route and its permission
 * check are already final.
 */
const TaskDetailPage = (): JSX.Element => {
  const { taskKey = '' } = useParams();
  return (
    <>
      <PageHeader
        // Keys are typed in any case; they are shown as issued.
        title={taskKey ? taskKey.toUpperCase() : 'Task'}
        description="A task's details, checklist, attachments, comments and activity."
        icon={<TaskAltIcon />}
      />
      <EmptyState
        icon={<ConstructionRoundedIcon />}
        title="This area is being built"
        description="The task's details will appear here."
      />
    </>
  );
};

export default TaskDetailPage;

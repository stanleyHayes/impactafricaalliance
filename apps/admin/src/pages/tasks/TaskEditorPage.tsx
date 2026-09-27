import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useParams } from 'react-router-dom';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const TaskEditorPage = (): JSX.Element => {
  // Creating and editing share one page, told apart by the id in the address.
  const { taskKey } = useParams();
  return (
    <>
      <PageHeader
        title={taskKey ? 'Edit task' : 'New task'}
        description="Set the task out step by step: basics, assignment, schedule and details."
        icon={<TaskAltIcon />}
        help={pageGuides['task-editor']}
      />
      <EmptyState
        icon={<ConstructionRoundedIcon />}
        title="This area is being built"
        description="The stepwise task form will appear here."
      />
    </>
  );
};

export default TaskEditorPage;

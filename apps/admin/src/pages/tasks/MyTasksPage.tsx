import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const MyTasksPage = (): JSX.Element => (
  <>
    <PageHeader
      title="My tasks"
      description="Work assigned to you, grouped by when it is due."
      icon={<TaskAltIcon />}
      help={pageGuides['my-tasks']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="Your tasks, grouped into Overdue, Today, Upcoming and No date, will appear here."
    />
  </>
);

export default MyTasksPage;

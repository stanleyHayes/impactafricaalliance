import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const AllTasksPage = (): JSX.Element => (
  <>
    <PageHeader
      title="All tasks"
      description="Every task across the team, with filters for status, people, projects and dates."
      icon={<FormatListBulletedIcon />}
      help={pageGuides['all-tasks']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="The full task list, with filters and paging, will appear here."
    />
  </>
);

export default AllTasksPage;

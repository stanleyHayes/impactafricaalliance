import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const TaskBoardPage = (): JSX.Element => (
  <>
    <PageHeader
      title="Task board"
      description="Tasks as cards in status columns. Move a card to change its status."
      icon={<ViewKanbanIcon />}
      help={pageGuides['task-board']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="The board, one column per status, will appear here."
    />
  </>
);

export default TaskBoardPage;

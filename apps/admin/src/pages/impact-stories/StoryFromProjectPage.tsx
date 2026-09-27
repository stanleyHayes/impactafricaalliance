import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Starts an impact story from a project (`/impact-stories/from-project/:projectId`):
 * it will create a draft copied from the project and open it in the editor.
 *
 * Placeholder until the impact stories module lands. The route and its
 * permission checks are already final.
 */
const StoryFromProjectPage = (): JSX.Element => (
  <>
    <PageHeader
      title="New impact story"
      description="A draft copied from the project: its summary, numbers, partners and shareable photos."
      icon={<HistoryEduIcon />}
      help={pageGuides['impact-story-editor']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="Starting a story from a project will open the new draft in the story editor."
    />
  </>
);

export default StoryFromProjectPage;

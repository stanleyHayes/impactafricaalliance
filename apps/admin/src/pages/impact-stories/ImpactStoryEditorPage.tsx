import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { useParams } from 'react-router-dom';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const ImpactStoryEditorPage = (): JSX.Element => {
  // Creating and editing share one page, told apart by the id in the address.
  const { storyId } = useParams();
  return (
    <>
      <PageHeader
        title={storyId ? 'Edit impact story' : 'New impact story'}
        description="Write the story step by step: basics, classification, blocks, search and sharing."
        icon={<HistoryEduIcon />}
        help={pageGuides['impact-story-editor']}
      />
      <EmptyState
        icon={<ConstructionRoundedIcon />}
        title="This area is being built"
        description="The story editor will appear here."
      />
    </>
  );
};

export default ImpactStoryEditorPage;

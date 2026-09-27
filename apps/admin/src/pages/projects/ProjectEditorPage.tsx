import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { useParams } from 'react-router-dom';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const ProjectEditorPage = (): JSX.Element => {
  // Creating and editing share one page, told apart by the id in the address.
  const { projectId } = useParams();
  return (
    <>
      <PageHeader
        title={projectId ? 'Edit project' : 'New project'}
        description="Set the project out step by step: basics, people, schedule and place, scope, story and cover."
        icon={<AccountTreeIcon />}
        help={pageGuides['project-editor']}
      />
      <EmptyState
        icon={<ConstructionRoundedIcon />}
        title="This area is being built"
        description="The stepwise project form will appear here."
      />
    </>
  );
};

export default ProjectEditorPage;

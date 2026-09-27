import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const ProjectsPage = (): JSX.Element => (
  <>
    <PageHeader
      title="Projects"
      description="Initiatives the team is delivering: who leads them, when they run, and how far along they are."
      icon={<AccountTreeIcon />}
      help={pageGuides['projects']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="Project lists, with All, My and Archived views, will appear here."
    />
  </>
);

export default ProjectsPage;

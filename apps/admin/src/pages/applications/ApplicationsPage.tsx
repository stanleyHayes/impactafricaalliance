import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const ApplicationsPage = (): JSX.Element => (
  <>
    <PageHeader
      title="Applications"
      description="What people have sent through the forms, by status."
      icon={<AssignmentIndIcon />}
      help={pageGuides['applications']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="Submitted applications, by status and form, will appear here."
    />
  </>
);

export default ApplicationsPage;

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
const ApplicationDetailPage = (): JSX.Element => (
  <>
    <PageHeader
      title="Application"
      description="One application: the answers, the files, the reviews and the history."
      icon={<AssignmentIndIcon />}
      help={pageGuides['application-detail']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="The application, its reviews and its history will appear here."
    />
  </>
);

export default ApplicationDetailPage;

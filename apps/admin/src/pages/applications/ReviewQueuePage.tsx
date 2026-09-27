import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import FactCheckIcon from '@mui/icons-material/FactCheck';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const ReviewQueuePage = (): JSX.Element => (
  <>
    <PageHeader
      title="Review queue"
      description="Applications that still need a decision."
      icon={<FactCheckIcon />}
      help={pageGuides['review-queue']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="Applications waiting for review will appear here."
    />
  </>
);

export default ReviewQueuePage;

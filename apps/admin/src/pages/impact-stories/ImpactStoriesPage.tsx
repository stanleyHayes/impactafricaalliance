import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

export interface ImpactStoriesPageProps {
  /**
   * Which tab the address opened: `/impact-stories` is Drafts and
   * `/impact-stories/published` is Published. The route passes it, so the
   * tab is part of the address and survives a reload.
   */
  view?: 'drafts' | 'published';
}

/**
 * Placeholder until the impact stories module lands. The routes, their
 * permission checks and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const ImpactStoriesPage = ({ view = 'drafts' }: ImpactStoriesPageProps): JSX.Element => (
  <>
    <PageHeader
      title="Impact stories"
      description="Long-form accounts of what the work achieved, published on the website's Impact pages."
      icon={<HistoryEduIcon />}
      help={pageGuides['impact-stories']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description={
        view === 'published'
          ? 'Published stories will appear here.'
          : 'Drafts and stories waiting for review will appear here.'
      }
    />
  </>
);

export default ImpactStoriesPage;

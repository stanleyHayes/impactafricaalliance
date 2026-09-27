import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const FormsPage = (): JSX.Element => (
  <>
    <PageHeader
      title="Forms"
      description="Public forms people fill in to apply: speaker calls, volunteering, mentoring, partnerships."
      icon={<DynamicFormIcon />}
      help={pageGuides['forms']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="The list of forms, with their status and application counts, will appear here."
    />
  </>
);

export default FormsPage;

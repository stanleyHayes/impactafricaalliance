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
const FormDetailPage = (): JSX.Element => (
  <>
    <PageHeader
      title="Form"
      description="A form at a glance: its status, schedule, share link and applications."
      icon={<DynamicFormIcon />}
      help={pageGuides['form-detail']}
    />
    <EmptyState
      icon={<ConstructionRoundedIcon />}
      title="This area is being built"
      description="The form summary, with preview and publishing, will appear here."
    />
  </>
);

export default FormDetailPage;

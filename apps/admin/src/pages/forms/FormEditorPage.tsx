import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import { useParams } from 'react-router-dom';

import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * Placeholder until the module that owns this page lands. The route, its
 * permission check and the navigation that leads here are already final;
 * only the body below is replaced.
 */
const FormEditorPage = (): JSX.Element => {
  // Creating and editing share one page, told apart by the id in the address.
  const { formId } = useParams();
  return (
    <>
      <PageHeader
        title={formId ? 'Edit form' : 'New form'}
        description="Build the form step by step: basics, introduction, questions, schedule and confirmation."
        icon={<DynamicFormIcon />}
        help={pageGuides['form-editor']}
      />
      <EmptyState
        icon={<ConstructionRoundedIcon />}
        title="This area is being built"
        description="The form builder will appear here."
      />
    </>
  );
};

export default FormEditorPage;

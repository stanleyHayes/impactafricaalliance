import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

import { EmptyState } from '../../components/EmptyState';

/**
 * The project's Documents tab. Placeholder until the projects module lands; the
 * route and the tab that leads here are already final.
 */
const ProjectDocumentsTab = (): JSX.Element => (
  <EmptyState
    compact
    icon={<ConstructionRoundedIcon />}
    title="This tab is being built"
    description="Reports, budgets and other documents attached to the project will appear here."
  />
);

export default ProjectDocumentsTab;

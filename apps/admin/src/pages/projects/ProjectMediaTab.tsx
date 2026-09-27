import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

import { EmptyState } from '../../components/EmptyState';

/**
 * The project's Media tab. Placeholder until the projects module lands; the
 * route and the tab that leads here are already final.
 */
const ProjectMediaTab = (): JSX.Element => (
  <EmptyState
    compact
    icon={<ConstructionRoundedIcon />}
    title="This tab is being built"
    description="Photos kept as evidence, marked shareable or not, will appear here."
  />
);

export default ProjectMediaTab;

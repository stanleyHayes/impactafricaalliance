import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

import { EmptyState } from '../../components/EmptyState';

/**
 * The project's Overview tab. Placeholder until the projects module lands; the
 * route and the tab that leads here are already final.
 */
const ProjectOverviewTab = (): JSX.Element => (
  <EmptyState
    compact
    icon={<ConstructionRoundedIcon />}
    title="This tab is being built"
    description="The summary, progress, people, objectives, partners and risks will appear here."
  />
);

export default ProjectOverviewTab;

import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

import { EmptyState } from '../../components/EmptyState';

/**
 * The project's Milestones tab. Placeholder until the projects module lands; the
 * route and the tab that leads here are already final.
 */
const ProjectMilestonesTab = (): JSX.Element => (
  <EmptyState
    compact
    icon={<ConstructionRoundedIcon />}
    title="This tab is being built"
    description="Milestones and activities, with their dates and status, will appear here."
  />
);

export default ProjectMilestonesTab;

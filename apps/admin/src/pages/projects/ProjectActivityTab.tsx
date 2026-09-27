import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';

import { EmptyState } from '../../components/EmptyState';

/**
 * The project's Activity tab. Placeholder until the projects module lands; the
 * route and the tab that leads here are already final.
 */
const ProjectActivityTab = (): JSX.Element => (
  <EmptyState
    compact
    icon={<ConstructionRoundedIcon />}
    title="This tab is being built"
    description="Who changed what on this project, and when, will appear here."
  />
);

export default ProjectActivityTab;

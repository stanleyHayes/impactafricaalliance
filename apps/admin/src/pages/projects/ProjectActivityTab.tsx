import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';

import { ActivityTimeline } from '../../components/audit/ActivityTimeline';
import { DetailSection } from '../../components/detail/DetailSection';
import { useProjectOutlet } from '../../components/projects/useProjectOutlet';
import { projectActivity } from '../../lib/projects';
import { projectChangeLabel } from '../../lib/select-options';

/**
 * The project's Activity tab: who changed what, and when, newest first. Read
 * through the project's own endpoint, so it needs no more than
 * `projects:read`.
 */
const ProjectActivityTab = (): JSX.Element => {
  const { project } = useProjectOutlet();
  const { endpoint, queryKey } = projectActivity(project.id);
  return (
    <DetailSection
      title="Activity"
      icon={<HistoryRoundedIcon />}
      description="Every change to the project, its evidence and its status."
    >
      <ActivityTimeline endpoint={endpoint} queryKey={queryKey} formatValue={projectChangeLabel} />
    </DetailSection>
  );
};

export default ProjectActivityTab;

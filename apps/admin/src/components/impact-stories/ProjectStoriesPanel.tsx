import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';
import { EmptyState } from '../EmptyState';

export interface ProjectStoriesPanelProps {
  /** The project whose impact stories to list. */
  projectId: string;
}

/**
 * The impact stories written from one project, shown on the project's Impact
 * tab, with a way to start another.
 *
 * Owned by the impact stories module. Placeholder until that module lands:
 * the list is still to come, but "Create impact story" already leads to the
 * route that copies the project into a new draft. The name and props are the
 * contract the project page relies on.
 */
export const ProjectStoriesPanel = ({ projectId }: ProjectStoriesPanelProps): JSX.Element => {
  const navigate = useNavigate();
  // Starting a story reads the project and creates a story, so it needs both.
  const canCreate = useHasPermission('create', 'impact-stories');
  const canReadProject = useHasPermission('read', 'projects');
  return (
    <Box data-project-id={projectId}>
      <EmptyState
        compact
        icon={<ConstructionRoundedIcon />}
        title="This tab is being built"
        description="Impact stories written from this project will appear here."
        primaryAction={
          canCreate && canReadProject
            ? {
                label: 'Create impact story',
                icon: <AddRoundedIcon />,
                onClick: () =>
                  navigate(`/impact-stories/from-project/${encodeURIComponent(projectId)}`),
              }
            : undefined
        }
      />
    </Box>
  );
};

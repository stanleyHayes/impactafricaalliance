import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import Box from '@mui/material/Box';

import { EmptyState } from '../EmptyState';

export interface ProjectTasksPanelProps {
  /** The project whose tasks to list. */
  projectId: string;
}

/**
 * The tasks linked to one project, shown on the project's Tasks tab.
 *
 * Owned by the tasks module, so a task looks and behaves the same here as on
 * the task pages. Placeholder until that module lands; the name and props are
 * the contract the project page relies on.
 */
export const ProjectTasksPanel = ({ projectId }: ProjectTasksPanelProps): JSX.Element => (
  <Box data-project-id={projectId}>
    <EmptyState
      compact
      icon={<ConstructionRoundedIcon />}
      title="This tab is being built"
      description="Tasks linked to this project, and a way to add one, will appear here."
    />
  </Box>
);

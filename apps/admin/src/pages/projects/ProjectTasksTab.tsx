import { useParams } from 'react-router-dom';

import { ProjectTasksPanel } from '../../components/tasks/ProjectTasksPanel';

/**
 * The project's Tasks tab. The list itself belongs to the tasks module
 * (`ProjectTasksPanel`), so a task looks and behaves the same here as on the
 * task pages.
 */
const ProjectTasksTab = (): JSX.Element => {
  const { projectId = '' } = useParams();
  return <ProjectTasksPanel projectId={projectId} />;
};

export default ProjectTasksTab;

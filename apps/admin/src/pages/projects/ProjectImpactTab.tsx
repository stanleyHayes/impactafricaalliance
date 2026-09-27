import { useParams } from 'react-router-dom';

import { ProjectStoriesPanel } from '../../components/impact-stories/ProjectStoriesPanel';

/**
 * The project's Impact tab. The stories list belongs to the impact stories
 * module (`ProjectStoriesPanel`), which also offers to start a story from
 * this project.
 */
const ProjectImpactTab = (): JSX.Element => {
  const { projectId = '' } = useParams();
  return <ProjectStoriesPanel projectId={projectId} />;
};

export default ProjectImpactTab;

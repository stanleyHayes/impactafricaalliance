import type { ProjectRef } from '@iaa/shared';
import Link from '@mui/material/Link';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';

/**
 * The project a task belongs to, by name. The project is the projects
 * module's, so someone who cannot read projects does not see it at all.
 * `link` makes it open the project, as on the task's own page.
 */
export const TaskProjectName = ({
  project,
  link = false,
  sx,
}: {
  project: ProjectRef | null | undefined;
  link?: boolean;
  sx?: SxProps<Theme>;
}): JSX.Element | null => {
  const canRead = useHasPermission('read', 'projects');
  if (!project || !canRead) return null;
  if (link) {
    return (
      <Link
        component={RouterLink}
        to={`/projects/${project.id}`}
        variant="body2"
        noWrap
        sx={{ maxWidth: '100%' }}
      >
        {project.title}
      </Link>
    );
  }
  return (
    <Typography variant="caption" color="text.secondary" noWrap sx={sx}>
      {project.title}
    </Typography>
  );
};

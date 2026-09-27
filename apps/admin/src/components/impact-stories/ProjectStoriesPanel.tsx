import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';
import { useProjectImpactStories } from '../../lib/impact-stories';
import { EmptyState } from '../EmptyState';

import { updatedLabel } from './story-format';
import { StoryStatusChip } from './StoryStatusChip';

export interface ProjectStoriesPanelProps {
  /** The project whose impact stories to list. */
  projectId: string;
}

const PanelSkeleton = (): JSX.Element => (
  <Stack spacing={1.25} role="status" aria-label="Loading impact stories">
    {[0, 1].map((row) => (
      <Box
        key={row}
        sx={{ display: 'flex', gap: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton width="55%" />
          <Skeleton width="30%" sx={{ fontSize: '0.8rem' }} />
        </Box>
        <Skeleton variant="rounded" width={86} height={24} sx={{ borderRadius: 99 }} />
      </Box>
    ))}
  </Stack>
);

/**
 * The impact stories written from one project, shown on the project's Impact
 * tab, with a way to start another.
 *
 * Every story is listed whatever its status, so the team can see a draft
 * already exists before starting a second. Starting one copies the project
 * into a new draft; completing the project publishes nothing by itself.
 */
export const ProjectStoriesPanel = ({ projectId }: ProjectStoriesPanelProps): JSX.Element => {
  const navigate = useNavigate();
  const canRead = useHasPermission('read', 'impact-stories');
  const canUpdate = useHasPermission('update', 'impact-stories');
  // Starting a story reads the project and creates a story, so it needs both.
  const canCreate = useHasPermission('create', 'impact-stories');
  const canReadProject = useHasPermission('read', 'projects');
  const stories = useProjectImpactStories(projectId, canRead);
  const startStory = (): void => {
    void navigate(`/impact-stories/from-project/${encodeURIComponent(projectId)}`);
  };
  const mayStart = canCreate && canReadProject;
  const items = stories.data?.items ?? [];

  const body = (): JSX.Element => {
    if (!canRead) {
      return (
        <Alert severity="info">
          You need access to impact stories to see the stories written from this project. An
          administrator can grant it under Users.
        </Alert>
      );
    }
    if (stories.isPending) return <PanelSkeleton />;
    if (stories.isError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void stories.refetch()}>
              Retry
            </Button>
          }
        >
          The stories for this project could not be loaded.
        </Alert>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          compact
          icon={<AutoStoriesOutlinedIcon />}
          title="No impact stories yet"
          description="Stories written from this project appear here, in any status. Starting one copies the summary, numbers, partners and shareable photos into a new draft."
          primaryAction={
            mayStart
              ? { label: 'Create impact story', icon: <AddRoundedIcon />, onClick: startStory }
              : undefined
          }
        />
      );
    }
    return (
      <Stack component="ul" spacing={1.25} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {items.map((story) => (
          <Box
            component="li"
            key={story.id}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.5,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
              {canUpdate ? (
                <Link
                  component={RouterLink}
                  to={`/impact-stories/${story.id}/edit`}
                  sx={{ fontWeight: 700 }}
                >
                  {story.title}
                </Link>
              ) : (
                <Typography sx={{ fontWeight: 700 }}>{story.title}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {updatedLabel(story.updatedAt)}
              </Typography>
            </Box>
            <StoryStatusChip status={story.status} />
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <Stack spacing={2} data-project-id={projectId}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Box>
          <Typography component="h2" variant="h6">
            Impact stories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Public accounts of what this project achieved.
          </Typography>
        </Box>
        {mayStart && items.length > 0 && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={startStory}>
            Create impact story
          </Button>
        )}
      </Stack>
      {body()}
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ color: 'text.secondary' }}>
        <InfoOutlinedIcon fontSize="small" sx={{ mt: 0.25 }} aria-hidden />
        <Typography variant="body2">
          Completing a project never publishes anything by itself. A story reaches the website only
          when an administrator publishes it, and later changes to the project never change a story.
        </Typography>
      </Stack>
    </Stack>
  );
};

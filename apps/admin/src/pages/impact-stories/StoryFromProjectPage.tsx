import type { ImpactStory } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { REVIEW_STEP } from '../../components/impact-stories/story-form';
import { storyErrorText } from '../../components/impact-stories/useStoryStatusFlow';
import { PageHeader } from '../../components/PageHeader';
import { FormPageSkeleton } from '../../components/PageSkeleton';
import { IMPACT_STORIES_QUERY_KEY, useCreateStoryFromProject } from '../../lib/impact-stories';
import { pageGuides } from '../../lib/page-guides';
import { backLinkSx } from '../../theme/surfaces';

/**
 * Starts an impact story from a project (`/impact-stories/from-project/:projectId`):
 * creates a draft copied from the project, then opens it in the editor in
 * place of this page, so Back returns to the project rather than here.
 */
const StoryFromProjectPage = (): JSX.Element => {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { mutateAsync } = useCreateStoryFromProject();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ story?: ImpactStory; error?: Error }>({});
  // The attempt already sent. React runs effects twice in development, and
  // each attempt must create exactly one draft.
  const sent = useRef<number | null>(null);

  useEffect(() => {
    if (sent.current === attempt) return;
    sent.current = attempt;
    setOutcome({});
    // The promise rather than the hook's state: a mutation started while the
    // page first mounts loses its observer in React's development double-mount.
    mutateAsync(projectId).then(
      (story) => setOutcome({ story }),
      (error: Error) => setOutcome({ error }),
    );
  }, [attempt, mutateAsync, projectId]);

  const created = outcome.story;
  useEffect(() => {
    if (!created) return;
    client.setQueryData([...IMPACT_STORIES_QUERY_KEY, 'detail', created.id], created);
    void navigate(`/impact-stories/${created.id}/edit`, {
      replace: true,
      state: {
        step: REVIEW_STEP,
        notice:
          'Draft created from the project. Nothing is public until an administrator publishes it.',
      },
    });
  }, [client, created, navigate]);

  const backToProject = `/projects/${encodeURIComponent(projectId)}`;

  return (
    <>
      <PageHeader
        title="New impact story"
        description="A draft copied from the project: its summary, numbers, partners and shareable photos."
        icon={<HistoryEduIcon />}
        help={pageGuides['impact-story-editor']}
      />
      {outcome.error ? (
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => setAttempt((count) => count + 1)}>
                Retry
              </Button>
            }
          >
            The draft could not be created. {storyErrorText(outcome.error)}
          </Alert>
          <Button
            component={RouterLink}
            to={backToProject}
            startIcon={<ArrowBackRoundedIcon />}
            sx={[{ alignSelf: 'flex-start' }, backLinkSx]}
          >
            Back to the project
          </Button>
        </Stack>
      ) : (
        <Box role="status" aria-live="polite">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Copying the project into a new draft…
          </Typography>
          <FormPageSkeleton steps fields={4} />
        </Box>
      )}
    </>
  );
};

export default StoryFromProjectPage;

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { StorySchema } from '../components/StorySchema';
import { useImpactStory } from '../features/impact-stories/api';
import { storySeo } from '../features/impact-stories/story-utils';
import { StoryArticle } from '../features/impact-stories/StoryArticle';
import { ApiError } from '../lib/api-client';

/** The shape of the page while the story loads: the opening, then a column of text. */
export const StorySkeleton = (): JSX.Element => (
  <Box role="status" aria-label="Loading the story">
    <Box sx={{ bgcolor: 'primary.dark', py: { xs: 10, md: 14 } }}>
      <Container>
        <Skeleton width={140} sx={{ bgcolor: 'rgba(14,42,34,0.16)' }} />
        <Skeleton width="78%" height={82} sx={{ mt: 4, bgcolor: 'rgba(14,42,34,0.16)' }} />
        <Skeleton width="54%" height={34} sx={{ bgcolor: 'rgba(14,42,34,0.12)' }} />
      </Container>
    </Box>
    <Container sx={{ py: 8 }}>
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        <Skeleton height={24} />
        <Skeleton height={24} />
        <Skeleton height={24} width="86%" />
        <Skeleton variant="rounded" height={320} sx={{ mt: 5, borderRadius: 4 }} />
      </Box>
    </Container>
  </Box>
);

/** Shown for an unknown, unpublished or withdrawn story. Kept out of search results. */
export const StoryUnavailable = ({
  title,
  message,
  action = true,
}: {
  title: string;
  message: string;
  action?: boolean;
}): JSX.Element => (
  <Container sx={{ py: { xs: 10, md: 16 }, textAlign: 'center' }}>
    <Seo title={title} noindex />
    <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
      Impact stories
    </Typography>
    <Typography component="h1" variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.8rem' } }}>
      {title}
    </Typography>
    <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 560, mx: 'auto' }}>
      {message}
    </Typography>
    {action && (
      <Button
        component={RouterLink}
        to="/impact/stories"
        variant="contained"
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ mt: 4 }}
      >
        See all impact stories
      </Button>
    )}
  </Container>
);

/**
 * Whether the API said the story is not there: a 404, or a 400 for an
 * address that could never be a story (such as one with capital letters).
 * Anything else is a failure worth retrying.
 */
const isMissing = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 404 || error.status === 400);

/** One published impact story (`/impact/stories/:slug`). */
const ImpactStory = (): JSX.Element => {
  const { slug = '' } = useParams();
  const { data: story, isPending, isError, error, refetch } = useImpactStory(slug);

  if (isPending) return <StorySkeleton />;
  if (isError && !isMissing(error)) {
    return (
      <>
        <StoryUnavailable
          title="This story could not be loaded"
          message="Something went wrong on our side. Please try again in a moment."
          action={false}
        />
        <Box sx={{ textAlign: 'center', mt: -10, pb: 12 }}>
          <Button variant="outlined" onClick={() => void refetch()}>
            Try again
          </Button>
        </Box>
      </>
    );
  }
  if (!story) {
    return (
      <StoryUnavailable
        title="Story not found"
        message="This story may have moved, or it is not published yet."
      />
    );
  }

  const seo = storySeo(story);
  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        image={seo.image}
        imageAlt={seo.imageAlt}
        type="article"
      />
      <StorySchema story={story} />
      <StoryArticle story={story} />
    </>
  );
};

export default ImpactStory;

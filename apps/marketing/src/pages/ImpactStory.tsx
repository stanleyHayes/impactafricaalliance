import { brandColors } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { StorySchema } from '../components/StorySchema';
import { useImpactStory } from '../features/impact-stories/api';
import { LEAD_HERO_MIN_HEIGHT } from '../features/impact-stories/blocks';
import { storySeo } from '../features/impact-stories/story-utils';
import { StoryArticle } from '../features/impact-stories/StoryArticle';
import { ApiError } from '../lib/api-client';

// Placeholders drawn on the dark opening, where the default grey would not show.
const ON_DARK = 'rgba(255,255,255,0.12)';
const ON_DARK_FAINT = 'rgba(255,255,255,0.08)';

/**
 * The shape of the page while the story loads: the dark opening at its full
 * height with the back link and heading at its foot, the date and programme
 * line, then a column of text. The same skeleton serves the staff preview.
 */
export const StorySkeleton = (): JSX.Element => (
  <Box role="status" aria-label="Loading the story">
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        minHeight: LEAD_HERO_MIN_HEIGHT,
        bgcolor: brandColors.deepForest,
      }}
    >
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <Skeleton width={150} sx={{ mb: { xs: 4, md: 6 }, bgcolor: ON_DARK }} />
        <Box sx={{ maxWidth: 900 }}>
          <Skeleton
            width="82%"
            sx={{ fontSize: { xs: '2.4rem', sm: '3.1rem', md: '4rem' }, bgcolor: ON_DARK }}
          />
          <Skeleton
            width="48%"
            sx={{ fontSize: { xs: '2.4rem', sm: '3.1rem', md: '4rem' }, bgcolor: ON_DARK }}
          />
          <Skeleton
            width="64%"
            sx={{ mt: 2.5, fontSize: { xs: '1.05rem', md: '1.2rem' }, bgcolor: ON_DARK_FAINT }}
          />
        </Box>
      </Container>
    </Box>
    <Container>
      <Stack
        direction="row"
        alignItems="center"
        gap={1.25}
        sx={{ py: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Skeleton width={120} sx={{ mr: 1 }} />
        <Skeleton variant="rounded" width={120} height={24} sx={{ borderRadius: 99 }} />
        <Skeleton variant="rounded" width={72} height={24} sx={{ borderRadius: 99 }} />
      </Stack>
    </Container>
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

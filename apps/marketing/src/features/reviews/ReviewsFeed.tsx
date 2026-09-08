import type { Paginated, PublicReview } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';

import { useOrganisationReviews } from '../../lib/content-hooks';

import { previewReviews } from './review-preview';
import { ReviewList } from './ReviewList';
import { ReviewsEmptyState } from './ReviewsEmptyState';

const feedData = (data: Paginated<PublicReview> | undefined, preview: boolean) => {
  if (preview) return { items: previewReviews, totalPages: 1, total: previewReviews.length };
  return data ?? { items: [], totalPages: 0, total: 0 };
};

export const ReviewsFeed = ({ preview = false }: { preview?: boolean }): JSX.Element => {
  const [page, setPage] = useState(1);
  const heading = useRef<HTMLHeadingElement>(null);
  const { data, isLoading, isError, refetch } = useOrganisationReviews(page);
  const { items, totalPages: pages, total } = feedData(data, preview);
  const loading = !preview && isLoading;
  const failed = !preview && isError;
  const changePage = (next: number): void => {
    setPage(next);
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  if (failed)
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      >
        Reviews could not be loaded. Please try again.
      </Alert>
    );
  if (!loading && total === 0) return <ReviewsEmptyState />;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
        <Typography
          component="h2"
          ref={heading}
          tabIndex={-1}
          sx={{ fontWeight: 700, fontSize: '1.1rem', scrollMarginTop: 130 }}
        >
          Community voices
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          {total} published {total === 1 ? 'review' : 'reviews'}
        </Typography>
      </Stack>
      {loading ? <Skeleton variant="rounded" height={360} /> : <ReviewList reviews={items} />}
      {page > Math.max(pages, 1) && (
        <Button onClick={() => changePage(pages)}>Return to the last page</Button>
      )}
      {pages > 1 && (
        <Stack spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
          <Pagination
            count={pages}
            page={page}
            onChange={(_event, next) => changePage(next)}
            color="primary"
            size="small"
            siblingCount={0}
          />
          <Typography aria-live="polite" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            Page {page} of {pages} · Up to 10 reviews per page
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

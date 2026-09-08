import type { AdminReview, ReviewStatus } from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useModerateReview, useReviews } from '../lib/admin-hooks';
import { formatUtcShort } from '../lib/date';

const STATUS_TABS: { value: ReviewStatus; label: string }[] = [
  { value: 'pending', label: 'Waiting' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

const Stars = ({ rating }: { rating: number }): JSX.Element => (
  <Stack direction="row" spacing={0.25} aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <StarRoundedIcon
        key={star}
        sx={{ fontSize: 20, color: star <= rating ? 'secondary.main' : 'action.disabled' }}
      />
    ))}
  </Stack>
);

const ReviewCard = ({
  review,
  onPublish,
  onReject,
  busy,
}: {
  review: AdminReview;
  onPublish: (review: AdminReview) => void;
  onReject: (review: AdminReview) => void;
  busy: boolean;
}): JSX.Element => (
  <Card variant="outlined" sx={{ borderRadius: 2.5, p: 2.5 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1.5}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Stars rating={review.rating} />
        <Chip
          size="small"
          icon={review.subject === 'event' ? <EventRoundedIcon /> : <RateReviewRoundedIcon />}
          label={review.subject === 'event' ? (review.eventTitle ?? 'Event') : 'Organisation'}
          sx={{ maxWidth: 260 }}
        />
        {review.attended && (
          <Chip size="small" color="success" variant="outlined" label="Attended" />
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
        {formatUtcShort(review.createdAt)}
      </Typography>
    </Stack>

    {review.comment && (
      <Typography sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{review.comment}</Typography>
    )}

    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, flexWrap: 'wrap' }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {review.displayName}
      </Typography>
      {review.role && (
        <Typography variant="body2" color="text.secondary">
          · {review.role}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        · {review.email}
      </Typography>
    </Stack>

    {review.rejectionReason && (
      <Alert severity="info" sx={{ mt: 1.5 }}>
        Rejected: {review.rejectionReason}
      </Alert>
    )}

    {review.status === 'pending' && (
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<CheckCircleRoundedIcon />}
          disabled={busy}
          onClick={() => onPublish(review)}
        >
          Publish
        </Button>
        <Button size="small" color="inherit" disabled={busy} onClick={() => onReject(review)}>
          Reject
        </Button>
      </Stack>
    )}
  </Card>
);

const ReviewsSkeleton = (): JSX.Element => (
  <Stack spacing={2}>
    {Array.from({ length: 4 }, (_, index) => (
      <Skeleton key={index} variant="rounded" height={168} sx={{ borderRadius: 2.5 }} />
    ))}
  </Stack>
);

const Reviews = (): JSX.Element => {
  const [status, setStatus] = useState<ReviewStatus>('pending');
  const { data, isLoading, isError } = useReviews({ status });
  const moderate = useModerateReview();
  const [rejecting, setRejecting] = useState<AdminReview | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const decide = (
    id: string,
    decision: 'published' | 'rejected',
    rejectionReason?: string,
  ): void => {
    moderate.mutate(
      { id, status: decision, ...(rejectionReason ? { rejectionReason } : {}) },
      {
        onSuccess: () => {
          setNotice(decision === 'published' ? 'Review published.' : 'Review rejected.');
          setRejecting(null);
          setReason('');
        },
        onError: (error) => setNotice(error.message),
      },
    );
  };

  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        icon={<RateReviewRoundedIcon />}
        title="Reviews"
        description="Ratings and comments from attendees and partners. Nothing appears on the site until it is published here."
        action={
          <ToggleButtonGroup
            value={status}
            exclusive
            size="small"
            onChange={(_event, next: ReviewStatus | null) => next && setStatus(next)}
            aria-label="Review status"
          >
            {STATUS_TABS.map((tab) => (
              <ToggleButton key={tab.value} value={tab.value}>
                {tab.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />

      {isLoading && !data && <ReviewsSkeleton />}

      {isError && (
        <Alert severity="error">Reviews could not be loaded. Please try again.</Alert>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={<RateReviewRoundedIcon />}
          title={status === 'pending' ? 'Nothing waiting' : `No ${status} reviews`}
          description={
            status === 'pending'
              ? 'Reviews appear here once an attendee rates an event or someone reviews the organisation.'
              : 'Nothing has reached this state yet.'
          }
        />
      )}

      {items.length > 0 && (
        <Stack spacing={2}>
          {items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              busy={moderate.isPending}
              onPublish={(target) => decide(target.id, 'published')}
              onReject={(target) => setRejecting(target)}
            />
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject this review</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The reason is for the team, not the author. It explains the decision to whoever reads
            this next.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Why (optional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={moderate.isPending}
            onClick={() => rejecting && decide(rejecting.id, 'rejected', reason.trim() || undefined)}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice !== ''}
        autoHideDuration={4000}
        onClose={() => setNotice('')}
        message={notice}
      />
      <Box sx={{ height: 8 }} />
    </>
  );
};

export default Reviews;

import type { RatingSummary } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiPost } from '../../lib/api-client';
import { useEventReviews } from '../../lib/content-hooks';

import { RatingHeadline } from './RatingStars';
import { ReviewList } from './ReviewList';

/**
 * The form only appears for someone holding a review link.
 *
 * The token arrives as ?review= in the follow-up email sent after the event.
 * Without it the section is a read-only summary — which is the right thing for
 * everyone else looking at a past event.
 */
const ReviewForm = ({ token, onDone }: { token: string; onDone: () => void }): JSX.Element => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    if (rating === null) {
      setError('Choose a rating first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiPost('/reviews/events', {
        token,
        rating,
        comment: comment.trim() || undefined,
        displayName: displayName.trim(),
      });
      onDone();
    } catch (cause) {
      setError((cause as Error).message || 'That could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      sx={{ p: { xs: 2.5, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3 }}
    >
      <Typography sx={{ fontWeight: 700 }}>How was it?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your rating helps other people decide whether the next one is for them.
      </Typography>

      <Rating
        value={rating}
        onChange={(_event, next) => setRating(next)}
        size="large"
        sx={{ mb: 2 }}
      />

      <Stack spacing={2}>
        <TextField
          label="Name to show"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
          fullWidth
          helperText="However you would like to be credited."
        />
        <TextField
          label="Anything you want to add (optional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
      </Stack>

      {error !== '' && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Button type="submit" variant="contained" disabled={busy} sx={{ mt: 2, fontWeight: 700 }}>
        {busy ? 'Sending…' : 'Submit review'}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Reviews are read before they are published.
      </Typography>
    </Box>
  );
};

const summaryOf = (data: { summary?: RatingSummary } | undefined): RatingSummary =>
  data?.summary ?? { count: 0, distribution: [0, 0, 0, 0, 0] };

export const EventReviewSection = ({ eventId }: { eventId: string }): JSX.Element | null => {
  const [params, setParams] = useSearchParams();
  const token = params.get('review');
  const { data, isLoading } = useEventReviews(eventId);
  const [submitted, setSubmitted] = useState(false);

  const reviews = data?.items ?? [];
  const summary = summaryOf(data);

  if (isLoading) {
    return <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mt: 4 }} />;
  }
  // Nothing to show and nothing to ask: stay out of the way.
  if (!token && reviews.length === 0 && summary.count === 0) return null;

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        What people said
      </Typography>
      <RatingHeadline summary={summary} />

      {token && !submitted && (
        <Box sx={{ mt: 3 }}>
          <ReviewForm
            token={token}
            onDone={() => {
              setSubmitted(true);
              // Spend the link once used, so a refresh does not re-open the form.
              params.delete('review');
              setParams(params, { replace: true });
            }}
          />
        </Box>
      )}

      {submitted && (
        <Alert severity="success" sx={{ mt: 3 }}>
          Thank you — your review has been sent for review and will appear once it is published.
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <ReviewList reviews={reviews} />
      </Box>
    </Box>
  );
};

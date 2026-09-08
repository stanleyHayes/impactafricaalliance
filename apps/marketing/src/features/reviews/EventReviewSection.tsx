import { eventReviewInputSchema, type PublicReview, type RatingSummary } from '@iaa/shared';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiPost } from '../../lib/api-client';
import { useEventReviews } from '../../lib/content-hooks';

import { EventReviewsEmptyState } from './EventReviewsEmptyState';
import { previewReviews, previewSummary } from './review-preview';
import { ReviewList } from './ReviewList';
import { ReviewsSummary } from './ReviewsSummary';

/**
 * The form only appears for someone holding a review link.
 *
 * The token arrives as ?review= in the follow-up email sent after the event.
 * Without it the section is a read-only summary — which is the right thing for
 * everyone else looking at a past event.
 */
export const EventReviewForm = ({
  token,
  onDone,
  preview = false,
}: {
  token: string;
  onDone: () => void;
  preview?: boolean;
}): JSX.Element => {
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    if (busy) return;
    if (rating === null) {
      setError('Choose a rating first.');
      return;
    }
    if (step === 0) {
      setStep(1);
      setError('');
      return;
    }
    const parsed = eventReviewInputSchema.safeParse({
      token,
      rating,
      comment,
      displayName: displayName.trim(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check your details.');
      return;
    }
    if (preview) {
      onDone();
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
      aria-label="Review this event"
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      sx={{
        p: { xs: 2.5, md: 3 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Typography component="h3" sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
        How was the event?
      </Typography>
      <Typography aria-live="polite" variant="overline" color="text.secondary">
        Step {step + 1} of 2 · {step === 0 ? 'Your experience' : 'About you'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your rating helps other people decide whether the next one is for them.
      </Typography>

      {step === 0 && (
        <>
          <Rating
            disabled={busy}
            name="event-rating"
            value={rating}
            onChange={(_event, next) => setRating(next)}
            size="large"
            sx={{ mb: 2 }}
          />

          <TextField
            label="Anything you want to add (optional)"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            multiline
            minRows={3}
            disabled={busy}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            helperText={`${comment.length} / 2,000 characters`}
            fullWidth
          />
        </>
      )}
      {step === 1 && (
        <Stack spacing={2}>
          <TextField
            label="Name to show"
            disabled={busy}
            slotProps={{ htmlInput: { minLength: 2, maxLength: 80 } }}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            fullWidth
            helperText="However you would like to be credited."
          />
        </Stack>
      )}

      {error !== '' && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {step === 1 && (
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            setStep(0);
            setError('');
          }}
          sx={{ mt: 2, mr: 1 }}
        >
          Back
        </Button>
      )}
      <Button type="submit" variant="contained" disabled={busy} sx={{ mt: 2, fontWeight: 700 }}>
        {busy ? 'Sending…' : ['Continue', 'Submit review'][step]}
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Reviews are read before they are published.
      </Typography>
    </Box>
  );
};

/**
 * When the event becomes reviewable: once it has finished, or once it has
 * started for one with no end time. Mirrors the rule the API enforces, so the
 * form is never offered for a submission that would be refused.
 */
export const hasTakenPlace = (
  event: { startAt: string; endAt?: string },
  now = new Date(),
): boolean => now >= new Date(event.endAt ?? event.startAt);

export const EventReviewSection = ({
  event,
}: {
  event: { id: string; startAt: string; endAt?: string };
}): JSX.Element => {
  const eventId = event.id;
  // An event still to come cannot be reviewed, so the form is not offered
  // for a submission the API would refuse.
  const reviewable = hasTakenPlace(event);
  const [params, setParams] = useSearchParams();
  const preview = import.meta.env.DEV && params.get('preview') === 'event-reviews';
  const token = params.get('review');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useEventReviews(eventId, page);
  const [submitted, setSubmitted] = useState(false);
  const content = preview
    ? {
        items: previewReviews.map((review) => ({
          ...review,
          subject: 'event' as const,
          eventId,
          attended: true,
        })),
        summary: previewSummary,
        totalPages: 1,
      }
    : data;

  return (
    <Box
      component="section"
      id="event-reviews"
      aria-labelledby="event-reviews-title"
      sx={{ mt: { xs: 5, md: 8 }, scrollMarginTop: 130 }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ fontSize: '0.7rem', letterSpacing: '0.14em', fontWeight: 700 }}
      >
        From the community
      </Typography>
      <Typography
        id="event-reviews-title"
        component="h2"
        variant="h4"
        sx={{
          mt: 0.75,
          mb: { xs: 3, md: 4 },
          fontSize: { xs: '1.8rem', md: '2.5rem' },
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
        }}
      >
        Event reviews & comments
      </Typography>
      {preview && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Design preview — fictional attendee reviews. Submissions are simulated and never sent.
        </Alert>
      )}
      <EventReviewContent
        loading={isLoading && !preview}
        failed={isError && !preview}
        content={content}
        retry={() => void refetch()}
      />
      <EventReviewPagination pages={content?.totalPages ?? 0} page={page} onChange={setPage} />
      <Box sx={{ mt: 3, maxWidth: token || preview ? 600 : 'none' }}>
        <EventReviewEntry
          key={`${eventId}-${token}-${preview}`}
          token={reviewable ? token : null}
          preview={preview}
          submitted={submitted}
          reviewable={reviewable}
          onDone={() => {
            setSubmitted(true);
            const next = new URLSearchParams(params);
            next.delete('review');
            setParams(next, { replace: true });
          }}
        />
      </Box>
    </Box>
  );
};

const EventReviewPagination = ({
  pages,
  page,
  onChange,
}: {
  pages: number;
  page: number;
  onChange: (page: number) => void;
}): JSX.Element | null =>
  pages > 1 ? (
    <Pagination
      sx={{ mt: 3 }}
      count={pages}
      page={page}
      onChange={(_event, next) => onChange(next)}
    />
  ) : null;

const EventReviewContent = ({
  loading,
  failed,
  content,
  retry,
}: {
  loading: boolean;
  failed: boolean;
  retry: () => void;
  content: { items: PublicReview[]; summary: RatingSummary } | undefined;
}): JSX.Element => {
  if (loading) return <Skeleton variant="rounded" height={260} />;
  if (failed)
    return (
      <Alert severity="error" action={<Button onClick={retry}>Retry</Button>}>
        Event reviews could not be loaded.
      </Alert>
    );
  if (!content?.items.length) return <EventReviewsEmptyState />;
  return (
    <Stack spacing={3}>
      <ReviewsSummary summary={content.summary} />
      <ReviewList reviews={content.items} />
    </Stack>
  );
};

const EventReviewEntry = ({
  token,
  preview,
  submitted,
  reviewable,
  onDone,
}: {
  token: string | null;
  preview: boolean;
  submitted: boolean;
  reviewable: boolean;
  onDone: () => void;
}): JSX.Element => {
  if (submitted)
    return (
      <Alert severity="success">
        {preview
          ? 'Demo complete — nothing was sent.'
          : 'Thank you — your review and comment will appear after moderation.'}
      </Alert>
    );
  if (token || preview)
    return (
      <EventReviewForm
        token={token || 'preview-event-review-token'}
        preview={preview}
        onDone={onDone}
      />
    );
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', px: { xs: 0.5, md: 1 } }}>
      <MailOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 21, mt: 0.25 }} />
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {reviewable
            ? 'Attended this event? Your voice belongs here.'
            : 'Joining us? Share your experience after the event.'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: '0.825rem', maxWidth: 720 }}>
          Use the personal review link in your follow-up email to share a rating and comment.
          Reviews are read before publication.
        </Typography>
      </Box>
    </Stack>
  );
};

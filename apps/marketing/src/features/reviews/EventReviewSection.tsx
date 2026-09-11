import { eventReviewInputSchema, type PublicReview, type RatingSummary } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiPost } from '../../lib/api-client';
import { useEventReviews } from '../../lib/content-hooks';

import { EventReviewsEmptyState } from './EventReviewsEmptyState';
import { previewReviews, previewSummary } from './review-preview';
import { ReviewLinkRequest } from './ReviewLinkRequest';
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
  const ratingLabels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

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
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 5,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          pb: { xs: 2.5, sm: 3 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontSize: '0.65rem', letterSpacing: '0.16em', fontWeight: 700 }}
        >
          Your voice matters
        </Typography>
        <Typography
          component="h3"
          sx={{
            mt: 1,
            fontWeight: 700,
            fontSize: { xs: '1.7rem', sm: '2rem' },
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
          }}
        >
          {step === 0 ? 'How was the event?' : 'Make it yours.'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: '0.875rem', maxWidth: 440 }}>
          {step === 0
            ? 'Share what stayed with you. Your experience helps others find their next event.'
            : 'Choose the name that will appear alongside your review.'}
        </Typography>
        <Box
          component="ol"
          aria-label="Review progress"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            listStyle: 'none',
            p: 0,
            m: 0,
            mt: 3,
          }}
        >
          {['Your experience', 'About you'].map((label, index) => (
            <Box
              component="li"
              key={label}
              aria-current={step === index ? 'step' : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flex: 1,
                color: step >= index ? 'text.primary' : 'text.secondary',
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  borderRadius: '50%',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  bgcolor: step >= index ? 'primary.main' : 'action.hover',
                  color: step >= index ? 'primary.contrastText' : 'text.secondary',
                }}
              >
                {step > index ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : index + 1}
              </Box>
              <Typography
                component="span"
                sx={{ fontSize: '0.75rem', fontWeight: step === index ? 700 : 500 }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        {step === 0 ? (
          <Stack spacing={3}>
            <Box
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                border: 1,
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.16),
              }}
            >
              <Typography
                id="event-rating-label"
                sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 1.5 }}
              >
                Your overall rating
              </Typography>
              <Rating
                disabled={busy}
                name="event-rating"
                aria-labelledby="event-rating-label"
                value={rating}
                onChange={(_event, next) => {
                  setRating(next);
                  setError('');
                }}
                size="large"
                sx={{
                  color: (theme) => (theme.palette.mode === 'dark' ? '#E9BA49' : '#856100'),
                  gap: { xs: 0, sm: 0.75 },
                  '& .MuiRating-icon': { p: 0.75, fontSize: 32 },
                  '& .MuiRating-iconEmpty': { color: 'text.secondary' },
                  '& .MuiRating-label': { borderRadius: 2 },
                  '& .MuiRating-label:has(input:focus-visible)': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              />
              <Typography
                aria-live="polite"
                sx={{
                  mt: 1,
                  fontSize: '0.8rem',
                  color: rating ? 'text.primary' : 'text.secondary',
                  fontWeight: rating ? 600 : 400,
                }}
              >
                {rating
                  ? `${rating} out of 5 · ${ratingLabels[rating - 1]}`
                  : 'Select a star to rate your experience'}
              </Typography>
            </Box>
            <TextField
              label="Anything you want to add (optional)"
              placeholder="A highlight, a takeaway, or something we could do better…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              multiline
              minRows={4}
              disabled={busy}
              slotProps={{ htmlInput: { maxLength: 2000 }, inputLabel: { shrink: true } }}
              helperText={`${comment.length} / 2,000 characters`}
              fullWidth
              sx={{
                '& .MuiInputBase-root': { fontSize: '0.9rem', lineHeight: 1.7 },
                '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                '& .MuiFormHelperText-root': { textAlign: 'right', fontSize: '0.7rem', mt: 1 },
              }}
            />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 1 }}>
                Your review
              </Typography>
              <Rating
                readOnly
                value={rating}
                size="small"
                sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#E9BA49' : '#856100') }}
              />
              <Typography
                sx={{
                  mt: 1,
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  color: 'text.secondary',
                }}
              >
                {comment.trim() || 'You’re sharing a rating without a comment.'}
              </Typography>
            </Box>
            <TextField
              label="Name to show"
              placeholder="Your name"
              disabled={busy}
              slotProps={{
                htmlInput: { minLength: 2, maxLength: 80 },
                inputLabel: { shrink: true },
              }}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              fullWidth
              helperText="This name will be visible with your published review."
            />
          </Stack>
        )}
        {error !== '' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}
        >
          {step === 1 ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep(0);
                setError('');
              }}
              sx={{ color: 'text.primary' }}
            >
              Back
            </Button>
          ) : (
            <Typography color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Step 1 of 2
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            endIcon={step === 0 ? <ArrowForwardRoundedIcon /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            {busy ? 'Sending…' : ['Continue', 'Submit review'][step]}
          </Button>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2.5, fontSize: '0.7rem', textAlign: 'center' }}
        >
          Reviews are read before they are published.
        </Typography>
      </Box>
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
          eventId={eventId}
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
  eventId,
  token,
  preview,
  submitted,
  reviewable,
  onDone,
}: {
  eventId: string;
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
  // Once it is over there is something to say, so the page offers a way to say
  // it rather than pointing at an email the reader may no longer have.
  if (reviewable) return <ReviewLinkRequest eventId={eventId} />;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', px: { xs: 0.5, md: 1 } }}>
      <MailOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 21, mt: 0.25 }} />
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
          Joining us? Share your experience after the event.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: '0.825rem', maxWidth: 720 }}>
          We will email everyone who registered once it has finished, with a personal link to leave
          a rating and comment. Reviews are read before publication.
        </Typography>
      </Box>
    </Stack>
  );
};

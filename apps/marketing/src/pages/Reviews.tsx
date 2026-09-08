import { brandColors } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { RatingHeadline } from '../features/reviews/RatingStars';
import { ReviewList } from '../features/reviews/ReviewList';
import { apiPost } from '../lib/api-client';
import { useOrganisationRating, useOrganisationReviews, usePageCopy } from '../lib/content-hooks';

/**
 * Confirms an address when someone arrives from the link in their email.
 *
 * Runs once on mount, then reports either way — a confirmation that silently
 * does nothing is worse than one that says it has already been used.
 */
const Confirmation = ({ token }: { token: string }): JSX.Element => {
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    void apiPost('/reviews/confirm', { token })
      .then(() => !cancelled && setState('done'))
      .catch((error: Error) => {
        if (cancelled) return;
        setMessage(error.message);
        setState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'working') return <Skeleton variant="rounded" height={64} sx={{ mb: 3 }} />;
  return state === 'done' ? (
    <Alert severity="success" sx={{ mb: 3 }}>
      Thank you — your review is confirmed and will appear once it has been read.
    </Alert>
  ) : (
    <Alert severity="info" sx={{ mb: 3 }}>
      {message || 'This confirmation link has already been used.'}
    </Alert>
  );
};

const ReviewForm = (): JSX.Element => {
  const [rating, setRating] = useState<number | null>(null);
  const [form, setForm] = useState({ displayName: '', email: '', role: '', comment: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const submit = async (): Promise<void> => {
    if (rating === null) {
      setError('Choose a rating first.');
      return;
    }
    setState('busy');
    setError('');
    try {
      await apiPost('/reviews/organisation', {
        rating,
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        role: form.role.trim() || undefined,
        comment: form.comment.trim() || undefined,
        consent: true,
      });
      setState('sent');
    } catch (cause) {
      setError((cause as Error).message || 'That could not be sent.');
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <Alert severity="success">
        Check your email — we have sent a link to confirm it is you. Nothing is published until you
        click it, and until someone here has read it.
      </Alert>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      sx={{ p: { xs: 2.5, md: 3.5 }, border: 1, borderColor: 'divider', borderRadius: 4 }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Leave a review
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Worked with us, joined a programme, or partnered on something? Tell people how it went.
      </Typography>

      <Rating
        value={rating}
        onChange={(_event, next) => setRating(next)}
        size="large"
        sx={{ mb: 2 }}
      />

      <Stack spacing={2}>
        <TextField label="Name to show" value={form.displayName} onChange={set('displayName')} required fullWidth />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          required
          fullWidth
          helperText="Only used to confirm this is you. It is never shown."
        />
        <TextField
          label="How you know us (optional)"
          value={form.role}
          onChange={set('role')}
          fullWidth
          placeholder="Partner · Cohort 3 · Volunteer"
        />
        <TextField
          label="Your review"
          value={form.comment}
          onChange={set('comment')}
          multiline
          minRows={4}
          fullWidth
        />
      </Stack>

      {error !== '' && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={state === 'busy'}
        sx={{ mt: 2.5, fontWeight: 700 }}
      >
        {state === 'busy' ? 'Sending…' : 'Submit review'}
      </Button>
    </Box>
  );
};

const Reviews = (): JSX.Element => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const copy = usePageCopy('reviews', {
    seoTitle: 'Reviews',
    seoDescription:
      'What partners, participants and attendees say about working with Impact Africa Alliance.',
    heroEyebrow: 'Reviews',
    heroTitle: 'In their words.',
    heroSubtitle:
      'What partners, participants and attendees say about working with us — published as written, once read.',
  });
  const { data, isLoading } = useOrganisationReviews();
  const { data: summary } = useOrganisationRating();

  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <PageHero
        eyebrow={copy.heroEyebrow}
        title={copy.heroTitle}
        subtitle={copy.heroSubtitle}
        {...(copy.heroImageUrl ? { image: copy.heroImageUrl } : {})}
      />
      <Section bgcolor="background.default">
        {token && <Confirmation token={token} />}

        {summary && summary.count > 0 && (
          <Box sx={{ mb: 4 }}>
            <RatingHeadline summary={summary} />
          </Box>
        )}

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          alignItems="flex-start"
          sx={{ mt: 2 }}
        >
          <Box sx={{ flex: '1 1 60%', width: '100%', minWidth: 0 }}>
            {isLoading && <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3 }} />}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <Box
                sx={{
                  p: 4,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>No reviews published yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  If you have worked with us, yours could be the first.
                </Typography>
              </Box>
            )}
            <ReviewList reviews={data?.items ?? []} />
          </Box>

          <Box
            sx={{
              flex: '1 1 40%',
              width: '100%',
              minWidth: 0,
              position: { md: 'sticky' },
              top: { md: 96 },
            }}
          >
            <SectionReveal>
              <ReviewForm />
            </SectionReveal>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 2, color: brandColors.forestGreen }}
            >
              Every review is read before it appears. We publish them as written.
            </Typography>
          </Box>
        </Stack>
      </Section>
    </>
  );
};

export default Reviews;

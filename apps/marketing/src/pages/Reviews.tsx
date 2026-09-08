import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { previewSummary } from '../features/reviews/review-preview';
import { ReviewForm } from '../features/reviews/ReviewForm';
import { ReviewsFeed } from '../features/reviews/ReviewsFeed';
import { ReviewsSummary } from '../features/reviews/ReviewsSummary';
import { apiPost } from '../lib/api-client';
import { useOrganisationRating, usePageCopy } from '../lib/content-hooks';

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

const isReviewPreview = (params: URLSearchParams): boolean =>
  import.meta.env.DEV && params.get('preview') === 'reviews';
const confirmationToken = (params: URLSearchParams): string | null =>
  isReviewPreview(params) ? null : params.get('token');

const Reviews = (): JSX.Element => {
  const [params] = useSearchParams();
  const token = confirmationToken(params);
  const preview = isReviewPreview(params);
  const copy = usePageCopy('reviews', {
    seoTitle: 'Reviews',
    seoDescription:
      'What partners, participants and attendees say about working with Impact Africa Alliance.',
    heroEyebrow: 'Reviews',
    heroTitle: 'In their words.',
    heroSubtitle:
      'What partners, participants and attendees say about working with us — published as written, once read.',
  });
  const { data: liveSummary } = useOrganisationRating();

  const summary = preview ? previewSummary : liveSummary;

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
        {preview && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Design preview — fictional reviews and ratings. Nothing entered here will be submitted.
          </Alert>
        )}
        {token && <Confirmation token={token} />}

        {summary && summary.count > 0 && (
          <Box sx={{ mb: 4 }}>
            <ReviewsSummary summary={summary} />
          </Box>
        )}

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          alignItems="flex-start"
          sx={{ mt: 2 }}
        >
          <Box sx={{ flex: '1 1 60%', width: '100%', minWidth: 0 }}>
            <ReviewsFeed preview={preview} />
          </Box>

          <Box
            sx={{
              flex: '1 1 40%',
              width: '100%',
              minWidth: 0,
            }}
          >
            <SectionReveal>
              <ReviewForm preview={preview} />
            </SectionReveal>
          </Box>
        </Stack>
      </Section>
    </>
  );
};

export default Reviews;

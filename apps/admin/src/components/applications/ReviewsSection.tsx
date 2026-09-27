import type { AdminApplication, ApplicationReview } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { useAddApplicationReview, useDeleteApplicationReview } from '../../lib/applications';
import { formatInstant } from '../../lib/forms';
import { DetailSection } from '../detail/DetailSection';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

import { RecommendationChip } from './ApplicationChips';
import { ReviewDialog } from './ReviewDialog';

const Score = ({ score }: { score: number }): JSX.Element => (
  <Stack direction="row" spacing={0.25} aria-label={`Score ${score} out of 5`} role="img">
    {[1, 2, 3, 4, 5].map((star) => (
      <StarRoundedIcon
        key={star}
        sx={{ fontSize: 18, color: star <= score ? 'secondary.main' : 'action.disabled' }}
      />
    ))}
  </Stack>
);

const ReviewItem = ({
  review,
  canRemove,
  onRemove,
}: {
  review: ApplicationReview;
  canRemove: boolean;
  onRemove: () => void;
}): JSX.Element => (
  <Box component="li" sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider', listStyle: 'none' }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
      <Typography sx={{ fontWeight: 700 }}>
        {review.reviewer?.name ?? 'A former colleague'}
      </Typography>
      {review.recommendation && <RecommendationChip recommendation={review.recommendation} />}
      {review.score && <Score score={review.score} />}
      <Box sx={{ flex: 1 }} />
      {canRemove && (
        <IconButton
          size="small"
          aria-label={`Remove the review by ${review.reviewer?.name ?? 'a former colleague'}`}
          onClick={onRemove}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
    <Typography variant="caption" color="text.secondary">
      {formatInstant(review.createdAt)}
    </Typography>
    <Typography sx={{ mt: 0.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {review.notes}
    </Typography>
  </Box>
);

/**
 * Internal reviews: who thought what, with a way to add one and to remove
 * your own (an administrator can remove any).
 */
export const ReviewsSection = ({
  application,
  canUpdate,
}: {
  application: AdminApplication;
  canUpdate: boolean;
}): JSX.Element => {
  const { user } = useAuth();
  const add = useAddApplicationReview();
  const remove = useDeleteApplicationReview();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ApplicationReview | null>(null);
  const isAdmin = user?.role === 'admin';
  const name = application.applicant.name ?? application.reference;

  return (
    <DetailSection
      title="Reviews"
      icon={<RateReviewOutlinedIcon />}
      description="Internal only. The applicant never sees these."
      action={
        canUpdate ? (
          <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)}>
            Add review
          </Button>
        ) : undefined
      }
    >
      {application.reviews.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No reviews yet. Each colleague&apos;s notes, recommendation and score appear here.
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0 }} aria-label="Reviews">
          {application.reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              canRemove={canUpdate && (isAdmin || review.reviewer?.id === user?.id)}
              onRemove={() => setRemoving(review)}
            />
          ))}
        </Box>
      )}
      <ReviewDialog
        open={adding}
        applicantName={name}
        pending={add.isPending}
        error={add.isError ? add.error.message : null}
        onSubmit={(review) =>
          add.mutate({ id: application.id, review }, { onSuccess: () => setAdding(false) })
        }
        onClose={() => {
          setAdding(false);
          add.reset();
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        tone="error"
        eyebrow="Reviews"
        title="Remove this review?"
        description={
          <>
            The review by <strong>{removing?.reviewer?.name ?? 'a former colleague'}</strong> of{' '}
            {name}&apos;s application will be removed. This cannot be undone.
          </>
        }
        confirmLabel="Remove review"
        pending={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onConfirm={() => {
          if (removing) {
            remove.mutate(
              { id: application.id, reviewId: removing.id },
              { onSuccess: () => setRemoving(null) },
            );
          }
        }}
        onClose={() => {
          setRemoving(null);
          remove.reset();
        }}
      />
    </DetailSection>
  );
};

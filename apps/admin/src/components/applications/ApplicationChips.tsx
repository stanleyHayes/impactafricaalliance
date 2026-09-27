import type { ApplicationRecommendation, ApplicationStatus } from '@iaa/shared';
import Chip, { type ChipProps } from '@mui/material/Chip';

import {
  APPLICATION_RECOMMENDATION_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
} from '../../lib/select-options';

const STATUS_COLOURS: Record<ApplicationStatus, ChipProps['color']> = {
  draft: 'default',
  submitted: 'info',
  'under-review': 'warning',
  shortlisted: 'secondary',
  accepted: 'success',
  rejected: 'default',
};

/** The words for a status, as every screen shows them. */
export const applicationStatusLabel = (status: ApplicationStatus): string =>
  APPLICATION_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  (status === 'draft' ? 'Draft' : status);

/** An application's status, in the words and colour used on every applications screen. */
export const ApplicationStatusChip = ({
  status,
  size = 'small',
}: {
  status: ApplicationStatus;
  size?: ChipProps['size'];
}): JSX.Element => (
  <Chip
    size={size}
    label={applicationStatusLabel(status)}
    color={STATUS_COLOURS[status]}
    variant={status === 'rejected' ? 'outlined' : 'filled'}
    sx={{ fontWeight: 600 }}
  />
);

const RECOMMENDATION_COLOURS: Record<ApplicationRecommendation, ChipProps['color']> = {
  'strong-yes': 'success',
  yes: 'success',
  maybe: 'warning',
  no: 'error',
};

export const recommendationLabel = (recommendation: ApplicationRecommendation): string =>
  APPLICATION_RECOMMENDATION_OPTIONS.find((option) => option.value === recommendation)?.label ??
  recommendation;

/** A reviewer's recommendation at a glance. */
export const RecommendationChip = ({
  recommendation,
}: {
  recommendation: ApplicationRecommendation;
}): JSX.Element => (
  <Chip
    size="small"
    variant="outlined"
    label={recommendationLabel(recommendation)}
    color={RECOMMENDATION_COLOURS[recommendation]}
    sx={{ fontWeight: 600 }}
  />
);

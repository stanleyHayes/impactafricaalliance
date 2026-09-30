import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { ResourceFormStep } from '../../resources/form-steps';
import type { FieldConfig, ResourceConfig } from '../../resources/types';
import { surfaceSx } from '../../theme/surfaces';
import { Markdown } from '../markdown/Markdown';

import { ReviewSummary } from './ReviewSummary';

const reviewText = (field: FieldConfig, value: unknown): string => {
  if (field.type === 'datetime') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString('en-GB');
  }
  if (field.type === 'select')
    return field.options?.find((option) => option.value === value)?.label ?? String(value);
  return Array.isArray(value) ? value.join(', ') : String(value);
};

const ReviewValue = ({ field, value }: { field: FieldConfig; value: unknown }): JSX.Element => {
  if (value === undefined || value === null || value === '') {
    return (
      <Typography variant="body2" color="text.secondary">
        Not set
      </Typography>
    );
  }
  if (field.type === 'switch') {
    return (
      <Chip
        size="small"
        variant="outlined"
        icon={value ? <CheckRoundedIcon /> : <RemoveRoundedIcon />}
        label={value ? 'Yes' : 'No'}
        sx={{ height: 24, color: 'text.primary', borderColor: 'divider', fontWeight: 600 }}
      />
    );
  }
  if (
    (field.type === 'image' || field.type === 'file') &&
    typeof value === 'object' &&
    'url' in value
  ) {
    const url = String(value.url);
    return field.type === 'image' ? (
      <Box
        component="img"
        src={url}
        alt={field.label}
        sx={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: 160,
          objectFit: 'contain',
          borderRadius: 1.5,
        }}
      />
    ) : (
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        color="text.primary"
      >
        Open uploaded file
      </Link>
    );
  }
  if (field.type === 'richtext') return <Markdown>{String(value)}</Markdown>;
  return (
    <Typography
      variant="body2"
      sx={{ whiteSpace: 'pre-wrap', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
    >
      {reviewText(field, value) || 'Not set'}
    </Typography>
  );
};

/** Editor field widths do not dictate summary widths: only long content needs a full row. */
const needsFullRow = (field: FieldConfig, value: unknown): boolean =>
  typeof value === 'string' &&
  value.length > 0 &&
  (field.type === 'richtext' || field.type === 'textarea' || value.length > 120);

interface ResourceReviewProps {
  resource: ResourceConfig;
  steps: ResourceFormStep[];
  values: Record<string, unknown>;
  busy: boolean;
  onEdit: (step: number) => void;
}

export const ResourceReview = ({
  resource,
  steps,
  values,
  busy,
  onEdit,
}: ResourceReviewProps): JSX.Element => (
  <Stack spacing={2}>
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Review your {resource.singular.toLowerCase()}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        Check your entries, or edit a section before saving.
      </Typography>
    </Box>
    {resource.renderPreview && (
      <Box sx={{ p: 2.5, ...surfaceSx.card, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Preview
        </Typography>
        {resource.renderPreview(values)}
      </Box>
    )}
    <ReviewSummary
      sections={steps.map((step, index) => ({
        title: step.label,
        step: index,
        items: step.fields.map((field) => ({
          label: field.label,
          value: <ReviewValue field={field} value={values[field.name]} />,
          fullRow: needsFullRow(field, values[field.name]),
        })),
      }))}
      onEdit={onEdit}
      disabled={busy}
    />
  </Stack>
);

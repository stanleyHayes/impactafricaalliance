import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import type { ResourceFormStep } from '../../resources/form-steps';
import type { FieldConfig, ResourceConfig } from '../../resources/types';
import { InformationItem } from '../InformationItem';
import { Markdown } from '../markdown/Markdown';

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
}: ResourceReviewProps): JSX.Element => {
  const id = useId();
  return (
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
        <Box
          sx={{
            p: 2.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Preview
          </Typography>
          {resource.renderPreview(values)}
        </Box>
      )}
      <Box
        sx={{
          containerType: 'inline-size',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        {steps.map((step, index) => (
          <Box
            component="section"
            aria-labelledby={`${id}-${index}`}
            key={step.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: 2,
              p: { xs: 2, sm: 2.5 },
              '& + &': { borderTop: 1, borderColor: 'divider' },
              '@container (min-width: 700px)': {
                gridTemplateColumns: '160px minmax(0, 1fr)',
                columnGap: 3,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                '@container (min-width: 700px)': {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  gap: 0.5,
                },
              }}
            >
              <Typography
                id={`${id}-${index}`}
                component="h3"
                variant="subtitle1"
                sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
              >
                {step.label}
              </Typography>
              <Button
                type="button"
                size="small"
                aria-label={`Edit ${step.label.toLowerCase()}`}
                disabled={busy}
                startIcon={<EditOutlinedIcon />}
                onClick={() => onEdit(index)}
                sx={{
                  flexShrink: 0,
                  minWidth: 0,
                  px: 0.75,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                }}
              >
                Edit
              </Button>
            </Box>
            <Box
              component="div"
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
                alignContent: 'start',
                gap: 2,
                m: 0,
                minWidth: 0,
                '@container (min-width: 900px)': {
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {step.fields.map((field) => (
                <Box
                  key={field.name}
                  sx={{
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    gridColumn: needsFullRow(field, values[field.name]) ? '1 / -1' : 'auto',
                  }}
                >
                  <InformationItem label={field.label}>
                    <ReviewValue field={field} value={values[field.name]} />
                  </InformationItem>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Stack>
  );
};

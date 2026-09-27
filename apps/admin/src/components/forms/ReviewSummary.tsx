import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';

import { InformationItem } from '../InformationItem';

export interface ReviewItem {
  label: string;
  /** Null, undefined, false or an empty string reads "Not set". */
  value: ReactNode;
  /** Long values (a description, a list of names) take the whole row. */
  fullRow?: boolean;
  /** In place of the icon InformationItem picks from the label. */
  icon?: ReactNode;
}

export interface ReviewSection {
  /** The step's name, as the step rail shows it. */
  title: string;
  /** The step the section's Edit button returns to. */
  step: number;
  items: ReviewItem[];
}

export interface ReviewSummaryProps {
  sections: ReviewSection[];
  onEdit: (step: number) => void;
  /** True while saving or uploading: the Edit buttons wait. */
  disabled: boolean;
}

const isEmpty = (value: ReactNode): boolean =>
  value === null || value === undefined || value === false || value === '';

const ItemValue = ({ value }: { value: ReactNode }): JSX.Element =>
  isEmpty(value) ? (
    <Typography component="span" variant="body2" color="text.secondary">
      Not set
    </Typography>
  ) : (
    <>{value}</>
  );

/**
 * The Review step's summary, shared by every stepwise editor so they read
 * alike (docs/design/forms.md): one connected panel, a section per step with
 * its own Edit control, and a grid of labelled values that says "Not set"
 * for anything left empty.
 *
 * Extracted from `ResourceReview`, which the CMS resources use, so the new
 * editors (projects, tasks, forms, stories) draw the same thing rather than
 * four versions of it. Anything a module adds (a readiness check, a status
 * card) goes below it.
 */
export const ReviewSummary = ({ sections, onEdit, disabled }: ReviewSummaryProps): JSX.Element => {
  const id = useId();
  return (
    <Box
      sx={{
        containerType: 'inline-size',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      {sections.map((section, index) => (
        <Box
          component="section"
          aria-labelledby={`${id}-${index}`}
          key={section.title}
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
              {section.title}
            </Typography>
            <Button
              type="button"
              size="small"
              aria-label={`Edit ${section.title.toLowerCase()}`}
              disabled={disabled}
              startIcon={<EditOutlinedIcon />}
              onClick={() => onEdit(section.step)}
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
            {section.items.map((item) => (
              <Box
                key={item.label}
                sx={{
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  gridColumn: item.fullRow ? '1 / -1' : 'auto',
                }}
              >
                <InformationItem label={item.label} icon={item.icon}>
                  <ItemValue value={item.value} />
                </InformationItem>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

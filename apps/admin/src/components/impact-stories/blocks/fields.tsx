import type { MediaAsset, StoryBlockData, StoryBlockType } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { MediaUploadField } from '../../fields/MediaUploadField';

/** What every block type's editor receives. */
export interface BlockFieldsProps<T extends StoryBlockType> {
  data: Partial<StoryBlockData<T>>;
  onChange: (data: Partial<StoryBlockData<T>>) => void;
  /** Each field's first problem, keyed by path (`heading`, `items.0.label`). */
  errors: Record<string, string>;
  /**
   * Whether to show those problems. They appear after a Continue or Save
   * attempt, not while someone is still typing the first word.
   */
  showErrors: boolean;
  disabled: boolean;
  onUploadingChange: (uploading: boolean) => void;
}

/** The problem to show under a field, or nothing while problems are hidden. */
export const fieldError = (
  props: Pick<BlockFieldsProps<StoryBlockType>, 'errors' | 'showErrors'>,
  path: string,
): string | undefined => (props.showErrors ? props.errors[path] : undefined);

/** An optional text value: an emptied input is stored as absent, not as ''. */
export const optionalText = (value: string): string | undefined =>
  value === '' ? undefined : value;

/** A plain text input bound to one field, with its error or its help. */
export const BlockTextField = ({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  multiline = false,
  disabled,
  maxLength,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  multiline?: boolean;
  disabled: boolean;
  maxLength?: number;
}): JSX.Element => (
  <TextField
    label={label}
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    error={Boolean(error)}
    helperText={error ?? helperText}
    required={required}
    multiline={multiline}
    minRows={multiline ? 3 : undefined}
    disabled={disabled}
    fullWidth
    slotProps={maxLength ? { htmlInput: { maxLength } } : undefined}
  />
);

/**
 * A picture and its description. Public pages need the description (alt
 * text) for people using screen readers, and publishing checks it is there,
 * so the field appears as soon as there is a picture to describe.
 */
export const ImageWithAltField = ({
  label,
  value,
  onChange,
  error,
  onUploadingChange,
  disabled,
}: {
  label: string;
  value: MediaAsset | null | undefined;
  onChange: (asset: MediaAsset | undefined) => void;
  error?: string;
  onUploadingChange: (uploading: boolean) => void;
  disabled: boolean;
}): JSX.Element => (
  <Stack spacing={1.5}>
    <MediaUploadField
      label={label}
      accept="image/*"
      preview
      value={value ?? undefined}
      onChange={onChange}
      onUploadingChange={onUploadingChange}
      folder="stories"
    />
    {value && (
      <TextField
        label="Alt text"
        value={value.alt ?? ''}
        onChange={(event) => onChange({ ...value, alt: event.target.value })}
        helperText="Describe the picture for people who cannot see it. Needed before publishing."
        disabled={disabled}
        size="small"
        fullWidth
        slotProps={{ htmlInput: { maxLength: 300 } }}
      />
    )}
    {error && <FormHelperText error>{error}</FormHelperText>}
  </Stack>
);

interface RowsEditorProps<Row> {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  /** What one row is called: "Number", "Step", "Partner". */
  noun: string;
  max: number;
  /** Rows the list keeps; the last one cannot be removed below this. */
  minRows?: number;
  /**
   * A new blank row. Leave it out when rows arrive another way, such as a
   * gallery's photos from its upload field; the Add button is then hidden.
   */
  emptyRow?: () => Row;
  renderRow: (row: Row, update: (patch: Partial<Row>) => void, index: number) => ReactNode;
  disabled: boolean;
  /** The problem with the list as a whole, such as "needs at least 1". */
  error?: string;
}

/**
 * A short list of similar rows (numbers, timeline steps, partners) with add,
 * remove and move buttons. Rows are few and move rarely, so buttons are
 * enough here; the blocks themselves can also be dragged.
 */
export const RowsEditor = <Row,>({
  rows,
  onChange,
  noun,
  max,
  minRows = 1,
  emptyRow,
  renderRow,
  disabled,
  error,
}: RowsEditorProps<Row>): JSX.Element => {
  const update = (index: number, patch: Partial<Row>): void =>
    onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  const move = (index: number, by: -1 | 1): void => {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    if (row === undefined) return;
    next.splice(index + by, 0, row);
    onChange(next);
  };
  const lower = noun.toLowerCase();
  return (
    <Stack spacing={1.5}>
      {rows.map((row, index) => (
        <Box
          key={index}
          role="group"
          aria-label={`${noun} ${index + 1}`}
          sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
              {noun} {index + 1}
            </Typography>
            <Tooltip title="Move up">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Move ${lower} ${index + 1} up`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpwardRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Move ${lower} ${index + 1} down`}
                  disabled={disabled || index === rows.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownwardRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Remove">
              <span>
                <IconButton
                  size="small"
                  aria-label={`Remove ${lower} ${index + 1}`}
                  disabled={disabled || rows.length <= minRows}
                  onClick={() => onChange(rows.filter((_, position) => position !== index))}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Stack spacing={1.5}>{renderRow(row, (patch) => update(index, patch), index)}</Stack>
        </Box>
      ))}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {emptyRow && (
        <Button
          startIcon={<AddRoundedIcon />}
          onClick={() => onChange([...rows, emptyRow()])}
          disabled={disabled || rows.length >= max}
          sx={{ alignSelf: 'flex-start' }}
        >
          {rows.length >= max ? `Up to ${max} ${lower}s` : `Add ${lower}`}
        </Button>
      )}
    </Stack>
  );
};

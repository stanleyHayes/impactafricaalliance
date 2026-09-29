import {
  acceptedFormatsFor,
  maxFileBytesFor,
  maxFilesFor,
  type FormField,
  type FormFieldType,
} from '@iaa/shared';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { DateField } from '../fields/DateField';

type PreviewInput = (props: { field: FormField; name: string }) => JSX.Element;

const INPUT_TYPES: Partial<Record<FormFieldType, string>> = {
  email: 'email',
  phone: 'tel',
  url: 'url',
  number: 'number',
};

const TextPreview: PreviewInput = ({ field, name }) => (
  <TextField
    fullWidth
    size="small"
    placeholder={field.placeholder}
    type={INPUT_TYPES[field.type] ?? 'text'}
    multiline={field.type === 'long-text'}
    minRows={field.type === 'long-text' ? 3 : undefined}
    slotProps={{ htmlInput: { 'aria-label': name } }}
  />
);

/**
 * A date question, answered with the same themed calendar the console uses,
 * not the browser's own date input, whose look and wording change with the
 * browser and the reader's locale. The question's name is already shown above
 * it, so the field is labelled with its placeholder, or plainly "Date"; what is
 * picked is not kept.
 */
const DatePreview: PreviewInput = ({ field }) => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <DateField
      label={field.placeholder?.trim() || 'Date'}
      size="small"
      value={value}
      onChange={setValue}
    />
  );
};

const SelectPreview: PreviewInput = ({ field, name }) => (
  <TextField
    select
    fullWidth
    size="small"
    defaultValue=""
    slotProps={{ htmlInput: { 'aria-label': name } }}
  >
    {field.options.map((option) => (
      <MenuItem key={option.value} value={option.value}>
        {option.label}
      </MenuItem>
    ))}
  </TextField>
);

const RadioPreview: PreviewInput = ({ field, name }) => (
  <RadioGroup aria-label={name}>
    {field.options.map((option) => (
      <FormControlLabel
        key={option.value}
        value={option.value}
        control={<Radio size="small" />}
        label={option.label}
      />
    ))}
  </RadioGroup>
);

const MultiPreview: PreviewInput = ({ field, name }) => (
  <Stack role="group" aria-label={name}>
    {field.options.map((option) => (
      <FormControlLabel
        key={option.value}
        control={<Checkbox size="small" />}
        label={option.label}
      />
    ))}
  </Stack>
);

const CheckboxPreview: PreviewInput = ({ field }) => (
  <FormControlLabel control={<Checkbox size="small" />} label={field.label || 'Tick box'} />
);

const ConsentPreview: PreviewInput = ({ field }) => (
  <FormControlLabel
    control={<Checkbox size="small" />}
    label={field.consentText?.trim() || 'The words people agree to appear here.'}
    sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { mt: -0.5 } }}
  />
);

const FilePreview: PreviewInput = ({ field }) => {
  const formats = acceptedFormatsFor(field).map((format) => format.toUpperCase());
  const files = maxFilesFor(field);
  return (
    <Box
      sx={(theme) => ({
        p: 2,
        textAlign: 'center',
        border: `1px dashed ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
      })}
    >
      <CloudUploadOutlinedIcon sx={{ color: 'text.secondary' }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {files === 1 ? 'Add a file' : `Add up to ${files} files`}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {formats.join(', ')} · up to {maxFileBytesFor(field) / (1024 * 1024)} MB each
      </Typography>
    </Box>
  );
};

const PREVIEWS: Record<FormFieldType, PreviewInput> = {
  'short-text': TextPreview,
  'long-text': TextPreview,
  email: TextPreview,
  phone: TextPreview,
  url: TextPreview,
  number: TextPreview,
  date: DatePreview,
  select: SelectPreview,
  radio: RadioPreview,
  'multi-select': MultiPreview,
  checkbox: CheckboxPreview,
  consent: ConsentPreview,
  file: FilePreview,
};

/**
 * Roughly how an applicant sees one question: its label, help text and the
 * control they answer with. Nothing typed here is kept; it is there so the
 * editor can see the question before publishing. The real page is one Preview
 * away on the form's own page.
 */
export const FieldPreview = ({ field }: { field: FormField }): JSX.Element => {
  const Input = PREVIEWS[field.type];
  const name = field.label.trim() || 'Untitled question';
  const showsOwnLabel = field.type === 'checkbox';
  return (
    <Box
      aria-label={`Preview of ${name}`}
      role="group"
      sx={(theme) => ({
        p: 2,
        borderRadius: 2.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.background.default, 0.6),
      })}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', lineHeight: 1.6, mb: 1 }}
      >
        How applicants see it
      </Typography>
      {!showsOwnLabel && (
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
          {name}
          {(field.required || field.type === 'consent') && (
            <Box component="span" aria-hidden sx={{ color: 'error.main', ml: 0.5 }}>
              *
            </Box>
          )}
        </Typography>
      )}
      {field.helpText && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {field.helpText}
        </Typography>
      )}
      <Input field={field} name={name} />
    </Box>
  );
};

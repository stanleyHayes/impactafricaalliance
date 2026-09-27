import {
  isCalendarDateKey,
  type AnswerValue as AnswerData,
  type FileAnswer,
  type FormField,
} from '@iaa/shared';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatInstant } from '../../lib/forms';

const isFileList = (value: AnswerData): value is FileAnswer[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'object' && item !== null && 'publicId' in item);

// Only web links become links; anything else an applicant typed stays text.
const WEB_LINK = /^https?:\/\//i;

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const optionLabel = (field: FormField | undefined, value: string): string =>
  field?.options.find((option) => option.value === value)?.label ?? value;

const sizeText = (bytes: number | undefined): string => {
  if (bytes === undefined) return '';
  if (bytes < 1024 * 1024) return ` · ${Math.max(1, Math.round(bytes / 1024))} KB`;
  return ` · ${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileLinks = ({ files }: { files: FileAnswer[] }): JSX.Element => (
  <Stack spacing={0.75}>
    {files.map((file) => (
      <Link
        key={file.publicId}
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, overflowWrap: 'anywhere' }}
      >
        <DownloadRoundedIcon fontSize="small" aria-hidden />
        {file.name}
        <Typography component="span" variant="body2" color="text.secondary">
          {sizeText(file.bytes)}
        </Typography>
      </Link>
    ))}
  </Stack>
);

const textAnswer = (field: FormField | undefined, value: string): JSX.Element => {
  if (field?.type === 'url' && WEB_LINK.test(value)) {
    return (
      <Link
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ overflowWrap: 'anywhere' }}
      >
        {value}
      </Link>
    );
  }
  if (field?.type === 'date') {
    return (
      <>
        {isCalendarDateKey(value)
          ? DAY_FORMAT.format(new Date(`${value}T12:00:00Z`))
          : formatInstant(value)}
      </>
    );
  }
  return <>{field && field.options.length > 0 ? optionLabel(field, value) : value}</>;
};

const tickText = (field: FormField | undefined, value: boolean): string => {
  if (field?.type === 'consent') return value ? 'Agreed' : 'Not agreed';
  return value ? 'Yes' : 'No';
};

/**
 * One answer as a reviewer reads it: choices by their label, ticks in words,
 * links that open, files as downloads, and long text with its line breaks.
 */
export const AnswerValue = ({
  field,
  value,
}: {
  /** The question as the applicant saw it, when the version still has it. */
  field: FormField | undefined;
  value: AnswerData | undefined;
}): JSX.Element => {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Not answered
      </Typography>
    );
  }
  if (isFileList(value)) return <FileLinks files={value} />;
  if (Array.isArray(value)) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {value.map((item) => (
          <Chip key={String(item)} size="small" label={optionLabel(field, String(item))} />
        ))}
      </Box>
    );
  }
  if (typeof value === 'boolean') {
    return <Typography>{tickText(field, value)}</Typography>;
  }
  return (
    <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {typeof value === 'number' ? String(value) : textAnswer(field, value)}
    </Typography>
  );
};

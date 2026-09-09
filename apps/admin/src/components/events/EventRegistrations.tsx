import type { EventAnswer, EventRegistration } from '@iaa/shared';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useEventRegistrations } from '../../lib/admin-hooks';
import { formatUtcShort } from '../../lib/date';

/** Columns everyone answers, in the order the form asks for them. */
const FIXED_COLUMNS: ReadonlyArray<{ key: keyof EventRegistration; label: string }> = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'ageRange', label: 'Age range' },
  { key: 'gender', label: 'Gender' },
  { key: 'describesYou', label: 'Describes them' },
  { key: 'educationLevel', label: 'Education' },
  { key: 'field', label: 'Field' },
];

const answerText = (answer: EventAnswer): string =>
  Array.isArray(answer.value) ? answer.value.join('; ') : String(answer.value ?? '');

/**
 * Escapes one CSV field.
 *
 * A leading =, +, - or @ is prefixed with a quote, because spreadsheets read
 * those as formulas: a name entered as "=cmd" would execute on open rather
 * than be read. The value is kept, only its interpretation changes.
 */
const csvField = (value: string): string => {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
};

/**
 * The list as a spreadsheet.
 *
 * Custom questions become their own columns, so an export carries everything
 * that was asked rather than flattening the answers into one cell.
 */
export const toCsv = (registrations: readonly EventRegistration[]): string => {
  const questionLabels = [
    ...new Set(registrations.flatMap((row) => row.answers.map((answer) => answer.label))),
  ];
  const header = [...FIXED_COLUMNS.map((column) => column.label), ...questionLabels, 'Registered'];

  const rows = registrations.map((registration) => [
    ...FIXED_COLUMNS.map((column) => String(registration[column.key] ?? '')),
    ...questionLabels.map((label) => {
      const answer = registration.answers.find((entry) => entry.label === label);
      return answer ? answerText(answer) : '';
    }),
    registration.createdAt,
  ]);

  return [header, ...rows].map((row) => row.map(csvField).join(',')).join('\n');
};

const download = (csv: string, filename: string): void => {
  // A byte-order mark, so Excel opens accented names as written rather than as
  // mojibake.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const RegistrationRow = ({ registration }: { registration: EventRegistration }): JSX.Element => (
  <TableRow hover>
    <TableCell>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {registration.fullName}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {registration.email}
      </Typography>
    </TableCell>
    <TableCell>
      <Typography variant="body2">
        {[registration.city, registration.country].filter(Boolean).join(', ') || '—'}
      </Typography>
    </TableCell>
    <TableCell>
      <Typography variant="body2">{registration.describesYou ?? '—'}</Typography>
    </TableCell>
    <TableCell>
      <Typography variant="body2" color="text.secondary">
        {formatUtcShort(registration.createdAt)}
      </Typography>
    </TableCell>
  </TableRow>
);

const RegistrationsBody = ({
  items,
  totalPages,
  page,
  onPage,
  loading,
  failed,
}: {
  items: EventRegistration[];
  totalPages: number;
  page: number;
  onPage: (next: number) => void;
  loading: boolean;
  failed: boolean;
}): JSX.Element => {
  if (failed) return <Alert severity="error">Registrations could not be loaded.</Alert>;
  if (loading) return <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2.5 }} />;
  if (items.length === 0)
    return (
      <Stack alignItems="center" spacing={1} sx={{ py: 5, textAlign: 'center' }}>
        <PeopleOutlineRoundedIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
        <Typography sx={{ fontWeight: 700 }}>Nobody has registered yet</Typography>
        <Typography variant="body2" color="text.secondary">
          Sign-ups appear here as they come in, with everything the form asked for.
        </Typography>
      </Stack>
    );

  return (
    <>
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Attendee</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Describes them</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((registration) => (
              <RegistrationRow key={registration.id} registration={registration} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_event, next) => onPage(next)}
            color="primary"
            shape="rounded"
          />
        </Stack>
      )}
    </>
  );
};

export const EventRegistrations = ({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}): JSX.Element => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useEventRegistrations(eventId, page);
  const items = data?.items ?? [];

  const exportCsv = (): void => {
    const slug = eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    download(toCsv(items), `${slug || 'event'}-registrations.csv`);
  };

  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Registrations
          </Typography>
          {data && <Chip size="small" label={`${data.total} total`} />}
        </Stack>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadRoundedIcon />}
          disabled={items.length === 0}
          onClick={exportCsv}
        >
          Export this page
        </Button>
      </Stack>

      <RegistrationsBody
        items={items}
        totalPages={data?.totalPages ?? 1}
        page={page}
        onPage={setPage}
        loading={isLoading && !data}
        failed={isError}
      />
    </Box>
  );
};

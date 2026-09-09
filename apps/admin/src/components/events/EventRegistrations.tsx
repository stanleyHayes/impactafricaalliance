import type { EventAnswer, EventRegistration } from '@iaa/shared';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useEventRegistrations } from '../../lib/admin-hooks';
import { formatUtcShort } from '../../lib/date';
import { InformationItem } from '../InformationItem';

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
  <Box
    component="details"
    sx={{
      borderBottom: 1,
      borderColor: 'divider',
      '&:last-child': { borderBottom: 0 },
      '&[open] .registration-chevron': { transform: 'rotate(180deg)' },
    }}
  >
    <Box
      component="summary"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr auto',
          md: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto',
        },
        gap: 2,
        alignItems: 'center',
        px: { xs: 2, sm: 3 },
        py: 2.5,
        cursor: 'pointer',
        listStyle: 'none',
        '&::-webkit-details-marker': { display: 'none' },
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: -2,
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar
          variant="rounded"
          sx={{
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {registration.fullName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')}
        </Avatar>
        <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {registration.fullName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {registration.email}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'block', md: 'none' }, mt: 0.5 }}
          >
            {[registration.city, registration.country].filter(Boolean).join(', ') ||
              'Location not provided'}{' '}
            · {formatUtcShort(registration.createdAt)}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ display: { xs: 'none', md: 'block' }, overflowWrap: 'anywhere' }}>
        <Typography variant="body2">
          {[registration.city, registration.country].filter(Boolean).join(', ') || 'Not provided'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {registration.describesYou || 'No profile provided'}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: { xs: 'none', md: 'block' }, fontVariantNumeric: 'tabular-nums' }}
      >
        {formatUtcShort(registration.createdAt)}
      </Typography>
      <ExpandMoreRoundedIcon className="registration-chevron" sx={{ color: 'text.secondary' }} />
    </Box>
    <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3, pt: 1 }}>
      <Typography variant="overline" color="text.secondary">
        Registration details
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: 2.5,
          mt: 1.5,
        }}
      >
        {FIXED_COLUMNS.filter(({ key }) => !['fullName', 'email'].includes(key)).map(
          ({ key, label }) => (
            <InformationItem key={key} label={label}>
              {String(registration[key] || 'Not provided')}
            </InformationItem>
          ),
        )}
      </Box>
      {registration.answers.length > 0 && (
        <Box sx={{ mt: 3, p: 2.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Question responses
          </Typography>
          <Stack spacing={2}>
            {registration.answers.map((answer, index) => (
              <InformationItem key={`${answer.questionId}-${index}`} label={answer.label}>
                {answerText(answer) || 'Not provided'}
              </InformationItem>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  </Box>
);

export const EventRegistrations = ({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}): JSX.Element => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isFetching, refetch } = useEventRegistrations(eventId, page);
  const items = data?.items ?? [];

  const exportCsv = (): void => {
    const slug = eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    download(toCsv(items), `${slug || 'event'}-registrations.csv`);
  };

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const renderBody = (): JSX.Element => {
    if (isError)
      return (
        <Alert
          severity="error"
          sx={{ m: 2 }}
          action={
            <Button color="inherit" disabled={isFetching} onClick={() => void refetch()}>
              Retry
            </Button>
          }
        >
          Registrations could not be loaded. Please try again.
        </Alert>
      );
    if (isLoading)
      return (
        <Stack spacing={2} sx={{ p: 3 }} aria-label="Loading registrations">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} variant="rounded" height={64} />
          ))}
        </Stack>
      );
    if (items.length === 0)
      return (
        <Stack alignItems="center" spacing={1.5} sx={{ px: 3, py: 6, textAlign: 'center' }}>
          <Avatar
            variant="rounded"
            sx={{ width: 64, height: 64, bgcolor: 'action.hover', color: 'primary.main' }}
          >
            <PeopleOutlineRoundedIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography sx={{ fontWeight: 700 }}>Nobody has registered yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
            When someone signs up, their contact details and question responses will appear here.
          </Typography>
        </Stack>
      );
    return (
      <>
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography variant="subtitle2">Attendee directory</Typography>
          <Typography variant="caption" color="text.secondary">
            Newest first
          </Typography>
        </Stack>
        {items.map((registration) => (
          <RegistrationRow key={registration.id} registration={registration} />
        ))}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}
        >
          <Typography variant="caption" color="text.secondary" role="status">
            Showing {((page - 1) * 25 + 1).toLocaleString()}–
            {((page - 1) * 25 + items.length).toLocaleString()} of {total.toLocaleString()}{' '}
            registrations
          </Typography>
          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_event, next) => setPage(next)}
              color="primary"
              shape="rounded"
              size="small"
              siblingCount={0}
            />
          )}
        </Stack>
      </>
    );
  };

  return (
    <Box
      component="section"
      aria-label="Registrations"
      sx={{
        mt: 4,
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 2.5, sm: 3 },
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.055),
        }}
      >
        <PeopleOutlineRoundedIcon
          aria-hidden
          sx={{
            position: 'absolute',
            right: 24,
            bottom: -28,
            fontSize: 180,
            color: 'primary.main',
            opacity: 0.06,
            pointerEvents: 'none',
          }}
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ position: 'relative' }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              Your event audience
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={1.5}>
              <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
                Registrations
              </Typography>
              {data && !isError && (
                <Typography
                  sx={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: 'primary.main',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {total.toLocaleString()}
                </Typography>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Meet the people joining you. Open an attendee to view their responses.
            </Typography>
          </Box>
          <Stack
            spacing={0.75}
            sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'center' }}
          >
            <Button
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              disabled={items.length === 0 || isFetching || isError}
              onClick={exportCsv}
            >
              Export this page
            </Button>
            <Typography variant="caption" color="text.secondary">
              CSV · Includes custom question responses
            </Typography>
          </Stack>
        </Stack>
      </Box>
      {renderBody()}
    </Box>
  );
};

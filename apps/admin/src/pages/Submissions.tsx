import {
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
  SubmissionStatus,
  SubmissionType,
  type Submission,
} from '@iaa/shared';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { CardListSkeleton } from '../components/CardListSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useSubmissions, useUpdateSubmissionStatus } from '../lib/admin-hooks';

/** Per-type presentation: an avatar icon, a human label, and a brand accent resolver. */
const TYPE_META: Record<
  Submission['type'],
  { icon: ReactNode; label: string; accent: (t: Theme) => string }
> = {
  [SubmissionType.Contact]: {
    icon: <EmailOutlinedIcon fontSize="small" />,
    label: 'Contact',
    accent: (t) => t.palette.primary.main,
  },
  [SubmissionType.Partner]: {
    icon: <HandshakeOutlinedIcon fontSize="small" />,
    label: 'Partner',
    accent: (t) => t.palette.secondary.main,
  },
  [SubmissionType.Volunteer]: {
    icon: <VolunteerActivismOutlinedIcon fontSize="small" />,
    label: 'Volunteer',
    accent: (t) => t.palette.primary.light,
  },
};

/** Chip colour for each submission status. */
const STATUS_TONE: Record<SubmissionStatus, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning'> = {
  [SubmissionStatus.New]: 'secondary',
  [SubmissionStatus.Read]: 'primary',
  [SubmissionStatus.Archived]: 'default',
};

/** Payload keys promoted to the card title, in priority order. */
const TITLE_KEYS = ['name', 'fullName', 'organizationName', 'organization', 'email'];
/** Payload keys promoted to the supporting line, in priority order. */
const SUBTITLE_KEYS = ['subject', 'message', 'expertise', 'role', 'interest', 'email'];

/** Returns the first present, non-empty string value among the given keys. */
const pick = (payload: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

/** "name" -> "Name", "organizationName" -> "Organization Name". */
const humanizeKey = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

/** Compact, friendly relative time with an exact-time fallback in the title attr. */
const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) {
    return 'just now';
  }
  if (diff < hour) {
    const m = Math.round(diff / minute);
    return `${m}m ago`;
  }
  if (diff < day) {
    const h = Math.round(diff / hour);
    return `${h}h ago`;
  }
  if (diff < 7 * day) {
    const d = Math.round(diff / day);
    return `${d}d ago`;
  }
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const SubmissionCard = ({ submission }: { submission: Submission }): JSX.Element => {
  const theme = useTheme();
  const update = useUpdateSubmissionStatus();

  const meta = TYPE_META[submission.type];
  const accentColor = meta.accent(theme);
  const isNew = submission.status === SubmissionStatus.New;

  const entries = Object.entries(submission.payload).filter(([key]) => key !== '__seed');
  const title = pick(submission.payload, TITLE_KEYS) ?? meta.label;
  const subtitle = pick(submission.payload, SUBTITLE_KEYS);
  const tone = STATUS_TONE[submission.status];

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2.5,
        // Colored left accent rail keyed to the submission type.
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: accentColor,
        },
        transition: theme.transitions.create(['box-shadow', 'border-color', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          borderColor: alpha(accentColor, 0.5),
          boxShadow: `0 10px 30px -18px ${alpha(accentColor, 0.7)}`,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box sx={{ pl: 3, pr: 2.5, py: 2.25 }}>
        {/* Header: avatar + title block on the left, time + status control on the right. */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 44,
                height: 44,
                color: accentColor,
                bgcolor: alpha(accentColor, 0.12),
                border: `1px solid ${alpha(accentColor, 0.22)}`,
                borderRadius: 2,
              }}
            >
              {meta.icon}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                {isNew && (
                  <Box
                    aria-hidden
                    sx={{
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                      boxShadow: `0 0 0 4px ${alpha(theme.palette.warning.main, 0.18)}`,
                    }}
                  />
                )}
                <Typography
                  variant="subtitle1"
                  noWrap
                  title={title}
                  sx={{ fontWeight: 700, lineHeight: 1.3, minWidth: 0 }}
                >
                  {title}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}
              >
                <Chip
                  size="small"
                  label={meta.label}
                  sx={{
                    height: 22,
                    fontWeight: 600,
                    color: accentColor,
                    bgcolor: alpha(accentColor, 0.1),
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  color={tone}
                  label={submission.status}
                  sx={{ height: 22, textTransform: 'capitalize', '& .MuiChip-label': { px: 1 } }}
                />
              </Stack>
            </Box>
          </Stack>

          <Stack spacing={1} alignItems="flex-end" sx={{ flexShrink: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              title={new Date(submission.createdAt).toLocaleString()}
              sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}
            >
              {relativeTime(submission.createdAt)}
            </Typography>
            <Select
              size="small"
              value={submission.status}
              disabled={update.isPending}
              onChange={(event) =>
                update.mutate({ id: submission.id, status: event.target.value as SubmissionStatus })
              }
              aria-label="Change status"
              sx={{
                minWidth: 124,
                bgcolor: 'background.default',
                textTransform: 'capitalize',
                fontSize: 13,
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              {SUBMISSION_STATUSES.map((status) => (
                <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </Stack>

        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {subtitle}
          </Typography>
        )}

        {entries.length > 0 && (
          <Box
            component="dl"
            sx={{
              mt: 2,
              mb: 0,
              pt: 1.75,
              borderTop: `1px solid ${theme.palette.divider}`,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              columnGap: 3,
              rowGap: 1.25,
            }}
          >
            {entries.map(([key, value]) => (
              <Box key={key} sx={{ minWidth: 0 }}>
                <Typography
                  component="dt"
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {humanizeKey(key)}
                </Typography>
                <Typography
                  component="dd"
                  variant="body2"
                  sx={{ m: 0, mt: 0.25, color: 'text.primary', wordBreak: 'break-word' }}
                >
                  {String(value)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Card>
  );
};

const PAGE_SIZE = 8;

const Submissions = (): JSX.Element => {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSubmissions({ type, status });
  const submissions = data?.items ?? [];
  const hasFilters = Boolean(type || status || search);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? submissions.filter((submission) => {
        const haystack = [
          submission.type,
          submission.status,
          ...Object.values(submission.payload).filter(
            (value): value is string => typeof value === 'string',
          ),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
    : submissions;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [type, status, search]);

  const clearFilters = (): void => {
    setType('');
    setStatus('');
    setSearch('');
  };

  const renderList = (): JSX.Element => {
    if (isLoading) {
      return <CardListSkeleton />;
    }
    if (filtered.length === 0) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <EmptyState
            icon={<InboxOutlinedIcon />}
            title={hasFilters ? 'No matching submissions' : 'No submissions yet'}
            description={
              hasFilters
                ? 'No submissions match the current filters. Try clearing them to see everything.'
                : 'Contact, partnership, and volunteer enquiries from the website will land here.'
            }
            primaryAction={
              hasFilters
                ? { label: 'Clear filters', onClick: clearFilters, icon: <FilterAltOffIcon /> }
                : undefined
            }
          />
        </Box>
      );
    }
    return (
      <Stack spacing={2}>
        {paged.map((submission) => (
          <SubmissionCard key={submission.id} submission={submission} />
        ))}
        {pageCount > 1 && (
          <Stack alignItems="center" sx={{ pt: 1 }}>
            <Pagination
              count={pageCount}
              page={currentPage}
              onChange={(_event, value) => setPage(value)}
              color="primary"
              shape="rounded"
            />
          </Stack>
        )}
      </Stack>
    );
  };

  return (
    <>
      <PageHeader
        icon={<InboxOutlinedIcon />}
        title="Submissions"
        description="Contact, partnership, and volunteer enquiries from the website."
        count={data?.total}
      />
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ mb: 3, flexWrap: 'wrap', rowGap: 1.5, alignItems: 'center' }}
      >
        <TextField
          size="small"
          placeholder="Search submissions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 240 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {SUBMISSION_TYPES.map((value) => (
            <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {SUBMISSION_STATUSES.map((value) => (
            <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        {hasFilters && (
          <Chip
            label="Clear filters"
            onClick={clearFilters}
            onDelete={clearFilters}
            deleteIcon={<FilterAltOffIcon />}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          />
        )}
      </Stack>

      {renderList()}
    </>
  );
};

export default Submissions;

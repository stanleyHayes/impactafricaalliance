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
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCan } from '../auth/useCan';
import { DataTable } from '../components/data/DataTable';
import { RecordActions } from '../components/data/RecordActions';
import { useViewMode } from '../components/data/useViewMode';
import { ViewToggle } from '../components/data/ViewToggle';
import { EmptyState } from '../components/EmptyState';
import { InformationItem } from '../components/InformationItem';
import { PageHeader } from '../components/PageHeader';
import { useSubmissions, useUpdateSubmissionStatus } from '../lib/admin-hooks';
import { formatUtcDate, formatUtcShort } from '../lib/date';
import { pageGuides } from '../lib/page-guides';

/**
 * Dedicated inboxes. The combined list still lives at /submissions; these give
 * partner and mentor enquiries a linkable home of their own, which is what the
 * website review asked for.
 */
const INBOXES: Record<string, { type: Submission['type']; title: string; description: string }> = {
  partners: {
    type: SubmissionType.Partner,
    title: 'Partner enquiries',
    description: 'Organisations that asked to partner with the Alliance.',
  },
  mentors: {
    type: SubmissionType.Volunteer,
    title: 'Mentor & volunteer applications',
    description: 'People offering their time and expertise to our programmes.',
  },
  contact: {
    type: SubmissionType.Contact,
    title: 'Contact messages',
    description: 'General enquiries sent from the contact page.',
  },
  applications: {
    type: SubmissionType.Job,
    title: 'Job applications',
    description: 'Applications submitted against open roles.',
  },
};

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
  [SubmissionType.Job]: {
    icon: <WorkOutlineOutlinedIcon fontSize="small" />,
    label: 'Job',
    accent: (t) => t.palette.info.main,
  },
};

/** Chip colour for each submission status. */
const STATUS_TONE: Record<
  SubmissionStatus,
  'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning'
> = {
  [SubmissionStatus.New]: 'secondary',
  [SubmissionStatus.Read]: 'primary',
  [SubmissionStatus.Archived]: 'default',
};

/** Payload keys promoted to the card title, in priority order. */
const TITLE_KEYS = ['name', 'jobTitle', 'fullName', 'organizationName', 'organization', 'email'];
/** Payload keys promoted to the supporting line, in priority order. */
const SUBTITLE_KEYS = [
  'subject',
  'message',
  'coverLetter',
  'expertise',
  'role',
  'interest',
  'email',
];

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
  return formatUtcShort(iso);
};

/** Inline status editor shared by the card and table views. */
const SubmissionStatusSelect = ({
  id,
  status,
}: {
  id: string;
  status: SubmissionStatus;
}): JSX.Element => {
  const update = useUpdateSubmissionStatus();
  const can = useCan();
  if (!can('update', 'submissions')) return <Chip label={status} size="small" />;
  return (
    <>
      <Select
        size="small"
        value={status}
        disabled={update.isPending}
        onChange={(event) => update.mutate({ id, status: event.target.value as SubmissionStatus })}
        aria-label="Change status"
        sx={{
          minWidth: 124,
          bgcolor: 'background.default',
          textTransform: 'capitalize',
          fontSize: 13,
          '& .MuiSelect-select': { py: 0.75 },
        }}
      >
        {SUBMISSION_STATUSES.map((value) => (
          <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>
            {value}
          </MenuItem>
        ))}
      </Select>
      <Snackbar open={update.isError} onClose={() => update.reset()}>
        <Alert severity="error" onClose={() => update.reset()}>
          {update.error?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

/** Visual classification for payload values promoted to quick contact chips. */
type ContactKind = 'email' | 'phone' | 'link';

interface ContactLink {
  key: string;
  value: string;
  kind: ContactKind;
}

const EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_VALUE_RE = /^https?:\/\//i;
const EMAIL_KEY_RE = /e-?mail/i;
const PHONE_KEY_RE = /phone|mobile|tel/i;

const CONTACT_ICON: Record<ContactKind, ReactElement> = {
  email: <EmailOutlinedIcon fontSize="small" />,
  phone: <PhoneOutlinedIcon fontSize="small" />,
  link: <LinkOutlinedIcon fontSize="small" />,
};

/** Classifies a payload entry as a contact link, if it looks like one. */
const classifyContact = (key: string, value: string): ContactKind | undefined => {
  if (EMAIL_KEY_RE.test(key) || EMAIL_VALUE_RE.test(value)) {
    return 'email';
  }
  if (PHONE_KEY_RE.test(key)) {
    return 'phone';
  }
  if (URL_VALUE_RE.test(value)) {
    return 'link';
  }
  return undefined;
};

/** Builds an actionable href for a contact chip. */
const contactHref = (contact: ContactLink): string => {
  if (contact.kind === 'email') {
    return `mailto:${contact.value}`;
  }
  if (contact.kind === 'phone') {
    return `tel:${contact.value.replace(/[\s()-]+/g, '')}`;
  }
  return contact.value;
};

interface CardModel {
  title: string;
  message?: string;
  contacts: ContactLink[];
  details: [string, unknown][];
}

/** Derives the card's presentation model, de-duplicating surfaced fields from the detail grid. */
const buildCardModel = (submission: Submission): CardModel => {
  const { payload } = submission;
  const entries = Object.entries(payload).filter(([key]) => key !== '__seed');
  const consumed = new Set<string>();

  const contacts: ContactLink[] = [];
  for (const [key, value] of entries) {
    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }
    const kind = classifyContact(key, value.trim());
    if (kind) {
      contacts.push({ key, value: value.trim(), kind });
      consumed.add(key);
    }
  }

  const titleKey = TITLE_KEYS.find(
    (key) => typeof payload[key] === 'string' && String(payload[key]).trim(),
  );
  const summaryKey = SUBTITLE_KEYS.find(
    (key) => typeof payload[key] === 'string' && String(payload[key]).trim(),
  );
  if (titleKey) {
    consumed.add(titleKey);
  }

  const message =
    summaryKey && !consumed.has(summaryKey) ? String(payload[summaryKey]).trim() : undefined;
  if (summaryKey) {
    consumed.add(summaryKey);
  }

  return {
    title: titleKey ? String(payload[titleKey]).trim() : TYPE_META[submission.type].label,
    message,
    contacts,
    details: entries.filter(([key]) => !consumed.has(key)),
  };
};

/** Quick-action chip for an email address, phone number, or URL found in the payload. */
const ContactChip = ({ contact }: { contact: ContactLink }): JSX.Element => {
  const theme = useTheme();
  const external = contact.kind === 'link';
  return (
    <Chip
      component="a"
      href={contactHref(contact)}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      clickable
      size="small"
      variant="outlined"
      icon={CONTACT_ICON[contact.kind]}
      label={contact.value}
      sx={{
        maxWidth: { xs: '100%', sm: 300 },
        borderColor: alpha(theme.palette.primary.main, 0.28),
        fontWeight: 500,
        '& .MuiChip-label': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        },
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.07),
        },
      }}
    />
  );
};

/** Tinted panel that previews the submission's message / summary line. */
const MessagePanel = ({
  message,
  accentColor,
}: {
  message: string;
  accentColor: string;
}): JSX.Element => (
  <Box
    sx={{
      mt: 2,
      px: 2,
      py: 1.5,
      borderRadius: 2,
      bgcolor: alpha(accentColor, 0.06),
      border: `1px solid ${alpha(accentColor, 0.16)}`,
    }}
  >
    <Typography
      variant="body2"
      sx={{
        lineHeight: 1.65,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {message}
    </Typography>
  </Box>
);

/** Two-column label/value grid for payload fields not surfaced elsewhere. */
const DetailsGrid = ({ details }: { details: [string, unknown][] }): JSX.Element => {
  const theme = useTheme();
  return (
    <Box
      component="div"
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
      {details.map(([key, value]) => (
        <InformationItem key={key} label={humanizeKey(key)}>
          {typeof value === 'string' && URL_VALUE_RE.test(value) ? (
            <Link href={value} target="_blank" rel="noopener noreferrer">
              {value}
            </Link>
          ) : (
            String(value)
          )}
        </InformationItem>
      ))}
    </Box>
  );
};

const SubmissionActions = ({ submission }: { submission: Submission }): JSX.Element => {
  const navigate = useNavigate();
  return (
    <RecordActions
      record={submission as unknown as Record<string, unknown>}
      resource="submissions"
      endpoint="/admin/submissions"
      deletable
      onView={() => void navigate(`/submissions/records/${submission.id}`)}
      onEdit={() => void navigate(`/submissions/records/${submission.id}/edit`)}
    />
  );
};

const SubmissionCard = ({ submission }: { submission: Submission }): JSX.Element => {
  const theme = useTheme();

  const meta = TYPE_META[submission.type];
  const accentColor = meta.accent(theme);
  const isNew = submission.status === SubmissionStatus.New;
  const tone = STATUS_TONE[submission.status];
  const model = buildCardModel(submission);

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
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 44,
                height: 44,
                color: 'text.secondary',
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
                  title={model.title}
                  sx={{ fontWeight: 700, lineHeight: 1.3, minWidth: 0 }}
                >
                  {model.title}
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
                    color: 'text.secondary',
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
              title={formatUtcDate(submission.createdAt, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}
            >
              {relativeTime(submission.createdAt)}
            </Typography>
            <SubmissionStatusSelect id={submission.id} status={submission.status} />
          </Stack>
        </Stack>

        {model.message && <MessagePanel message={model.message} accentColor={accentColor} />}

        {model.contacts.length > 0 && (
          <Stack direction="row" sx={{ mt: 1.75, flexWrap: 'wrap', gap: 1 }}>
            {model.contacts.map((contact) => (
              <ContactChip key={contact.key} contact={contact} />
            ))}
          </Stack>
        )}

        {model.details.length > 0 && <DetailsGrid details={model.details} />}
        <SubmissionActions submission={submission} />
      </Box>
    </Card>
  );
};

/**
 * The loading shape of a SubmissionCard.
 *
 * Built from that card's own padding, avatar and rows rather than a fixed
 * height, and repeated PAGE_SIZE times, because the list that replaces it is a
 * full page of cards — not the four the generic list skeleton drew.
 */
const SubmissionCardSkeleton = (): JSX.Element => (
  <Card variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
    <Box sx={{ pl: 3, pr: 2.5, py: 2.25 }}>
      <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
        <Stack
          direction="row"
          spacing={1.75}
          alignItems="flex-start"
          sx={{ minWidth: 0, flexGrow: 1 }}
        >
          <Skeleton
            variant="rounded"
            width={44}
            height={44}
            sx={{ borderRadius: 2, flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Skeleton variant="text" width="45%" sx={{ fontSize: '1rem' }} />
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Skeleton variant="rounded" width={76} height={22} sx={{ borderRadius: 10 }} />
              <Skeleton variant="rounded" width={58} height={22} sx={{ borderRadius: 10 }} />
            </Stack>
          </Box>
        </Stack>
        <Stack spacing={1} alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <Skeleton variant="text" width={64} sx={{ fontSize: '0.75rem' }} />
          <Skeleton variant="rounded" width={116} height={32} sx={{ borderRadius: 1.5 }} />
        </Stack>
      </Stack>
      <Skeleton variant="rounded" height={62} sx={{ mt: 1.75, borderRadius: 2 }} />
      <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
        <Skeleton variant="rounded" width={132} height={28} sx={{ borderRadius: 10 }} />
        <Skeleton variant="rounded" width={104} height={28} sx={{ borderRadius: 10 }} />
      </Stack>
    </Box>
  </Card>
);

const PAGE_SIZE = 8;

const tableColumns: GridColDef[] = [
  {
    field: 'actions',
    headerName: 'Actions',
    width: 220,
    sortable: false,
    renderCell: (params) => <SubmissionActions submission={params.row as Submission} />,
  },
  {
    field: 'type',
    headerName: 'Type',
    width: 130,
    renderCell: (params) => (
      <Chip size="small" label={TYPE_META[params.value as Submission['type']].label} />
    ),
  },
  {
    field: 'title',
    headerName: 'From',
    flex: 1,
    minWidth: 200,
    valueGetter: (_value, row) => pick((row as Submission).payload, TITLE_KEYS) ?? '—',
  },
  {
    field: 'summary',
    headerName: 'Summary',
    flex: 1,
    minWidth: 220,
    sortable: false,
    valueGetter: (_value, row) => pick((row as Submission).payload, SUBTITLE_KEYS) ?? '—',
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 170,
    renderCell: (params) => (
      <SubmissionStatusSelect
        id={String(params.row.id)}
        status={params.value as SubmissionStatus}
      />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Received',
    width: 170,
    renderCell: (params) => formatUtcDate(String(params.row.createdAt)),
  },
];

const SubmissionsEmpty = ({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}): JSX.Element => (
  <Box
    sx={{
      bgcolor: 'background.paper',
      borderRadius: 3,
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
          : 'Contact, partnership, volunteer, and job enquiries from the website will land here.'
      }
      primaryAction={
        hasFilters
          ? { label: 'Clear filters', onClick: onClear, icon: <FilterAltOffIcon /> }
          : undefined
      }
    />
  </Box>
);

interface SubmissionsListProps {
  view: string;
  isLoading: boolean;
  filtered: Submission[];
  paged: Submission[];
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  tableColumns: GridColDef[];
  hasFilters: boolean;
  onClearFilters: () => void;
}

/** Table or card rendering of the current result set, with its own paging. */
const SubmissionsList = ({
  view,
  isLoading,
  filtered,
  paged,
  pageCount,
  currentPage,
  onPageChange,
  tableColumns,
  hasFilters,
  onClearFilters,
}: SubmissionsListProps): JSX.Element => {
  if (view === 'table') {
    return (
      <DataTable
        rows={filtered}
        columns={tableColumns}
        loading={isLoading}
        searchable={false}
        empty={<SubmissionsEmpty hasFilters={hasFilters} onClear={onClearFilters} />}
      />
    );
  }
  if (isLoading) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <SubmissionCardSkeleton key={index} />
        ))}
      </Stack>
    );
  }
  if (filtered.length === 0) {
    return <SubmissionsEmpty hasFilters={hasFilters} onClear={onClearFilters} />;
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
            onChange={(_event, value) => onPageChange(value)}
            color="primary"
            shape="rounded"
          />
        </Stack>
      )}
    </Stack>
  );
};

/** Resolve the page's identity and locked type from the optional route slug. */
const resolveInbox = (
  inbox: string | undefined,
): {
  isScoped: boolean;
  lockedType?: Submission['type'];
  title: string;
  description: string;
} => {
  const scoped = inbox ? INBOXES[inbox] : undefined;
  return {
    isScoped: Boolean(scoped),
    lockedType: scoped?.type,
    title: scoped?.title ?? 'Submissions',
    description:
      scoped?.description ?? 'Contact, partnership, volunteer, and job enquiries from the website.',
  };
};

/** Free-text search across a submission's type, status and payload values. */
const matchesTerm = (submission: Submission, term: string): boolean =>
  [
    submission.type,
    submission.status,
    ...Object.values(submission.payload).filter(
      (value): value is string => typeof value === 'string',
    ),
  ]
    .join(' ')
    .toLowerCase()
    .includes(term);

const Submissions = (): JSX.Element => {
  const { inbox } = useParams();
  const { isScoped, lockedType, title, description } = resolveInbox(inbox);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useViewMode('submissions');
  // A dedicated inbox locks the type; the combined view keeps the dropdown.
  const { data, isLoading, isError, refetch } = useSubmissions({
    type: lockedType ?? type,
    status,
  });
  const submissions = data?.items ?? [];
  const hasFilters = Boolean((!isScoped && type) || status || search);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? submissions.filter((submission) => matchesTerm(submission, term))
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

  return (
    <>
      <PageHeader
        icon={<InboxOutlinedIcon />}
        title={title}
        description={description}
        count={data?.total}
        help={pageGuides.Submissions}
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
          sx={{ minWidth: 160, display: isScoped ? 'none' : undefined }}
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
        <Box sx={{ ml: { sm: 'auto' } }}>
          <ViewToggle value={view} onChange={setView} />
        </Box>
      </Stack>

      {isError && (
        <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>
          Submissions could not be loaded.
        </Alert>
      )}
      <SubmissionsList
        view={view}
        isLoading={isLoading}
        filtered={filtered}
        paged={paged}
        pageCount={pageCount}
        currentPage={currentPage}
        onPageChange={setPage}
        tableColumns={tableColumns}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />
    </>
  );
};

export default Submissions;

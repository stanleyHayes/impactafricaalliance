import type { AuditAction, AuditChange, AuditEvent, Paginated } from '@iaa/shared';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { api } from '../../lib/api-client';
import { formatInstant } from '../../lib/forms';
import { initials } from '../../lib/initials';
import { ServerPagination, usePageParam } from '../data/ServerPagination';
import { EmptyState } from '../EmptyState';

/** Entries per page. Enough to cover a busy week on one record without a long scroll. */
const PAGE_SIZE = 20;

const ACTION_LABELS: Record<AuditAction, string> = {
  created: 'Created',
  updated: 'Edited',
  'status-changed': 'Status changed',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  archived: 'Archived',
  restored: 'Restored',
  deleted: 'Deleted',
  published: 'Published',
  unpublished: 'Unpublished',
  commented: 'Commented',
  reviewed: 'Reviewed',
  submitted: 'Submitted',
  'media-added': 'Photo added',
  'media-removed': 'Photo removed',
  'document-added': 'Document added',
  'document-removed': 'Document removed',
};

// The trail stores actions as plain text so a newer API can add one; an
// action this dashboard has no label for still reads, from its own words.
const actionLabel = (action: string): string => {
  const known = (ACTION_LABELS as Record<string, string | undefined>)[action];
  if (known) return known;
  const words = action.replace(/-/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/** `dueDate` reads as "Due date". */
const fieldLabel = (field: string): string => {
  const words = field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/** On the 12-hour clock the rest of the console uses: "27 Sept 2026, 4:48 pm". */
const absoluteTime = (iso: string): string => formatInstant(iso);

const RELATIVE = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "5 minutes ago", "yesterday", "3 days ago". Null beyond a week, where a
 * date says more than a count of days does.
 */
export const relativeTime = (iso: string, now: number = Date.now()): string | null => {
  const elapsed = now - new Date(iso).getTime();
  if (Number.isNaN(elapsed) || elapsed >= 7 * DAY) return null;
  // Clocks drift a little; a moment in the future is still "just now".
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return RELATIVE.format(-Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return RELATIVE.format(-Math.floor(elapsed / HOUR), 'hour');
  return RELATIVE.format(-Math.floor(elapsed / DAY), 'day');
};

/** How a stored value reads in the log: the value itself unless the caller knows better. */
export type ChangeValueFormatter = (field: string, value: string) => string;

const asStored: ChangeValueFormatter = (_field, value) => value;

const ChangeList = ({
  changes,
  formatValue,
}: {
  changes: AuditChange[];
  formatValue: ChangeValueFormatter;
}): JSX.Element => {
  const shown = (field: string, value: string | null | undefined): string =>
    value ? formatValue(field, value) : 'empty';
  return (
    <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.25, display: 'grid', gap: 0.5 }}>
      {changes.map((change) => (
        <Typography key={change.field} component="li" variant="body2" color="text.secondary">
          <Box component="span" sx={{ fontWeight: 650, color: 'text.primary' }}>
            {fieldLabel(change.field)}
          </Box>
          {change.from !== undefined || change.to !== undefined ? (
            <>
              {': '}
              {shown(change.field, change.from)} → {shown(change.field, change.to)}
            </>
          ) : null}
        </Typography>
      ))}
    </Box>
  );
};

const EntryTime = ({ at }: { at: string }): JSX.Element => {
  const relative = relativeTime(at);
  const absolute = absoluteTime(at);
  return (
    <Typography variant="caption" color="text.secondary" component="p">
      <Box component="time" dateTime={at} title={absolute}>
        {relative ? `${relative} · ${absolute}` : absolute}
      </Box>
    </Typography>
  );
};

const Entry = ({
  event,
  last,
  formatValue,
}: {
  event: AuditEvent;
  last: boolean;
  formatValue: ChangeValueFormatter;
}): JSX.Element => {
  const who = event.actor?.name ?? event.actorEmail ?? 'Someone';
  return (
    <Box
      component="li"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '36px minmax(0, 1fr)',
        gap: 1.5,
        pb: last ? 0 : 2.5,
        // The thread joining one entry to the next, behind the avatars.
        '&::before': last
          ? undefined
          : {
              content: '""',
              position: 'absolute',
              left: 17.5,
              top: 40,
              bottom: 4,
              width: '1px',
              bgcolor: 'divider',
            },
      }}
    >
      <Avatar
        aria-hidden
        sx={{
          width: 36,
          height: 36,
          fontSize: '0.8rem',
          fontWeight: 750,
          color: 'text.primary',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
        }}
      >
        {initials(who)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {who}
          </Typography>
          <Chip size="small" variant="outlined" label={actionLabel(event.action)} />
        </Stack>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {event.summary}
        </Typography>
        {event.changes && event.changes.length > 0 && (
          <ChangeList changes={event.changes} formatValue={formatValue} />
        )}
        <Box sx={{ mt: 0.75 }}>
          <EntryTime at={event.at} />
        </Box>
      </Box>
    </Box>
  );
};

const TimelineSkeleton = (): JSX.Element => (
  <Stack spacing={2.5} aria-hidden>
    {Array.from({ length: 4 }, (_, index) => (
      <Stack key={index} direction="row" spacing={1.5}>
        <Skeleton variant="circular" width={36} height={36} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton width="40%" />
          <Skeleton width="75%" />
          <Skeleton width="25%" />
        </Box>
      </Stack>
    ))}
  </Stack>
);

export interface ActivityTimelineProps {
  /** The module's activity endpoint, such as `/admin/projects/<id>/activity`. */
  endpoint: string;
  /** Cache key for this record's activity, such as `['projects', id, 'activity']`. The page is appended. */
  queryKey: readonly unknown[];
  /**
   * The search parameter that holds the page. Distinct from `page` so a
   * timeline inside a drawer does not move the list behind it.
   */
  pageParam?: string;
  /**
   * Turns a stored value into the words the screens use, so a status change
   * reads "Planned → Active" under a summary that says the same, rather than
   * "planned → active". Values it does not know are shown as stored.
   */
  formatValue?: ChangeValueFormatter;
}

/**
 * A record's activity log: who did what, and when, newest first.
 *
 * Read through each module's own endpoint, so seeing the log needs the same
 * permission as seeing the record. Paged by the API; the page sits in the
 * address so Back returns to it.
 */
export const ActivityTimeline = ({
  endpoint,
  queryKey,
  pageParam = 'activityPage',
  formatValue = asStored,
}: ActivityTimelineProps): JSX.Element => {
  const page = usePageParam(pageParam);
  const listRef = useRef<HTMLOListElement | null>(null);
  const separator = endpoint.includes('?') ? '&' : '?';
  const recordKey = JSON.stringify(queryKey);
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () =>
      api.get<Paginated<AuditEvent>>(`${endpoint}${separator}page=${page}&pageSize=${PAGE_SIZE}`),
    // The current page stays on screen while the next one loads, so the list
    // that took focus on the page change is still there to hold it. Only for
    // the same record: a drawer moving to another task must not show the last
    // task's log in the meantime.
    placeholderData: (previous, previousQuery) =>
      previousQuery && JSON.stringify(previousQuery.queryKey.slice(0, -1)) === recordKey
        ? previous
        : undefined,
  });

  if (isPending) return <TimelineSkeleton />;

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void refetch()} disabled={isFetching}>
            Retry
          </Button>
        }
      >
        The activity for this record could not be loaded.
      </Alert>
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        compact
        icon={<HistoryRoundedIcon />}
        title="No activity recorded yet"
        description="Changes to this record will be listed here, with who made them and when."
      />
    );
  }

  return (
    <Box>
      <Box
        component="ol"
        ref={listRef}
        tabIndex={-1}
        aria-label="Activity"
        sx={{ listStyle: 'none', m: 0, p: 0, '&:focus-visible': { outline: 'none' } }}
      >
        {data.items.map((event, index) => (
          <Entry
            key={event.id}
            event={event}
            last={index === data.items.length - 1}
            formatValue={formatValue}
          />
        ))}
      </Box>
      <ServerPagination
        totalPages={data.totalPages}
        param={pageParam}
        focusRef={listRef}
        ariaLabel="Activity pages"
      />
    </Box>
  );
};

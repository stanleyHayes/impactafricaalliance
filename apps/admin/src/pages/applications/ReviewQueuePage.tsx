import type { ApplicationListItem } from '@iaa/shared';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import {
  ApplicationCard,
  ApplicationListSkeleton,
} from '../../components/applications/ApplicationList';
import { relativeTime } from '../../components/audit/ActivityTimeline';
import { ServerPagination, usePageParam } from '../../components/data/ServerPagination';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { useApplications, useChangeApplicationStatus } from '../../lib/applications';
import { formatInstant } from '../../lib/forms';
import { pageGuides } from '../../lib/page-guides';

const PAGE_SIZE = 12;

/** How long an application has been waiting, in words. */
const waiting = (iso: string): string => {
  const relative = relativeTime(iso);
  return relative ? `Sent ${relative}` : `Sent ${formatInstant(iso)}`;
};

/** Open it, or, for a new one, say that someone has started on it. */
const QuickActions = ({ item }: { item: ApplicationListItem }): JSX.Element => {
  const can = useCan();
  const change = useChangeApplicationStatus();
  const canStart = item.status === 'submitted' && can('update', 'applications');
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap', rowGap: 1 }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 120 }}>
        {waiting(item.submittedAt)}
      </Typography>
      {canStart && (
        <Button
          size="small"
          startIcon={<PlayArrowRoundedIcon />}
          onClick={() => change.mutate({ id: item.id, status: 'under-review' })}
          disabled={change.isPending}
        >
          {change.isPending ? 'Starting…' : 'Start review'}
        </Button>
      )}
      <Button
        size="small"
        variant="contained"
        component={RouterLink}
        to={`/applications/${item.id}`}
        startIcon={<OpenInNewRoundedIcon />}
      >
        Open
      </Button>
      {change.isError && (
        <Typography variant="caption" color="error" sx={{ width: '100%' }}>
          {change.error.message || 'The status could not be changed.'}
        </Typography>
      )}
    </Stack>
  );
};

/**
 * Applications that still need a decision (plan §4.3): new ones and those
 * under review, oldest first, so nobody waits longest for being early.
 */
const ReviewQueuePage = (): JSX.Element => {
  const page = usePageParam();
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useApplications({
    statuses: 'submitted,under-review',
    sort: 'submitted',
    order: 'asc',
    page,
    pageSize: PAGE_SIZE,
  });

  const body = (): JSX.Element => {
    if (query.isPending) return <ApplicationListSkeleton rows={4} />;
    if (query.isError) {
      return (
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          {query.error.message || 'The review queue could not be loaded.'}
        </Alert>
      );
    }
    if (query.data.items.length === 0) {
      return (
        <EmptyState
          icon={<TaskAltRoundedIcon />}
          title="Nothing waiting"
          description="New applications, and those someone has started reviewing, appear here oldest first until they are decided."
        />
      );
    }
    return (
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {query.data.items.map((item) => (
          <ApplicationCard key={item.id} item={item} footer={<QuickActions item={item} />} />
        ))}
      </Box>
    );
  };

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Applications that still need a decision: new ones and those under review, oldest first."
        icon={<FactCheckIcon />}
        help={pageGuides['review-queue']}
        count={query.data?.total}
      />
      <Typography
        ref={heading}
        tabIndex={-1}
        component="h2"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        Waiting for a decision
      </Typography>
      {body()}
      <ServerPagination
        totalPages={query.data?.totalPages ?? 1}
        focusRef={heading}
        ariaLabel="Review queue pages"
      />
    </>
  );
};

export default ReviewQueuePage;

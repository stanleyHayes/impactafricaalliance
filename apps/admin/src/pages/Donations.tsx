import {
  DONATION_CURRENCIES,
  DONATION_FREQUENCIES,
  DONATION_STATUSES,
  formatMoney,
  PAYMENT_PROVIDERS,
  sumByCurrency,
} from '@iaa/shared';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';
import { useMemo } from 'react';

import { DataTable, type DataTableFilter } from '../components/data/DataTable';
import { RecordActions } from '../components/data/RecordActions';
import { useViewMode } from '../components/data/useViewMode';
import { ViewToggle } from '../components/data/ViewToggle';
import { DotList } from '../components/DotList';
import { EmptyState } from '../components/EmptyState';
import { InformationItem } from '../components/InformationItem';
import { PageHeader } from '../components/PageHeader';
import { useDonations } from '../lib/admin-hooks';
import { formatUtcDate } from '../lib/date';
import { readDonationRow } from '../lib/donations';
import { pageGuides } from '../lib/page-guides';
import { skinned, surfaceSx, tokenVar } from '../theme/surfaces';

const toOptions = (values: readonly string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: value.replace(/-/g, ' ') }));

const filters: DataTableFilter[] = [
  { field: 'status', label: 'Status', options: toOptions(DONATION_STATUSES) },
  { field: 'provider', label: 'Provider', options: toOptions(PAYMENT_PROVIDERS) },
  { field: 'frequency', label: 'Frequency', options: toOptions(DONATION_FREQUENCIES) },
];

/** A row's amount in its own currency: GH₵100, $250. Rows are read by `readDonationRow`. */
const rowAmount = (row: GridRowModel): string => {
  const gift = readDonationRow(row);
  return formatMoney(gift.amount, gift.currency);
};

const statusColor = (status: unknown): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'succeeded') {
    return 'success';
  }
  if (status === 'pending') {
    return 'warning';
  }
  return status === 'failed' ? 'error' : 'default';
};

const columns: GridColDef[] = [
  {
    field: 'createdAt',
    headerName: 'Date',
    width: 170,
    renderCell: (params) =>
      formatUtcDate(String(params.row.createdAt), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,

        minute: '2-digit',
      }),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 120,
    renderCell: (params) => rowAmount(params.row),
  },
  { field: 'provider', headerName: 'Provider', width: 120 },
  { field: 'frequency', headerName: 'Frequency', width: 120 },
  { field: 'donorEmail', headerName: 'Donor', flex: 1, minWidth: 200 },
  {
    field: 'status',
    headerName: 'Status',
    width: 130,
    renderCell: (params) => (
      <Chip size="small" label={String(params.value)} color={statusColor(params.value)} />
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    headerAlign: 'right',
    width: 132,
    sortable: false,
    renderCell: (params) => <RecordActions record={params.row} resource="donations" />,
  },
];

/**
 * A record card under the pointer. Classic edges it in the light primary and
 * lifts it on the third shadow; a skin lifts it on its own card shadow and
 * keeps its material's edge.
 */
const recordCardHoverSx = skinned(
  { '&:hover': { borderColor: 'primary.light', boxShadow: 3 } },
  {
    '&:hover': {
      borderColor: tokenVar('surfaceBorderColor'),
      boxShadow: tokenVar('surfaceHoverShadow'),
    },
  },
);

const SummaryCard = ({
  label,
  value,
}: {
  label: string;
  /** One figure, or several (one per currency) set on a line that wraps between them. */
  value: string | readonly string[];
}): JSX.Element => {
  const theme = useTheme();
  return (
    <Box
      sx={[
        {
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          minWidth: 150,
          p: 2,
          borderRadius: 2.5,
        },
        // Classic edges the tile in a faint primary; a skin makes it one of its cards.
        skinned(
          {
            bgcolor: 'background.paper',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          },
          surfaceSx.card,
        ),
      ]}
    >
      <VolunteerActivismIcon
        aria-hidden
        sx={{
          position: 'absolute',
          right: -12,
          bottom: -12,
          fontSize: 100,
          color: alpha(theme.palette.text.primary, 0.065),
        }}
      />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
        {typeof value === 'string' ? value : <DotList parts={value} />}
      </Typography>
    </Box>
  );
};

const DonationCard = ({ row }: { row: GridRowModel }): JSX.Element => {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={[
        {
          height: '100%',
          borderRadius: 2.5,
          transition: theme.transitions.create(['box-shadow', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
        },
        recordCardHoverSx,
      ]}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h5" sx={{ fontWeight: 800, color: tokenVar('accentText') }}>
            {rowAmount(row)}
          </Typography>
          <Chip
            size="small"
            label={String(row.status ?? 'unknown')}
            color={statusColor(row.status)}
          />
        </Stack>
        <Box sx={{ mt: 2 }}>
          <InformationItem label="Donor email">
            {row.donorEmail ? String(row.donorEmail) : 'Anonymous donor'}
          </InformationItem>
        </Box>
        <Stack direction="row" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            size="small"
            label={String(row.provider ?? '')}
            sx={{ height: 22, textTransform: 'capitalize' }}
          />
          {row.frequency && (
            <Chip
              size="small"
              variant="outlined"
              label={String(row.frequency)}
              sx={{ height: 22, textTransform: 'capitalize' }}
            />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {formatUtcDate(String(row.createdAt), {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            hour12: true,

            minute: '2-digit',
          })}
        </Typography>
        <RecordActions record={row} resource="donations" />
      </Box>
    </Card>
  );
};

const Donations = (): JSX.Element => {
  const { data, isLoading } = useDonations();
  // Read every row in today's shape: an API from before currencies lists dollars only.
  const items = useMemo(() => (data?.items ?? []).map(readDonationRow), [data?.items]);
  const [view, setView] = useViewMode('donations');

  const succeeded = items.filter((donation) => donation.status === 'succeeded');
  // One total per currency: cedis and dollars are never added together. Before any gift
  // succeeds, a zero in the currencies of the gifts listed ("GH₵0"), not a bare count-like 0.
  const raised = sumByCurrency(succeeded);
  const total =
    raised.length > 0
      ? raised.map((entry) => formatMoney(entry.amount, entry.currency))
      : DONATION_CURRENCIES.filter((currency) =>
          items.some((donation) => donation.currency === currency),
        ).map((currency) => formatMoney(0, currency));

  return (
    <>
      <PageHeader
        icon={<VolunteerActivismIcon />}
        title="Donations"
        description="Gifts received through the website, across all payment providers."
        count={data?.total}
        help={pageGuides.Donations}
      />

      {!isLoading && items.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <SummaryCard label="Total raised (succeeded)" value={total} />
          <SummaryCard label="Successful gifts" value={String(succeeded.length)} />
          <SummaryCard label="All records" value={String(data?.total ?? items.length)} />
        </Stack>
      )}

      <DataTable
        rows={items}
        columns={columns}
        loading={isLoading}
        filters={filters}
        view={view}
        toolbarEnd={<ViewToggle value={view} onChange={setView} />}
        renderCard={(row) => <DonationCard row={row} />}
        empty={
          <EmptyState
            icon={<VolunteerActivismIcon />}
            title="No donations yet"
            description="Completed and pending gifts from the website will be recorded here as they come in."
          />
        }
      />
    </>
  );
};

export default Donations;

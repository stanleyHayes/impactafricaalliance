import { DONATION_FREQUENCIES, DONATION_STATUSES, PAYMENT_PROVIDERS } from '@iaa/shared';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';

import { DataTable, type DataTableFilter } from '../components/data/DataTable';
import { RecordActions } from '../components/data/RecordActions';
import { useViewMode } from '../components/data/useViewMode';
import { ViewToggle } from '../components/data/ViewToggle';
import { EmptyState } from '../components/EmptyState';
import { InformationItem } from '../components/InformationItem';
import { PageHeader } from '../components/PageHeader';
import { useDonations } from '../lib/admin-hooks';
import { formatUtcDate } from '../lib/date';
import { pageGuides } from '../lib/page-guides';

const toOptions = (values: readonly string[]): { value: string; label: string }[] =>
  values.map((value) => ({ value, label: value.replace(/-/g, ' ') }));

const filters: DataTableFilter[] = [
  { field: 'status', label: 'Status', options: toOptions(DONATION_STATUSES) },
  { field: 'provider', label: 'Provider', options: toOptions(PAYMENT_PROVIDERS) },
  { field: 'frequency', label: 'Frequency', options: toOptions(DONATION_FREQUENCIES) },
];

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
    field: 'actions',
    headerName: 'Actions',
    width: 160,
    sortable: false,
    renderCell: (params) => <RecordActions record={params.row} resource="donations" />,
  },
  {
    field: 'createdAt',
    headerName: 'Date',
    width: 170,
    renderCell: (params) =>
      formatUtcDate(String(params.row.createdAt), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  {
    field: 'amountUsd',
    headerName: 'Amount',
    width: 120,
    renderCell: (params) => `$${Number(params.value).toLocaleString()}`,
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
];

const SummaryCard = ({ label, value }: { label: string; value: string }): JSX.Element => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 150,
        p: 2,
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
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
        {value}
      </Typography>
    </Box>
  );
};

const DonationCard = ({ row }: { row: GridRowModel }): JSX.Element => {
  const theme = useTheme();
  const amount = Number(row.amountUsd ?? 0);

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 2.5,
        transition: theme.transitions.create(['box-shadow', 'border-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': { borderColor: 'primary.light', boxShadow: theme.shadows[3] },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
            ${amount.toLocaleString()}
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
            hour: '2-digit',
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
  const items = data?.items ?? [];
  const [view, setView] = useViewMode('donations');

  const succeeded = items.filter((donation) => donation.status === 'succeeded');
  const raised = succeeded.reduce((sum, donation) => sum + Number(donation.amountUsd ?? 0), 0);

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
          <SummaryCard label="Total raised (succeeded)" value={`$${raised.toLocaleString()}`} />
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

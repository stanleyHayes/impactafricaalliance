import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '../components/data/DataTable';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useDonations } from '../lib/admin-hooks';

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
    renderCell: (params) => new Date(String(params.row.createdAt)).toLocaleString(),
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
        minWidth: 150,
        p: 2,
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
};

const Donations = (): JSX.Element => {
  const { data, isLoading } = useDonations();
  const items = data?.items ?? [];

  const succeeded = items.filter((donation) => donation.status === 'succeeded');
  const raised = succeeded.reduce((sum, donation) => sum + Number(donation.amountUsd ?? 0), 0);

  return (
    <>
      <PageHeader
        icon={<VolunteerActivismIcon />}
        title="Donations"
        description="Gifts received through the website, across all payment providers."
        count={data?.total}
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

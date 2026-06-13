import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

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

const Donations = (): JSX.Element => {
  const { data, isLoading } = useDonations();
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Donations
      </Typography>
      <Box sx={{ height: 620, bgcolor: 'background.paper', borderRadius: 2, mt: 2 }}>
        <DataGrid
          rows={data?.items ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        />
      </Box>
    </>
  );
};

export default Donations;

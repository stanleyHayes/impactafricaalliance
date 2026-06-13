import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import { useSubscribers } from '../lib/admin-hooks';

const columns: GridColDef[] = [
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 240 },
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
  { field: 'source', headerName: 'Source', width: 180 },
  {
    field: 'createdAt',
    headerName: 'Subscribed',
    width: 180,
    renderCell: (params) => new Date(String(params.row.createdAt)).toLocaleDateString(),
  },
];

const Subscribers = (): JSX.Element => {
  const { data, isLoading } = useSubscribers();
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Newsletter Subscribers
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

export default Subscribers;

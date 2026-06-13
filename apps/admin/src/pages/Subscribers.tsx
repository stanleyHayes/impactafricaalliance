import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '../components/data/DataTable';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
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
      <PageHeader
        icon={<MarkEmailReadIcon />}
        title="Newsletter Subscribers"
        description="People who opted in to hear from Impact Africa Alliance."
        count={data?.total}
      />
      <DataTable
        rows={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        empty={
          <EmptyState
            icon={<MarkEmailReadIcon />}
            title="No subscribers yet"
            description="When visitors sign up through the website newsletter form, they’ll appear here."
          />
        }
      />
    </>
  );
};

export default Subscribers;

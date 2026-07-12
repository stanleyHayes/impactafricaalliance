import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { GridColDef } from '@mui/x-data-grid';

import { DataTable } from '../components/data/DataTable';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useDeleteSubscriber, useSubscribers } from '../lib/admin-hooks';
import { formatUtcDate } from '../lib/date';
import { pageGuides } from '../lib/page-guides';

const columns: GridColDef[] = [
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 240 },
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
  { field: 'source', headerName: 'Source', width: 180 },
  {
    field: 'createdAt',
    headerName: 'Subscribed',
    width: 180,
    renderCell: (params) => formatUtcDate(String(params.row.createdAt)),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 100,
    sortable: false,
    renderCell: (params) => <SubscriberActions subscriberId={String(params.row.id)} />,
  },
];

const SubscriberActions = ({ subscriberId }: { subscriberId: string }): JSX.Element => {
  const deleteSubscriber = useDeleteSubscriber();
  return (
    <Tooltip title="Delete subscriber">
      <IconButton
        color="error"
        size="small"
        disabled={deleteSubscriber.isPending}
        onClick={() => {
          if (window.confirm('Delete this subscriber permanently? This cannot be undone.')) {
            deleteSubscriber.mutate(subscriberId);
          }
        }}
        aria-label="Delete subscriber"
      >
        <DeleteRoundedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

const Subscribers = (): JSX.Element => {
  const { data, isLoading } = useSubscribers();

  return (
    <>
      <PageHeader
        icon={<MarkEmailReadIcon />}
        title="Newsletter Subscribers"
        description="People who opted in to hear from Impact Africa Alliance."
        count={data?.total}
        help={pageGuides.Subscribers}
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

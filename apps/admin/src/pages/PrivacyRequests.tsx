import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';

import { DataTable } from '../components/data/DataTable';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import {
  usePrivacyRequests,
  useUpdatePrivacyRequest,
} from '../lib/admin-hooks';
import { formatUtcDate } from '../lib/date';
import { pageGuides } from '../lib/page-guides';

const TYPE_LABELS: Record<string, string> = {
  access: 'Access',
  rectify: 'Rectify',
  delete: 'Delete',
  restrict: 'Restrict',
  object: 'Object',
};



const StatusCell = ({
  id,
  status,
}: {
  id: string;
  status: string;
}): JSX.Element => {
  const update = useUpdatePrivacyRequest();
  return (
    <FormControl size="small" sx={{ minWidth: 130 }}>
      <InputLabel id={`status-label-${id}`}>Status</InputLabel>
      <Select
        labelId={`status-label-${id}`}
        value={status}
        label="Status"
        disabled={update.isPending}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) =>
          update.mutate({ id, body: { status: event.target.value as never } })
        }
      >
        <MenuItem value="pending">Pending</MenuItem>
        <MenuItem value="verified">Verified</MenuItem>
        <MenuItem value="fulfilled">Fulfilled</MenuItem>
        <MenuItem value="rejected">Rejected</MenuItem>
      </Select>
    </FormControl>
  );
};

const columns: GridColDef[] = [
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 240 },
  {
    field: 'type',
    headerName: 'Request',
    width: 120,
    renderCell: (params) => TYPE_LABELS[String(params.value)] ?? String(params.value),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 160,
    renderCell: (params) => (
      <StatusCell id={String(params.row.id)} status={String(params.value)} />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Received',
    width: 180,
    renderCell: (params) => formatUtcDate(String(params.row.createdAt)),
  },
  { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 200 },
];

const PrivacyRequests = (): JSX.Element => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data, isLoading } = usePrivacyRequests(
    statusFilter === 'all' ? undefined : statusFilter,
  );

  return (
    <>
      <PageHeader
        icon={<PrivacyTipIcon />}
        title="Privacy Requests"
        description="Data subject requests under Ghana Data Protection Act 2012."
        count={data?.total}
        help={pageGuides.PrivacyRequests}
        action={
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="status-filter-label">Filter status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Filter status"
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
              <MenuItem value="fulfilled">Fulfilled</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        }
      />
      <Box sx={{ mb: 2 }}>
        <Chip
          size="small"
          color="info"
          label="For access requests, use the export endpoint in the API to retrieve personal data by email."
        />
      </Box>
      <DataTable
        rows={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        empty={
          <EmptyState
            icon={<PrivacyTipIcon />}
            title="No privacy requests"
            description="Data subject requests submitted through the website will appear here."
          />
        }
      />
    </>
  );
};

export default PrivacyRequests;

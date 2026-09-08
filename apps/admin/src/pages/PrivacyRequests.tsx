import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';

import { DataTable, type DataTableFilter } from '../components/data/DataTable';
import { useViewMode } from '../components/data/useViewMode';
import { ViewToggle } from '../components/data/ViewToggle';
import { EmptyState } from '../components/EmptyState';
import { InformationItem } from '../components/InformationItem';
import { PageHeader } from '../components/PageHeader';
import { usePrivacyRequests, useUpdatePrivacyRequest } from '../lib/admin-hooks';
import { formatUtcDate } from '../lib/date';
import { pageGuides } from '../lib/page-guides';

const TYPE_LABELS: Record<string, string> = {
  access: 'Access',
  rectify: 'Rectify',
  delete: 'Delete',
  restrict: 'Restrict',
  object: 'Object',
};

const filters: DataTableFilter[] = [
  {
    field: 'status',
    label: 'Status',
    options: ['pending', 'verified', 'fulfilled', 'rejected'].map((value) => ({
      value,
      label: value,
    })),
  },
  {
    field: 'type',
    label: 'Request',
    options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
];

const StatusCell = ({ id, status }: { id: string; status: string }): JSX.Element => {
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
        onChange={(event) => update.mutate({ id, body: { status: event.target.value as never } })}
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
    renderCell: (params) => <StatusCell id={String(params.row.id)} status={String(params.value)} />,
  },
  {
    field: 'createdAt',
    headerName: 'Received',
    width: 180,
    renderCell: (params) => formatUtcDate(String(params.row.createdAt)),
  },
  { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 200 },
];

const PrivacyRequestCard = ({ row }: { row: GridRowModel }): JSX.Element => {
  const theme = useTheme();
  const email = String(row.email ?? '');
  const type = String(row.type ?? '');
  const notes = String(row.notes ?? '');

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
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              noWrap
              title={email}
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
            >
              {email}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}
            >
              <Chip
                size="small"
                color="info"
                label={TYPE_LABELS[type] ?? type}
                sx={{ height: 22 }}
              />
              <InformationItem label="Received date">
                {formatUtcDate(String(row.createdAt))}
              </InformationItem>
            </Stack>
          </Box>
          <StatusCell id={String(row.id)} status={String(row.status ?? 'pending')} />
        </Stack>
        {notes && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {notes}
          </Typography>
        )}
      </Box>
    </Card>
  );
};

const PrivacyRequests = (): JSX.Element => {
  const { data, isLoading } = usePrivacyRequests();
  const [view, setView] = useViewMode('privacy-requests');

  return (
    <>
      <PageHeader
        icon={<PrivacyTipIcon />}
        title="Privacy Requests"
        description="Data subject requests under Ghana Data Protection Act 2012."
        count={data?.total}
        help={pageGuides.PrivacyRequests}
      />
      <Alert severity="info" icon={<PrivacyTipIcon />} sx={{ mb: 2.5 }}>
        Verify the requester’s identity before sharing personal information or completing a request.
      </Alert>
      <DataTable
        rows={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        filters={filters}
        view={view}
        toolbarEnd={<ViewToggle value={view} onChange={setView} />}
        renderCard={(row) => <PrivacyRequestCard row={row} />}
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

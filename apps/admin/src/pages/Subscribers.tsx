import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import Avatar from '@mui/material/Avatar';
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
import { EmptyState } from '../components/EmptyState';
import { InformationItem } from '../components/InformationItem';
import { PageHeader } from '../components/PageHeader';
import { useSubscribers } from '../lib/admin-hooks';
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
    align: 'right',
    headerAlign: 'right',
    width: 132,
    sortable: false,
    renderCell: (params) => <SubscriberActions row={params.row} />,
  },
];

const SubscriberActions = ({ row }: { row: GridRowModel }): JSX.Element => (
  <RecordActions
    record={row}
    resource="subscribers"
    endpoint="/admin/submissions/subscribers"
    editableFields={['name', 'source']}
    deletable
  />
);

const SubscriberCard = ({ row }: { row: GridRowModel }): JSX.Element => {
  const theme = useTheme();
  const email = String(row.email ?? '');
  const name = String(row.name ?? '');
  const source = String(row.source ?? '');

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
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              fontWeight: 700,
              color: 'text.primary',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
            }}
          >
            {email.charAt(0).toUpperCase() || '?'}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="subtitle1"
              noWrap
              title={email}
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
            >
              {email}
            </Typography>
            {name && (
              <Typography variant="body2" color="text.secondary" noWrap title={name}>
                {name}
              </Typography>
            )}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}
            >
              {source && (
                <Chip size="small" variant="outlined" label={source} sx={{ height: 22 }} />
              )}
              <InformationItem label="Subscribed">
                {formatUtcDate(String(row.createdAt))}
              </InformationItem>
            </Stack>
          </Box>
        </Stack>
        <Box sx={{ mt: 2 }}>
          <SubscriberActions row={row} />
        </Box>
      </Box>
    </Card>
  );
};

const Subscribers = (): JSX.Element => {
  const { data, isLoading } = useSubscribers();
  const [view, setView] = useViewMode('subscribers');

  const filters = useMemo<DataTableFilter[]>(() => {
    const items = data?.items ?? [];
    const sources = [
      ...new Set(
        items.map((item) => item.source).filter((source): source is string => Boolean(source)),
      ),
    ].sort();
    return [
      {
        field: 'source',
        label: 'Source',
        options: sources.map((source) => ({ value: source, label: source })),
      },
    ];
  }, [data?.items]);

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
        filters={filters}
        view={view}
        toolbarEnd={<ViewToggle value={view} onChange={setView} />}
        renderCard={(row) => <SubscriberCard row={row} />}
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

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { ResourceFormDialog } from '../components/crud/ResourceFormDialog';
import { useDeleteResource, useResourceList } from '../resources/hooks';
import { findResource } from '../resources/registry';
import type { ResourceRow } from '../resources/types';

const ResourcePage = (): JSX.Element => {
  const { resource: key = '' } = useParams();
  const resource = findResource(key);
  const list = useResourceList(key);
  const remove = useDeleteResource(key);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);

  const columns = useMemo<GridColDef[]>(() => {
    if (!resource) {
      return [];
    }
    const actions: GridColDef = {
      field: '__actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      width: 120,
      renderCell: (params) => (
        <Stack direction="row">
          <IconButton
            size="small"
            aria-label="Edit"
            onClick={() => {
              setEditing(params.row as ResourceRow);
              setDialogOpen(true);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Delete"
            color="error"
            onClick={() => {
              if (window.confirm('Delete this item? This cannot be undone.')) {
                remove.mutate(String(params.row.id));
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    };
    return [...resource.columns, actions];
  }, [resource, remove]);

  if (!resource) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">{resource.label}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          New {resource.singular}
        </Button>
      </Stack>

      <Box sx={{ height: 620, bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={list.data?.items ?? []}
          columns={columns}
          loading={list.isLoading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Box>

      <ResourceFormDialog
        resource={resource}
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
};

export default ResourcePage;

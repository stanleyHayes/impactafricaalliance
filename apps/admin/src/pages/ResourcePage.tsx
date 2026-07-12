import { UserRole } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { ResourceDetailDialog } from '../components/crud/ResourceDetailDialog';
import { ResourceFormDialog } from '../components/crud/ResourceFormDialog';
import { DataTable } from '../components/data/DataTable';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { resourceGuide } from '../lib/page-guides';
import { useDeleteResource, useResourceList } from '../resources/hooks';
import { findResource } from '../resources/registry';
import type { ResourceConfig, ResourceRow } from '../resources/types';

interface EmptyCopy {
  icon: JSX.Element;
  title: string;
  description: string;
  primaryLabel: string;
}

/** Derives the page subtitle + empty-state copy, applying sensible fallbacks. */
const deriveCopy = (resource: ResourceConfig): { description: string; empty: EmptyCopy } => {
  const label = resource.label.toLowerCase();
  const singular = resource.singular.toLowerCase();
  return {
    description: resource.description ?? `Manage ${label}.`,
    empty: {
      icon: resource.icon ?? <InboxOutlinedIcon />,
      title: resource.emptyTitle ?? `No ${label} yet`,
      description: resource.emptyDescription ?? `Create your first ${singular} to get started.`,
      primaryLabel: resource.key === 'articles' ? 'Write your first article' : `Create ${singular}`,
    },
  };
};

interface RowActionsProps {
  row: ResourceRow;
  canEdit: boolean;
  onView: (row: ResourceRow) => void;
  onEdit: (row: ResourceRow) => void;
  onDelete: (id: string) => void;
}

const tintButtonSx = (tone: 'primary' | 'error') => ({
  color: tone === 'error' ? 'error.main' : 'text.secondary',
  bgcolor: tone === 'error' ? 'rgba(211,47,47,0.06)' : 'alpha(brandColors.forest, 0.06)',
  '&:hover': { bgcolor: tone === 'error' ? 'rgba(211,47,47,0.12)' : 'alpha(brandColors.forest, 0.12)' },
});

/** Per-row view / edit / delete controls. Edit + delete are gated by permission. */
const RowActions = ({ row, canEdit, onView, onEdit, onDelete }: RowActionsProps): JSX.Element => (
  <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ width: '100%' }}>
    <Tooltip title="View">
      <IconButton size="small" aria-label="View" onClick={() => onView(row)} sx={tintButtonSx('primary')}>
        <VisibilityOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    {canEdit && (
      <Tooltip title="Edit">
        <IconButton size="small" aria-label="Edit" onClick={() => onEdit(row)} sx={tintButtonSx('primary')}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
    {canEdit && (
      <Tooltip title="Delete">
        <IconButton
          size="small"
          aria-label="Delete"
          onClick={() => {
            if (window.confirm('Delete this item? This cannot be undone.')) {
              onDelete(String(row.id));
            }
          }}
          sx={tintButtonSx('error')}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
  </Stack>
);

const ResourcePage = (): JSX.Element => {
  const { user } = useAuth();
  const canEdit = user?.role === UserRole.Admin || user?.role === UserRole.Editor;

  const { resource: key = '' } = useParams();
  const resource = findResource(key);
  const list = useResourceList(key);
  const remove = useDeleteResource(key);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [viewing, setViewing] = useState<ResourceRow | null>(null);

  const openCreate = (): void => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: ResourceRow): void => {
    setEditing(row);
    setDialogOpen(true);
  };

  const columns = useMemo<GridColDef[]>(() => {
    if (!resource) {
      return [];
    }
    const actions: GridColDef = {
      field: '__actions',
      headerName: '',
      sortable: false,
      filterable: false,
      width: canEdit ? 132 : 64,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <RowActions
          row={params.row as ResourceRow}
          canEdit={canEdit}
          onView={(row) => setViewing(row)}
          onEdit={openEdit}
          onDelete={(id) => remove.mutate(id)}
        />
      ),
    };
    return [...resource.columns, actions];
  }, [resource, remove, canEdit]);

  if (!resource) {
    return <Navigate to="/" replace />;
  }

  const items = list.data?.items ?? [];
  const { description, empty } = deriveCopy(resource);

  return (
    <>
      <PageHeader
        icon={resource.icon}
        title={resource.label}
        description={description}
        count={list.data?.total}
        help={resourceGuide(resource.label, resource.singular)}
        action={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ borderRadius: 2.5, px: 2.5 }}
            >
              New {resource.singular}
            </Button>
          ) : undefined
        }
      />

      <DataTable
        rows={items}
        columns={columns}
        loading={list.isLoading}
        empty={
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            primaryAction={
              canEdit
                ? { label: empty.primaryLabel, onClick: openCreate, icon: <AddIcon /> }
                : undefined
            }
          />
        }
      />

      <ResourceDetailDialog
        resource={resource}
        open={viewing !== null}
        row={viewing}
        onClose={() => setViewing(null)}
        canEdit={canEdit}
        onEdit={() => {
          const row = viewing;
          setViewing(null);
          setEditing(row);
          setDialogOpen(true);
        }}
      />

      {canEdit && (
        <ResourceFormDialog
          resource={resource}
          open={dialogOpen}
          initial={editing}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
};

export default ResourcePage;

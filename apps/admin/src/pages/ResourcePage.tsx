import { type AdminResource } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import type { GridColDef } from '@mui/x-data-grid';
import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { useCan } from '../auth/useCan';
import { ResourceCard, ResourceRowActions } from '../components/crud/ResourceCard';
import { ResourceDetailDialog } from '../components/crud/ResourceDetailDialog';
import { ResourceFormDialog } from '../components/crud/ResourceFormDialog';
import { DataTable, type DataTableFilter } from '../components/data/DataTable';
import { useViewMode } from '../components/data/useViewMode';
import { ViewToggle } from '../components/data/ViewToggle';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { resourceGuide } from '../lib/page-guides';
import { usesResourceFormPage } from '../resources/form-steps';
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

/** Builds toolbar filters from the resource config: selects + switches. */
const deriveFilters = (resource: ResourceConfig): DataTableFilter[] => {
  const result: DataTableFilter[] = [];
  for (const field of resource.fields) {
    if (field.type === 'select' && field.options && field.options.length > 0) {
      result.push({ field: field.name, label: field.label, options: field.options });
    }
    if (field.type === 'switch') {
      result.push({
        field: field.name,
        label: field.label,
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ],
      });
    }
  }
  return result;
};

const ResourcePage = (): JSX.Element => {
  const can = useCan();

  const { resource: key = '' } = useParams();
  const canEdit = can('update', key as AdminResource);
  const canDelete = can('delete', key as AdminResource);
  const canCreate = can('create', key as AdminResource);
  const navigate = useNavigate();
  const resource = findResource(key);
  const list = useResourceList(key);
  const remove = useDeleteResource(key);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [viewing, setViewing] = useState<ResourceRow | null>(null);
  const [view, setView] = useViewMode(`resource-${key}`);

  const filters = useMemo<DataTableFilter[]>(
    () => (resource ? deriveFilters(resource) : []),
    [resource],
  );

  const openCreate = (): void => {
    if (resource && usesResourceFormPage(resource)) {
      void navigate(`/content/${key}/new`);
      return;
    }
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = useCallback(
    (row: ResourceRow): void => {
      if (resource && usesResourceFormPage(resource)) {
        void navigate(`/content/${key}/${row.id}/edit`);
        return;
      }
      setEditing(row);
      setDialogOpen(true);
    },
    [resource, key, navigate],
  );

  const columns = useMemo<GridColDef[]>(() => {
    if (!resource) {
      return [];
    }
    const actions: GridColDef = {
      field: '__actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <ResourceRowActions
          row={params.row as ResourceRow}
          canEdit={canEdit}
          canDelete={canDelete}
          onView={(row) => setViewing(row)}
          onEdit={openEdit}
          onDelete={(id) => remove.mutate(id)}
        />
      ),
    };
    return [...resource.columns, actions];
  }, [resource, remove, canEdit, canDelete, openEdit]);

  if (!resource || !can('read', key as AdminResource)) {
    return <Navigate to="/" replace />;
  }

  // Captured with a narrowed type so the renderCard closure below type-checks.
  const config = resource;
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
          canCreate ? (
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

      {list.isError && (
        <Alert severity="error" action={<Button onClick={() => void list.refetch()}>Retry</Button>}>
          {list.error.message}
        </Alert>
      )}
      {remove.isError && (
        <Alert severity="error" onClose={() => remove.reset()}>
          {remove.error.message}
        </Alert>
      )}
      <DataTable
        rows={items}
        columns={columns}
        loading={list.isLoading}
        filters={filters}
        view={view}
        toolbarEnd={<ViewToggle value={view} onChange={setView} />}
        renderCard={(row) => (
          <ResourceCard
            resource={config}
            row={row as ResourceRow}
            canEdit={canEdit}
            canDelete={canDelete}
            onView={(cardRow) => setViewing(cardRow)}
            onEdit={openEdit}
            onDelete={(id) => remove.mutate(id)}
          />
        )}
        empty={
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            primaryAction={
              canCreate
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
          if (row) openEdit(row);
        }}
      />

      {(canEdit || canCreate) && !usesResourceFormPage(resource) && (
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

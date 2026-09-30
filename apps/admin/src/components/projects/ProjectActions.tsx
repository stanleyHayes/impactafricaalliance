import {
  PROJECT_STATUS_TRANSITIONS,
  projectRestoreStatus,
  type Project,
  type ProjectStatus,
} from '@iaa/shared';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useId, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { useChangeProjectStatus, useDeleteProject } from '../../lib/projects';
import { PROJECT_STATUS_OPTIONS } from '../../lib/select-options';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

import { statusLabel } from './project-format';

type Pending = 'archive' | 'restore' | 'delete' | null;

/**
 * Where the project can go next. Archive is left out: it has its own button
 * and a confirmation, because it takes the project out of every list.
 */
export const nextStatuses = (status: ProjectStatus): ProjectStatus[] =>
  status === 'archived'
    ? []
    : PROJECT_STATUS_TRANSITIONS[status].filter((next) => next !== 'archived');

const StatusMenu = ({
  project,
  onChange,
  disabled,
}: {
  project: Project;
  onChange: (status: ProjectStatus) => void;
  disabled: boolean;
}): JSX.Element | null => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const choices = PROJECT_STATUS_OPTIONS.filter((option) =>
    nextStatuses(project.status).includes(option.value as ProjectStatus),
  );
  if (choices.length === 0) return null;
  return (
    <>
      <Button
        variant="outlined"
        endIcon={<KeyboardArrowDownRoundedIcon />}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        disabled={disabled}
      >
        Change status
      </Button>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {choices.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => {
              setAnchor(null);
              onChange(option.value as ProjectStatus);
            }}
            sx={{ alignItems: 'flex-start', maxWidth: 360, whiteSpace: 'normal' }}
          >
            <ListItemIcon sx={{ mt: 0.25 }}>{option.icon}</ListItemIcon>
            <ListItemText primary={`Move to ${option.label}`} secondary={option.description} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

interface ActionRights {
  /** Opening the editor: the permission and a staff role, as the route requires. */
  canEdit: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /** Starting a story reads the project and creates a story, so it needs both. */
  canStartStory: boolean;
}

const useActionRights = (): ActionRights => {
  const can = useCan();
  const { user } = useAuth();
  const staff = user?.role === 'admin' || user?.role === 'editor';
  const canUpdate = can('update', 'projects');
  return {
    canEdit: canUpdate && staff,
    canUpdate,
    canDelete: can('delete', 'projects'),
    canStartStory:
      can('read', 'impact-stories') && can('create', 'impact-stories') && can('read', 'projects'),
  };
};

const ActionButtons = ({
  project,
  rights,
  busy,
  onOpen,
  onMove,
}: {
  project: Project;
  rights: ActionRights;
  busy: boolean;
  onOpen: (dialog: Exclude<Pending, null>) => void;
  onMove: (status: ProjectStatus) => void;
}): JSX.Element => {
  const navigate = useNavigate();
  const archived = project.status === 'archived';
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {rights.canEdit && (
        <Button
          component={RouterLink}
          to={`/projects/${project.id}/edit`}
          variant="contained"
          startIcon={<EditOutlinedIcon />}
        >
          Edit
        </Button>
      )}
      {rights.canUpdate && <StatusMenu project={project} onChange={onMove} disabled={busy} />}
      {rights.canUpdate && (
        <Button
          variant={archived ? 'outlined' : 'text'}
          startIcon={archived ? <UnarchiveOutlinedIcon /> : <ArchiveOutlinedIcon />}
          onClick={() => onOpen(archived ? 'restore' : 'archive')}
          disabled={busy}
        >
          {archived ? 'Restore' : 'Archive'}
        </Button>
      )}
      {rights.canStartStory && (
        <Button
          startIcon={<AutoStoriesOutlinedIcon />}
          onClick={() => navigate(`/impact-stories/from-project/${encodeURIComponent(project.id)}`)}
        >
          Create impact story
        </Button>
      )}
      {rights.canDelete && (
        <Button
          color="error"
          startIcon={<DeleteOutlineRoundedIcon />}
          onClick={() => onOpen('delete')}
          disabled={busy}
        >
          Delete
        </Button>
      )}
    </Stack>
  );
};

/**
 * What can be done to a project from its header, each shown only to people
 * allowed to do it: edit, move it along, archive or restore, delete, and
 * start an impact story from it.
 */
export const ProjectActions = ({ project }: { project: Project }): JSX.Element => {
  const navigate = useNavigate();
  const rights = useActionRights();
  const changeStatus = useChangeProjectStatus();
  const remove = useDeleteProject();
  const [pending, setPending] = useState<Pending>(null);
  const restoreTo = projectRestoreStatus(project.archivedFromStatus);
  const statusError = changeStatus.isError ? changeStatus.error.message : null;

  const close = (): void => {
    setPending(null);
    changeStatus.reset();
    remove.reset();
  };

  const move = (status: ProjectStatus, after?: () => void): void => {
    changeStatus.mutate({ id: project.id, status }, { onSuccess: after });
  };

  return (
    <Stack spacing={1.5}>
      <ActionButtons
        project={project}
        rights={rights}
        busy={changeStatus.isPending || remove.isPending}
        onOpen={setPending}
        onMove={(status) => move(status)}
      />
      {statusError !== null && pending === null && (
        <Alert severity="error" onClose={() => changeStatus.reset()}>
          {statusError || 'The status could not be changed. Try again.'}
        </Alert>
      )}

      <ConfirmDialog
        open={pending === 'archive'}
        title="Archive this project?"
        eyebrow="Projects"
        icon={<ArchiveOutlinedIcon />}
        description={
          <>
            <strong>{project.title}</strong> will leave every project list. Its tasks and impact
            stories keep their link to it, and you can restore it at any time.
          </>
        }
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        pending={changeStatus.isPending}
        error={statusError}
        onConfirm={() => move('archived', close)}
        onClose={close}
      />
      <ConfirmDialog
        open={pending === 'restore'}
        title="Restore this project?"
        eyebrow="Projects"
        icon={<UnarchiveOutlinedIcon />}
        description={
          <>
            <strong>{project.title}</strong> returns to the project lists as{' '}
            <strong>{statusLabel(restoreTo)}</strong>
            {project.archivedFromStatus ? ', where it was before it was archived.' : '.'}
          </>
        }
        confirmLabel="Restore"
        pendingLabel="Restoring…"
        pending={changeStatus.isPending}
        error={statusError}
        onConfirm={() => move(restoreTo, close)}
        onClose={close}
      />
      <ConfirmDialog
        open={pending === 'delete'}
        tone="error"
        title="Delete this project?"
        eyebrow="Projects"
        description={
          <>
            <strong>{project.title}</strong> will be deleted for good, with its photos and
            documents. A project that has tasks or impact stories cannot be deleted; archive it
            instead.
          </>
        }
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onConfirm={() =>
          remove.mutate(project.id, { onSuccess: () => navigate('/projects', { replace: true }) })
        }
        onClose={close}
      />
    </Stack>
  );
};

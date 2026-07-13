import { zodResolver } from '@hookform/resolvers/zod';
import { USER_ROLES, createUserSchema, type CreateUserInput, type PublicUser } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import MailOutlineIcon from '@mui/icons-material/MailOutlineOutlined';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { InviteUserDialog } from '../components/auth/InviteUserDialog';
import { UserPermissionsDialog } from '../components/auth/UserPermissionsDialog';
import { DataTable, type DataTableFilter } from '../components/data/DataTable';
import { useViewMode } from '../components/data/useViewMode';
import { ViewToggle } from '../components/data/ViewToggle';
import { DialogFooter, DialogHeader, dialogPaperSx, dialogSectionSx } from '../components/dialogs/DialogShell';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useDeleteUser, useSaveUser, useUsers } from '../lib/admin-hooks';
import { pageGuides } from '../lib/page-guides';

const CreateUserDialog = ({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element => {
  const save = useSaveUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'editor' },
  });

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      { body: values },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    ),
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: dialogPaperSx } }}>
      <DialogHeader
        icon={<PersonAddRoundedIcon />}
        eyebrow="Team"
        title="Create user"
        description="Add a teammate directly with a temporary password."
        onClose={onClose}
      />
      <DialogContent sx={{ bgcolor: 'background.default', py: 3 }}>
        <Stack component="form" id="user-form" spacing={2} onSubmit={onSubmit} sx={dialogSectionSx}>
          <TextField label="Name" error={Boolean(errors.name)} helperText={errors.name?.message} {...register('name')} />
          <TextField
            label="Email"
            type="email"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
          />
          <TextField
            select
            label="Role"
            defaultValue="editor"
            error={Boolean(errors.role)}
            helperText={errors.role?.message}
            {...register('role')}
          >
            {USER_ROLES.map((role) => (
              <MenuItem key={role} value={role} sx={{ textTransform: 'capitalize' }}>
                {role}
              </MenuItem>
            ))}
          </TextField>
          {save.isError && (
            <Alert severity="error">Could not create user. The email may already be in use.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form="user-form"
          variant="contained"
          startIcon={<PersonAddRoundedIcon />}
          disabled={save.isPending}
        >
          {save.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

const permissionSummary = (user: PublicUser): string => {
  const count = user.permissions.length;
  if (count === 0) return 'None';
  return `${count} permission${count === 1 ? '' : 's'}`;
};

const filters: DataTableFilter[] = [
  { field: 'role', label: 'Role', options: USER_ROLES.map((role) => ({ value: role, label: role })) },
  {
    field: 'isActive',
    label: 'Status',
    options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
  },
];

interface UserCardProps {
  user: PublicUser;
  onManage: (user: PublicUser) => void;
  onDelete: (id: string) => void;
}

const UserCard = ({ user, onManage, onDelete }: UserCardProps): JSX.Element => {
  const theme = useTheme();
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        transition: theme.transitions.create(['box-shadow', 'border-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': { borderColor: 'primary.light', boxShadow: theme.shadows[3] },
      }}
    >
      <Box sx={{ p: 2, flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              fontWeight: 700,
              color: 'text.primary',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle1" noWrap title={user.name} sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap title={user.email}>
              {user.email}
            </Typography>
            <Stack direction="row" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip size="small" label={user.role} sx={{ height: 22, textTransform: 'capitalize' }} />
              <Chip
                size="small"
                variant="outlined"
                label={user.isActive ? 'Active' : 'Inactive'}
                color={user.isActive ? 'success' : 'default'}
                sx={{ height: 22 }}
              />
            </Stack>
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Permissions:{' '}
          </Box>
          {permissionSummary(user)}
        </Typography>
      </Box>
      <Divider />
      <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ px: 1.5, py: 0.75 }}>
        <Tooltip title="Manage permissions">
          <IconButton size="small" aria-label="Manage permissions" onClick={() => onManage(user)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete user">
          <IconButton
            size="small"
            aria-label="Delete user"
            onClick={() => {
              if (window.confirm('Delete this user?')) {
                onDelete(user.id);
              }
            }}
            sx={{
              color: 'error.main',
              bgcolor: 'rgba(211,47,47,0.06)',
              '&:hover': { bgcolor: 'rgba(211,47,47,0.12)' },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
};

const Users = (): JSX.Element => {
  const { data: users, isLoading } = useUsers();
  const remove = useDeleteUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [view, setView] = useViewMode('users');

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      renderCell: (params) => (
        <Chip size="small" label={params.value} sx={{ textTransform: 'capitalize' }} />
      ),
    },
    {
      field: 'permissions',
      headerName: 'Permissions',
      width: 140,
      sortable: false,
      renderCell: (params) => <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{permissionSummary(params.row)}</Box>,
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 100,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: '__actions',
      headerName: '',
      width: 120,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Manage permissions">
            <IconButton
              size="small"
              aria-label="Manage permissions"
              onClick={() => setSelectedUser(params.row as PublicUser)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete user">
            <IconButton
              size="small"
              aria-label="Delete user"
              onClick={() => {
                if (window.confirm('Delete this user?')) {
                  remove.mutate(String(params.row.id));
                }
              }}
              sx={{
                color: 'error.main',
                bgcolor: 'rgba(211,47,47,0.06)',
                '&:hover': { bgcolor: 'rgba(211,47,47,0.12)' },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        icon={<GroupsIcon />}
        title="Users"
        description="Administrators and editors with access to this console."
        count={users?.length}
        help={pageGuides.Users}
        action={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{ borderRadius: 2.5, px: 2.5 }}
            >
              Create
            </Button>
            <Button
              variant="contained"
              startIcon={<MailOutlineIcon />}
              onClick={() => setInviteOpen(true)}
              sx={{ borderRadius: 2.5, px: 2.5 }}
            >
              Invite
            </Button>
          </Box>
        }
      />
      {remove.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not delete user. At least one administrator must remain.
        </Alert>
      )}
      <DataTable
        rows={users ?? []}
        columns={columns}
        loading={isLoading}
        filters={filters}
        view={view}
        toolbarEnd={<ViewToggle value={view} onChange={setView} />}
        renderCard={(row) => (
          <UserCard
            user={row as PublicUser}
            onManage={setSelectedUser}
            onDelete={(id) => remove.mutate(id)}
          />
        )}
        empty={
          <EmptyState
            icon={<GroupsIcon />}
            title="No users yet"
            description="Invite teammates to help manage content and review activity."
            primaryAction={{ label: 'Invite user', onClick: () => setInviteOpen(true), icon: <MailOutlineIcon /> }}
          />
        }
      />
      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserPermissionsDialog
        user={selectedUser}
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
};

export default Users;

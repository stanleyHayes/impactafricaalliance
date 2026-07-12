import { zodResolver } from '@hookform/resolvers/zod';
import { USER_ROLES, createUserSchema, type CreateUserInput, type PublicUser } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import MailOutlineIcon from '@mui/icons-material/MailOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { InviteUserDialog } from '../components/auth/InviteUserDialog';
import { UserPermissionsDialog } from '../components/auth/UserPermissionsDialog';
import { DataTable } from '../components/data/DataTable';
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create user</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="user-form" spacing={2} onSubmit={onSubmit} sx={{ pt: 1 }}>
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
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="user-form" variant="contained" disabled={save.isPending}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const permissionSummary = (user: PublicUser): string => {
  const count = user.permissions.length;
  if (count === 0) return 'None';
  return `${count} permission${count === 1 ? '' : 's'}`;
};

const Users = (): JSX.Element => {
  const { data: users, isLoading } = useUsers();
  const remove = useDeleteUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);

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
        height={560}
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

import { zodResolver } from '@hookform/resolvers/zod';
import { USER_ROLES, createUserSchema, type CreateUserInput, type PublicUser } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import Alert from '@mui/material/Alert';
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

import { DataTable } from '../components/data/DataTable';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useDeleteUser, useSaveUser, useUsers } from '../lib/admin-hooks';

const NewUserDialog = ({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element => {
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
      <DialogTitle>New user</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="user-form" spacing={2} onSubmit={onSubmit} sx={{ pt: 1 }}>
          <TextField
            label="Name"
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
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

const Users = (): JSX.Element => {
  const { data: users, isLoading } = useUsers();
  const save = useSaveUser();
  const remove = useDeleteUser();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    {
      field: 'role',
      headerName: 'Role',
      width: 160,
      renderCell: (params) => (
        <TextField
          select
          size="small"
          value={params.row.role}
          onChange={(event) =>
            save.mutate({
              id: String(params.row.id),
              body: { role: event.target.value as PublicUser['role'] },
            })
          }
          variant="standard"
        >
          {USER_ROLES.map((role) => (
            <MenuItem key={role} value={role} sx={{ textTransform: 'capitalize' }}>
              {role}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 110,
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
      width: 80,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
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
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ borderRadius: 2.5, px: 2.5 }}
          >
            New user
          </Button>
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
            primaryAction={{ label: 'Add user', onClick: () => setDialogOpen(true), icon: <AddIcon /> }}
          />
        }
      />
      <NewUserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

export default Users;

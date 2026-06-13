import { zodResolver } from '@hookform/resolvers/zod';
import { USER_ROLES, createUserSchema, type CreateUserInput, type PublicUser } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

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
      renderCell: (params) => (
        <IconButton
          size="small"
          color="error"
          aria-label="Delete user"
          onClick={() => {
            if (window.confirm('Delete this user?')) {
              remove.mutate(String(params.row.id));
            }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Users</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          New user
        </Button>
      </Stack>
      {remove.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not delete user. At least one administrator must remain.
        </Alert>
      )}
      <Box sx={{ height: 560, bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={users ?? []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
        />
      </Box>
      <NewUserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

export default Users;

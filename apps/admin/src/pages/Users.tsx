import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type CreateUserInput, type PublicUser } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
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
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { RequirePermission } from '../auth/RequirePermission';
import { ActionIcon } from '../components/data/ActionIcon';
import { DataTable, type DataTableFilter } from '../components/data/DataTable';
import { RecordActions } from '../components/data/RecordActions';
import { useViewMode } from '../components/data/useViewMode';
import { ViewToggle } from '../components/data/ViewToggle';
import {
  DialogFooter,
  DialogHeader,
  dialogPaperSx,
  dialogSectionSx,
} from '../components/dialogs/DialogShell';
import { EmptyState } from '../components/EmptyState';
import { OptionSelect } from '../components/fields/OptionSelect';
import { PageHeader } from '../components/PageHeader';
import { useSaveUser, useUsers } from '../lib/admin-hooks';
import { pageGuides } from '../lib/page-guides';
import { ROLE_OPTIONS } from '../lib/select-options';

const CreateUserDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element => {
  const save = useSaveUser();
  const {
    register,
    control,
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogHeader
        icon={<PersonAddRoundedIcon />}
        eyebrow="Team"
        title="Create user"
        description="Add a teammate directly with a temporary password."
        onClose={onClose}
      />
      <DialogContent sx={{ bgcolor: 'background.default', py: 3 }}>
        <Stack component="form" id="user-form" spacing={2} onSubmit={onSubmit} sx={dialogSectionSx}>
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
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <OptionSelect
                label="Role"
                options={ROLE_OPTIONS}
                value={field.value ?? 'editor'}
                onChange={field.onChange}
                error={errors.role?.message}
              />
            )}
          />
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
  { field: 'role', label: 'Role', options: ROLE_OPTIONS },
  {
    field: 'isActive',
    label: 'Status',
    options: [
      {
        value: 'true',
        label: 'Active',
        description: 'Can sign in and work.',
        icon: <CheckCircleOutlineRoundedIcon />,
      },
      {
        value: 'false',
        label: 'Inactive',
        description: 'Suspended — kept for the record, but cannot sign in.',
        icon: <BlockRoundedIcon />,
      },
    ],
  },
];

const UserActions = ({
  user,
  onManage,
}: {
  user: PublicUser;
  onManage: (user: PublicUser) => void;
}): JSX.Element => (
  <Stack
    direction="row"
    spacing={0.5}
    sx={{ justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}
  >
    <RecordActions
      record={user as unknown as Record<string, unknown>}
      resource="users"
      endpoint="/admin/users"
      editableFields={['name', 'isActive']}
      deletable
    />
    <RequirePermission resource="users" action="update">
      <ActionIcon label="Permissions" onClick={() => onManage(user)}>
        <AdminPanelSettingsOutlinedIcon fontSize="small" />
      </ActionIcon>
    </RequirePermission>
  </Stack>
);

interface UserCardProps {
  user: PublicUser;
  onManage: (user: PublicUser) => void;
}

const UserCard = ({ user, onManage }: UserCardProps): JSX.Element => {
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
            <Typography
              variant="subtitle1"
              noWrap
              title={user.name}
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
            >
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap title={user.email}>
              {user.email}
            </Typography>
            <Stack direction="row" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                size="small"
                label={user.role}
                sx={{ height: 22, textTransform: 'capitalize' }}
              />
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
      <UserActions user={user} onManage={onManage} />
    </Card>
  );
};

const Users = (): JSX.Element => {
  const navigate = useNavigate();
  const { data: users, isLoading } = useUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useViewMode('users');
  const manageUser = (user: PublicUser): void => {
    navigate(`/users/${user.id}/permissions`);
  };

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
      renderCell: (params) => (
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {permissionSummary(params.row)}
        </Box>
      ),
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
      headerName: 'Actions',
      width: 170,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => <UserActions user={params.row as PublicUser} onManage={manageUser} />,
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
          <RequirePermission resource="users" action="create">
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
                component={RouterLink}
                to="/users/invite"
                sx={{ borderRadius: 2.5, px: 2.5 }}
              >
                Invite
              </Button>
            </Box>
          </RequirePermission>
        }
      />
      <DataTable
        rows={users ?? []}
        columns={columns}
        loading={isLoading}
        filters={filters}
        view={view}
        toolbarEnd={<ViewToggle value={view} onChange={setView} />}
        renderCard={(row) => <UserCard user={row as PublicUser} onManage={manageUser} />}
        empty={
          <EmptyState
            icon={<GroupsIcon />}
            title="No users yet"
            description="Invite teammates to help manage content and review activity."
            primaryAction={{
              label: 'Invite user',
              onClick: () => navigate('/users/invite'),
              icon: <MailOutlineIcon />,
            }}
          />
        }
      />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};

export default Users;

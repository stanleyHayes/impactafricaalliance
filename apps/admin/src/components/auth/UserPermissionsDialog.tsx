import { USER_ROLES, UserRole, type PublicUser, type UpdateUserPermissionsInput, type UserRole as UserRoleType } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';

import { useUpdateUserPermissions } from '../../lib/admin-hooks';

import { PermissionMatrix } from './PermissionMatrix';

interface UserPermissionsDialogProps {
  user: PublicUser | null;
  open: boolean;
  onClose: () => void;
}

export const UserPermissionsDialog = ({ user, open, onClose }: UserPermissionsDialogProps): JSX.Element => {
  const update = useUpdateUserPermissions();
  const [role, setRole] = useState<UserRoleType>(UserRole.Editor);
  const [permissions, setPermissions] = useState<PublicUser['permissions']>([]);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setPermissions(user.permissions);
    }
  }, [user]);

  const onSubmit = (): void => {
    if (!user) return;
    const body: UpdateUserPermissionsInput = { role, permissions };
    update.mutate(
      { id: user.id, body },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit permissions</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            select
            label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRoleType)}
          >
            {USER_ROLES.map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <PermissionMatrix role={role} permissions={permissions} onChange={setPermissions} />
          {update.isError && (
            <Alert severity="error">Could not update permissions. At least one administrator must remain.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={update.isPending}>
          Save permissions
        </Button>
      </DialogActions>
    </Dialog>
  );
};

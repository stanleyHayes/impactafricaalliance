import { USER_ROLES, UserRole, type PublicUser, type UpdateUserPermissionsInput, type UserRole as UserRoleType } from '@iaa/shared';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { useUpdateUserPermissions } from '../../lib/admin-hooks';
import { DialogFooter, DialogHeader, dialogPaperSx, dialogSectionSx } from '../dialogs/DialogShell';

import { PermissionMatrix } from './PermissionMatrix';

interface UserPermissionsDialogProps {
  user: PublicUser | null;
  open: boolean;
  onClose: () => void;
}

/** Identity strip showing whose permissions are being edited. */
const UserIdentity = ({ user }: { user: PublicUser }): JSX.Element => {
  const theme = useTheme();
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={dialogSectionSx}>
      <Avatar
        sx={{
          width: 44,
          height: 44,
          fontWeight: 700,
          color: 'text.primary',
          bgcolor: alpha(theme.palette.primary.main, 0.12),
        }}
      >
        {user.name.charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {user.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {user.email}
        </Typography>
      </Box>
      <Chip
        size="small"
        label={user.isActive ? 'Active' : 'Inactive'}
        color={user.isActive ? 'success' : 'default'}
        variant="outlined"
      />
    </Stack>
  );
};

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
    update.mutate({ id: user.id, body }, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: dialogPaperSx } }}>
      <DialogHeader
        icon={<AdminPanelSettingsRoundedIcon />}
        eyebrow="Access control"
        title="Edit permissions"
        description="Adjust this teammate's role and what they can manage."
        onClose={onClose}
      />
      <DialogContent sx={{ bgcolor: 'background.default', py: 3 }}>
        <Stack spacing={2.5}>
          {user && <UserIdentity user={user} />}
          <Stack spacing={2.5} sx={dialogSectionSx}>
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
          </Stack>
          {update.isError && (
            <Alert severity="error">Could not update permissions. At least one administrator must remain.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          onClick={onSubmit}
          disabled={update.isPending}
        >
          {update.isPending ? 'Saving…' : 'Save permissions'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

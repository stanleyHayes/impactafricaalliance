import { zodResolver } from '@hookform/resolvers/zod';
import { USER_ROLES, inviteUserSchema, type InviteUserInput, type UserRole } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useInviteUser } from '../../lib/admin-hooks';

import { PermissionMatrix } from './PermissionMatrix';

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export const InviteUserDialog = ({ open, onClose }: InviteUserDialogProps): JSX.Element => {
  const invite = useInviteUser();
  const [customize, setCustomize] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { role: 'editor', permissions: [] },
  });

  const role = watch('role');
  const permissions = watch('permissions') ?? [];

  const onSubmit = handleSubmit((values) =>
    invite.mutate(
      { ...values, permissions: customize ? values.permissions : undefined },
      {
        onSuccess: () => {
          reset();
          setCustomize(false);
          onClose();
        },
      },
    ),
  );

  const handleClose = (): void => {
    reset();
    setCustomize(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Invite user</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="invite-form" spacing={2.5} onSubmit={onSubmit} sx={{ pt: 1 }}>
          <TextField
            label="Email"
            type="email"
            placeholder="colleague@example.com"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register('email')}
          />
          <TextField
            select
            label="Role"
            defaultValue="editor"
            error={Boolean(errors.role)}
            helperText={errors.role?.message}
            {...register('role')}
            onChange={(event) => {
              setValue('role', event.target.value as UserRole);
            }}
          >
            {USER_ROLES.map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={customize} onChange={(event) => setCustomize(event.target.checked)} />}
            label="Customize permissions"
          />
          {customize && (
            <PermissionMatrix
              role={role as UserRole}
              permissions={permissions}
              onChange={(next) => setValue('permissions', next, { shouldValidate: true })}
            />
          )}
          {!customize && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              The invitee will receive the standard permissions for the <strong>{role}</strong> role. You can edit
              their permissions after they accept.
            </Typography>
          )}
          {invite.isSuccess && (
            <Alert severity="success">
              Invitation sent to {invite.data.email}.
              {invite.data.token && (
                <Box component="span" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                  Dev token: {invite.data.token}
                </Box>
              )}
            </Alert>
          )}
          {invite.isError && (
            <Alert severity="error">
              Could not send invitation. The email may already have an account or an active invitation.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="invite-form" variant="contained" startIcon={<AddIcon />} disabled={invite.isPending}>
          Send invitation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

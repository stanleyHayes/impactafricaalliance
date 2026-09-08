import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AccountPanel, AccountSectionHeader } from '../../components/account/AccountSurface';
import { useChangePassword } from '../../lib/admin-hooks';

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must differ from the current password',
    path: ['newPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const SECURITY_NOTES = [
  'Use at least 10 characters.',
  'Avoid reusing passwords from other services.',
  'Keep access limited to trusted devices.',
] as const;

const SecurityGuidance = (): JSX.Element => (
  <AccountPanel sx={{ height: '100%', p: 3 }}>
    <Box
      sx={{
        display: 'grid',
        width: 56,
        height: 56,
        placeItems: 'center',
        borderRadius: 2.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        color: 'text.primary',
      }}
    >
      <SecurityRoundedIcon sx={{ fontSize: 30 }} />
    </Box>
    <Typography variant="h6" sx={{ mt: 2.5 }}>
      Security checklist
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
      Small habits make the admin console much harder to misuse.
    </Typography>
    <Stack spacing={1.5}>
      {SECURITY_NOTES.map((note) => (
        <Stack key={note} direction="row" spacing={1.25} alignItems="center">
          <CheckCircleRoundedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {note}
          </Typography>
        </Stack>
      ))}
    </Stack>
  </AccountPanel>
);

const UpdatePassword = (): JSX.Element => {
  const mutation = useChangePassword();
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => reset() },
    );
  });

  const visibilityAdornment = (
    <InputAdornment position="end">
      <IconButton
        onClick={() => setShow((prev) => !prev)}
        edge="end"
        size="small"
        aria-label={show ? 'Hide passwords' : 'Show passwords'}
      >
        {show ? (
          <VisibilityOffOutlinedIcon fontSize="small" />
        ) : (
          <VisibilityOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </InputAdornment>
  );

  return (
    <>
      <AccountSectionHeader
        icon={<LockResetRoundedIcon />}
        title="Update password"
        description="Refresh your credentials and keep your console access protected."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <AccountPanel>
            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6">Change your password</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                You will keep your current session after a successful update.
              </Typography>

              <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate sx={{ mt: 3 }}>
                <TextField
                  label="Current password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  fullWidth
                  error={Boolean(errors.currentPassword)}
                  helperText={errors.currentPassword?.message}
                  slotProps={{ input: { endAdornment: visibilityAdornment } }}
                  {...register('currentPassword')}
                />
                <TextField
                  label="New password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  fullWidth
                  error={Boolean(errors.newPassword)}
                  helperText={errors.newPassword?.message}
                  {...register('newPassword')}
                />
                <TextField
                  label="Confirm new password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  fullWidth
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                {mutation.isError && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {mutation.error.message}
                  </Alert>
                )}
                {mutation.isSuccess && (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Password updated.
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={mutation.isPending}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {mutation.isPending ? 'Updating…' : 'Update password'}
                </Button>
              </Stack>
            </Box>
          </AccountPanel>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SecurityGuidance />
        </Grid>
      </Grid>
    </>
  );
};

export default UpdatePassword;

import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@iaa/shared';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '../../auth/AuthContext';
import { AccountPanel, AccountSectionHeader } from '../../components/account/AccountSurface';
import { useUpdateProfile } from '../../lib/admin-hooks';

const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

const ProfilePreview = ({ name, email }: { name: string; email: string }): JSX.Element => (
  <AccountPanel sx={{ height: '100%', p: 3 }}>
    <Typography
      variant="overline"
      sx={{ color: 'text.primary', fontWeight: 750, letterSpacing: 1.2 }}
    >
      Live identity preview
    </Typography>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
      <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontWeight: 800 }}>
        {initials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
          {name || 'Your name'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {email || 'your@email.com'}
        </Typography>
      </Box>
    </Stack>

    <Box
      sx={{
        mt: 3,
        p: 2,
        border: 1,
        borderColor: 'alpha(brandColors.forest, 0.12)',
        borderRadius: 2,
        bgcolor: 'alpha(brandColors.forest, 0.04)',
      }}
    >
      <Stack spacing={1.25}>
        {[
          'Used across dashboard menus',
          'Shown on account activity',
          'Email used for secure sign-in',
        ].map((item) => (
          <Stack key={item} direction="row" spacing={1} alignItems="center">
            <CheckCircleRoundedIcon sx={{ color: 'text.secondary', fontSize: 17 }} />
            <Typography variant="body2">{item}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  </AccountPanel>
);

const EditProfile = (): JSX.Element => {
  const { user, updateUser } = useAuth();
  const mutation = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  useEffect(() => {
    if (mutation.isSuccess) {
      const timer = setTimeout(() => mutation.reset(), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [mutation]);

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: (updated) => {
        updateUser(updated);
        reset({ name: updated.name, email: updated.email });
      },
    });
  });

  const values = watch();

  return (
    <>
      <AccountSectionHeader
        icon={<ManageAccountsRoundedIcon />}
        title="Edit profile"
        description="Keep the name and email tied to your console account accurate."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <AccountPanel>
            <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h6">Personal details</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                These details are used inside the admin console and account menus.
              </Typography>

              <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate sx={{ mt: 3 }}>
                <TextField
                  label="Full name"
                  fullWidth
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  slotProps={{
                    input: {
                      startAdornment: <PersonRoundedIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                    },
                  }}
                  {...register('name')}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <AlternateEmailRoundedIcon sx={{ mr: 1, color: 'text.disabled' }} />
                      ),
                    },
                  }}
                  {...register('email')}
                />

                {mutation.isError && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {mutation.error.message}
                  </Alert>
                )}
                {mutation.isSuccess && (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Profile updated.
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={mutation.isPending || !isDirty}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {mutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </Stack>
            </Box>
          </AccountPanel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <ProfilePreview name={values.name ?? ''} email={values.email ?? ''} />
        </Grid>
      </Grid>
    </>
  );
};

export default EditProfile;

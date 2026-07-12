import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInvitationSchema, type AcceptInvitationInput } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { useAcceptInvitation } from '../lib/admin-hooks';
import { tokenStore } from '../lib/token-store';

const AcceptInvitation = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const accept = useAcceptInvitation();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token: token ?? '', name: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (token) {
      setValue('token', token);
    }
  }, [token, setValue]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (accept.isSuccess) {
      tokenStore.set(accept.data.tokens);
      updateUser(accept.data.user);
      navigate('/', { replace: true });
    }
  }, [accept.isSuccess, accept.data, navigate, updateUser, token]);

  const onSubmit = handleSubmit((values) => {
    accept.mutate(values);
  });

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          This invitation link is missing a token. Please ask the administrator to resend your invitation.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'background.default' }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 430,
          p: { xs: 3.5, sm: 5 },
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 4,
          bgcolor: 'background.paper',
          boxShadow: '0 32px 80px -40px rgba(0,0,0,0.10)',
        }}
      >
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 2 }}>
          Admin Console
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
          Accept invitation
        </Typography>
        <Typography sx={{ mt: 1, mb: 4, color: 'text.secondary' }}>
          Create your account and set a password to get started.
        </Typography>

        <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
          <TextField
            label="Full name"
            autoComplete="name"
            placeholder="Your full name"
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {accept.isError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {accept.error instanceof Error
                ? accept.error.message
                : 'This invitation is invalid, expired, or has already been used.'}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={accept.isPending}
            endIcon={accept.isPending ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardRoundedIcon />}
            sx={{ mt: 0.5, py: 1.4, borderRadius: 2.5, fontSize: '1rem' }}
          >
            {accept.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default AcceptInvitation;

import { keyframes } from '@emotion/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ORG,
  passwordSchema,
  resetPasswordSchema,
} from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import type { z } from 'zod';

import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useResetPassword } from '../lib/admin-hooks';

import { BrandPanel, fieldSx } from './Login';

const fadeUp = keyframes`from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; }`;

const resetFormSchema = resetPasswordSchema
  .extend({ confirmPassword: passwordSchema })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormInput = z.infer<typeof resetFormSchema>;

interface PasswordFieldProps {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  show: boolean;
  onToggle: () => void;
  registration: ReturnType<ReturnType<typeof useForm<ResetFormInput>>['register']>;
}

const PasswordField = ({
  label,
  placeholder,
  disabled,
  error,
  show,
  onToggle,
  registration,
}: PasswordFieldProps): JSX.Element => {
  const theme = useTheme();
  return (
    <TextField
      label={label}
      type={show ? 'text' : 'password'}
      autoComplete="new-password"
      placeholder={placeholder}
      fullWidth
      disabled={disabled}
      error={Boolean(error)}
      helperText={error}
      sx={fieldSx(theme)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <LockOutlinedIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={onToggle}
                edge="end"
                size="small"
                aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                sx={{ color: theme.palette.text.secondary }}
              >
                {show ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ),
        },
        inputLabel: {
          sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.text.primary } },
        },
      }}
      {...registration}
    />
  );
};

const ResetSuccess = (): JSX.Element => (
  <Stack spacing={2.5}>
    <Alert severity="success" sx={{ borderRadius: 2 }}>
      Your password has been reset successfully.
    </Alert>
    <Button
      component={Link}
      to="/login"
      variant="contained"
      size="large"
      endIcon={<ArrowForwardRoundedIcon />}
      sx={{ py: 1.4, borderRadius: 2.5, fontSize: '1rem' }}
    >
      Go to sign in
    </Button>
  </Stack>
);

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

const ResetPasswordForm = ({ token, onSuccess }: ResetPasswordFormProps): JSX.Element => {
  const theme = useTheme();
  const reset = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { token },
  });

  const onSubmit = async (values: ResetFormInput): Promise<void> => {
    await reset.mutateAsync({ token, password: values.password });
    onSuccess();
  };

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
      <PasswordField
        label="New password"
        placeholder="Create a strong password"
        disabled={false}
        error={errors.password?.message}
        show={showPassword}
        onToggle={() => setShowPassword((show) => !show)}
        registration={register('password')}
      />

      <PasswordField
        label="Confirm password"
        placeholder="Re-enter your password"
        disabled={false}
        error={errors.confirmPassword?.message}
        show={showConfirm}
        onToggle={() => setShowConfirm((show) => !show)}
        registration={register('confirmPassword')}
      />

      {reset.error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {reset.error.message}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={reset.isPending}
        endIcon={
          reset.isPending ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardRoundedIcon />
        }
        sx={{
          mt: 0.5,
          py: 1.4,
          borderRadius: 2.5,
          fontSize: '1rem',
          boxShadow: '0 10px 24px -10px rgba(0,0,0,0.18)',
        }}
      >
        {reset.isPending ? 'Resetting…' : 'Reset password'}
      </Button>

      <Button component={Link} to="/login" variant="text" size="small" sx={{ color: theme.palette.text.secondary }}>
        Back to sign in
      </Button>
    </Stack>
  );
};

const ResetPassword = (): JSX.Element => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);

  const renderBody = (): JSX.Element | null => {
    if (!token) {
      return (
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          This reset link is missing a token. Please request a new link from the{' '}
          <Box component={Link} to="/login" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
            sign-in page
          </Box>
          .
        </Alert>
      );
    }
    if (success) {
      return <ResetSuccess />;
    }
    return <ResetPasswordForm token={token} onSuccess={() => setSuccess(true)} />;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.08fr 0.92fr' },
        bgcolor: theme.palette.background.default,
      }}
    >
      <BrandPanel />

      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 5 },
        }}
      >
        <Box sx={{ position: 'absolute', top: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, zIndex: 1 }}>
          <ThemeToggle />
        </Box>

        <Box
          sx={{
            width: '100%',
            maxWidth: 430,
            p: { xs: 3.5, sm: 5 },
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4,
            bgcolor: theme.palette.background.paper,
            boxShadow: '0 32px 80px -40px rgba(0,0,0,0.10)',
            animation: `${fadeUp} 0.6s ease 0.15s both`,
          }}
        >
          <Box
            component="img"
            src="/brand/logo-primary.png"
            alt={ORG.name}
            sx={{ height: 40, mb: 4, display: { xs: 'block', md: 'none' } }}
          />

          <Typography variant="overline" sx={{ color: theme.palette.primary.main, fontWeight: 700, letterSpacing: 2 }}>
            Admin Console
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: theme.palette.text.primary }}>
            Create a new password
          </Typography>
          <Typography sx={{ mt: 1, mb: 4, color: theme.palette.text.secondary }}>
            Choose a strong password to keep your account secure.
          </Typography>

          {renderBody()}

          <Typography variant="body2" sx={{ mt: 4, color: theme.palette.text.secondary }}>
            Need help? Contact an administrator at{' '}
            <Box component="a" href={`mailto:${ORG.email}`} sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
              {ORG.email}
            </Box>
            .
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ResetPassword;

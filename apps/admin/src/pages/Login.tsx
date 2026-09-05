import { keyframes } from '@emotion/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ORG,
  brandColors,
  brandFonts,
  forgotPasswordSchema,
  loginSchema,
  totpCodeSchema,
  type ForgotPasswordInput,
  type LoginInput,
} from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useAuth } from '../auth/AuthContext';
import { AllianceArtwork } from '../components/auth/AllianceArtwork';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useForgotPassword } from '../lib/admin-hooks';

interface LocationState {
  from?: string;
}

const fadeUp = keyframes`from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; }`;

export const BrandPanel = (): JSX.Element => (
  <Box
    sx={{
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 3,
      p: { xs: 3, md: 4, lg: 5 },
      bgcolor: '#183E33',
      color: '#F3F1E8',
      borderRadius: { xs: 3, md: 4 },
    }}
  >
    <Box
      component="img"
      src="/brand/logo-white.png"
      alt={ORG.name}
      sx={{ height: 42, width: 'auto', alignSelf: 'flex-start' }}
    />
    <Box sx={{ maxWidth: 520, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <AllianceArtwork />
      </Box>
      <Typography variant="overline" sx={{ color: '#B4CABD', letterSpacing: 2 }}>
        People. Ideas. Possibility.
      </Typography>
      <Typography
        variant="h2"
        sx={{
          mt: 1,
          fontFamily: brandFonts.heading,
          color: '#F3F1E8',
          fontSize: { xs: '2rem', md: '2.8rem', lg: '3.3rem' },
          lineHeight: 1.08,
        }}
      >
        Good work starts
        <br />
        with you.
      </Typography>
      <Typography
        sx={{
          mt: 2,
          maxWidth: 410,
          color: '#B4CABD',
          lineHeight: 1.75,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        Behind every programme is someone making it happen. This is your space to keep the Alliance
        moving.
      </Typography>
    </Box>
    <Stack
      direction="row"
      spacing={2}
      sx={{
        pt: 2,
        borderTop: '1px solid #3B5A4D',
        color: '#B4CABD',
        display: { xs: 'none', md: 'flex' },
        fontSize: '.75rem',
      }}
    >
      <Typography variant="caption">Rooted in community.</Typography>
      <Typography variant="caption">Connected by purpose.</Typography>
    </Stack>
  </Box>
);

export const fieldSx = (theme: Theme) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    backgroundColor: alpha(theme.palette.text.secondary, 0.045),
    transition: 'box-shadow .2s, border-color .2s',
    '& fieldset': { borderColor: theme.palette.divider },
    '&:hover fieldset': { borderColor: theme.palette.primary.main },
    '&.Mui-focused fieldset': { borderColor: brandColors.gold, borderWidth: 2 },
    '&.Mui-focused': { boxShadow: `0 0 0 4px ${alpha(brandColors.gold, 0.15)}` },
    '& input': { color: theme.palette.text.primary },
    '& input::placeholder': { color: theme.palette.text.secondary, opacity: 1 },
    '& input:-webkit-autofill': {
      WebkitTextFillColor: theme.palette.text.primary,
      WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
    },
  },
});

interface MfaFormInput {
  totpCode: string;
}

const mfaFormSchema = z.object({ totpCode: totpCodeSchema });

interface CredentialsFormProps {
  onSubmit: (values: LoginInput) => Promise<void>;
  onForgotPassword: () => void;
  error: string | null;
  isSubmitting: boolean;
}

const CredentialsForm = ({
  onSubmit,
  onForgotPassword,
  error,
  isSubmitting,
}: CredentialsFormProps): JSX.Element => {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const { ref: emailRef, ...emailRest } = register('email');
  const { ref: passwordRef, ...passwordRest } = register('password');

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="admin@impactafricaalliance.org"
        fullWidth
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        sx={fieldSx(theme)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlineRoundedIcon
                  sx={{ color: theme.palette.text.secondary, fontSize: 20 }}
                />
              </InputAdornment>
            ),
          },
          inputLabel: {
            sx: {
              color: theme.palette.text.secondary,
              '&.Mui-focused': { color: theme.palette.text.primary },
            },
          },
        }}
        inputRef={emailRef}
        {...emailRest}
      />
      <TextField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="Enter your password"
        fullWidth
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
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
                  onClick={() => setShowPassword((show) => !show)}
                  edge="end"
                  size="small"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  {showPassword ? (
                    <VisibilityOffOutlinedIcon fontSize="small" />
                  ) : (
                    <VisibilityOutlinedIcon fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
          inputLabel: {
            sx: {
              color: theme.palette.text.secondary,
              '&.Mui-focused': { color: theme.palette.text.primary },
            },
          },
        }}
        inputRef={passwordRef}
        {...passwordRest}
      />

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        endIcon={
          isSubmitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <ArrowForwardRoundedIcon />
          )
        }
        sx={{
          mt: 0.5,
          py: 1.4,
          borderRadius: 2.5,
          fontSize: '1rem',
          boxShadow: '0 10px 24px -10px rgba(0,0,0,0.18)',
          '& .MuiButton-endIcon': { transition: 'transform .2s' },
          '&:hover .MuiButton-endIcon': { transform: 'translateX(4px)' },
          '&.Mui-disabled': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            opacity: 0.85,
          },
        }}
      >
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </Button>

      <Box sx={{ textAlign: 'right' }}>
        <Button
          type="button"
          variant="text"
          size="small"
          onClick={onForgotPassword}
          sx={{ color: theme.palette.text.secondary, textTransform: 'none', fontWeight: 600 }}
        >
          Forgot password?
        </Button>
      </Box>
    </Stack>
  );
};

interface MfaFormProps {
  onSubmit: (values: MfaFormInput) => Promise<void>;
  onBack: () => void;
  error: string | null;
  isSubmitting: boolean;
}

const MfaForm = ({ onSubmit, onBack, error, isSubmitting }: MfaFormProps): JSX.Element => {
  const theme = useTheme();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaFormInput>({ resolver: zodResolver(mfaFormSchema) });

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        label="Authentication code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        fullWidth
        placeholder="000000"
        error={Boolean(errors.totpCode)}
        helperText={errors.totpCode?.message}
        sx={fieldSx(theme)}
        {...register('totpCode')}
      />

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        endIcon={
          isSubmitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <ArrowForwardRoundedIcon />
          )
        }
        sx={{
          mt: 0.5,
          py: 1.4,
          borderRadius: 2.5,
          fontSize: '1rem',
          boxShadow: '0 10px 24px -10px rgba(0,0,0,0.18)',
        }}
      >
        {isSubmitting ? 'Verifying…' : 'Verify'}
      </Button>
      <Button
        variant="text"
        size="small"
        onClick={onBack}
        sx={{ color: theme.palette.text.secondary }}
      >
        Back to sign in
      </Button>
    </Stack>
  );
};

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const ForgotPasswordForm = ({ onBack }: ForgotPasswordFormProps): JSX.Element => {
  const theme = useTheme();
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput): Promise<void> => {
    try {
      await forgot.mutateAsync(values);
    } catch {
      // Surface generic message; do not leak whether the email exists.
    }
  };

  if (forgot.isSuccess) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          If an account exists for that email, you will receive a password-reset link shortly.
        </Alert>
        <Button
          variant="text"
          size="small"
          onClick={onBack}
          sx={{ color: theme.palette.text.secondary }}
        >
          Back to sign in
        </Button>
      </Stack>
    );
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="you@example.com"
        fullWidth
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        sx={fieldSx(theme)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlineRoundedIcon
                  sx={{ color: theme.palette.text.secondary, fontSize: 20 }}
                />
              </InputAdornment>
            ),
          },
          inputLabel: {
            sx: {
              color: theme.palette.text.secondary,
              '&.Mui-focused': { color: theme.palette.text.primary },
            },
          },
        }}
        {...register('email')}
      />

      {forgot.error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {forgot.error.message}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={forgot.isPending}
        endIcon={
          forgot.isPending ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <ArrowForwardRoundedIcon />
          )
        }
        sx={{
          mt: 0.5,
          py: 1.4,
          borderRadius: 2.5,
          fontSize: '1rem',
        }}
      >
        {forgot.isPending ? 'Sending…' : 'Send reset link'}
      </Button>
      <Button
        variant="text"
        size="small"
        onClick={onBack}
        sx={{ color: theme.palette.text.secondary }}
      >
        Back to sign in
      </Button>
    </Stack>
  );
};

const Login = (): JSX.Element => {
  const theme = useTheme();
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'credentials' | 'mfa' | 'forgot'>('credentials');
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const handleCredentials = async (values: LoginInput): Promise<void> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(values);
      if ('mfaRequired' in result) {
        setCreds(values);
        setStep('mfa');
        return;
      }
      const from = (location.state as LocationState | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfa = async ({ totpCode }: MfaFormInput): Promise<void> => {
    if (!creds) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ ...creds, totpCode });
      const from = (location.state as LocationState | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid MFA code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = (): void => {
    setStep('credentials');
    setCreds(null);
    setError(null);
  };

  const renderForm = (): JSX.Element => {
    switch (step) {
      case 'mfa':
        return (
          <MfaForm
            onSubmit={handleMfa}
            onBack={handleBack}
            error={error}
            isSubmitting={isSubmitting}
          />
        );
      case 'forgot':
        return <ForgotPasswordForm onBack={handleBack} />;
      default:
        return (
          <CredentialsForm
            onSubmit={handleCredentials}
            onForgotPassword={() => setStep('forgot')}
            error={error}
            isSubmitting={isSubmitting}
          />
        );
    }
  };

  const titleMap: Record<typeof step, string> = {
    credentials: 'Welcome back.',
    mfa: 'Two-factor authentication',
    forgot: 'Reset your password',
  };
  const subtitleMap: Record<typeof step, string> = {
    credentials: 'Sign in to manage your people, programmes, and stories.',
    mfa: 'Enter the 6-digit code from your authenticator app, or a recovery code.',
    forgot: 'Enter your email and we will send you a secure reset link.',
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gap: { xs: 0, md: 3 },
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        p: { xs: 1.5, md: 3 },
        bgcolor: 'background.default',
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important', transition: 'none !important' },
        },
      }}
    >
      <BrandPanel />

      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4, lg: 6 },
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            position: { xs: 'fixed', md: 'absolute' },
            top: { xs: 16, md: 12 },
            right: { xs: 16, md: 12 },
            zIndex: 1,
          }}
        >
          <ThemeToggle />
        </Box>

        <Box
          sx={{
            width: '100%',
            maxWidth: 440,
            py: { xs: 3, md: 5 },

            animation: `${fadeUp} 0.6s ease 0.15s both`,
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 2 }}
          >
            Admin Console
          </Typography>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mt: 1,
              fontSize: { xs: '2.1rem', md: '2.8rem' },
              color: theme.palette.text.primary,
            }}
          >
            {titleMap[step]}
          </Typography>
          <Typography sx={{ mt: 1, mb: 4, color: theme.palette.text.secondary }}>
            {subtitleMap[step]}
          </Typography>

          {renderForm()}

          <Typography variant="body2" sx={{ mt: 4, color: theme.palette.text.secondary }}>
            Need a hand?{' '}
            <Box
              component="a"
              href={`mailto:${ORG.email}`}
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 600,
                overflowWrap: 'anywhere',
                textUnderlineOffset: 3,
              }}
            >
              {ORG.email}
            </Box>
            .
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;

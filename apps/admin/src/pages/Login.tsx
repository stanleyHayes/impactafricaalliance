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
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useForgotPassword } from '../lib/admin-hooks';

interface LocationState {
  from?: string;
}

const fadeUp = keyframes`from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; }`;

const IMPACT_CHIPS = ['5+ countries', '1,000+ youth', '4 flagship programs'];

export const BrandPanel = (): JSX.Element => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
  <Box
    sx={{
      display: { xs: 'none', md: 'flex' },
      position: 'relative',
      overflow: 'hidden',
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: { md: 6, lg: 8 },
      color: brandColors.white,
      bgcolor: isDark ? brandColors.deepForest : brandColors.forestGreen,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${brandColors.gold}, transparent 72%)`,
      },
    }}
  >
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: { md: -60, lg: -20 },
        bottom: { md: -60, lg: -20 },
        width: { md: 360, lg: 440 },
        height: { md: 360, lg: 440 },
        background: `url(/patterns/africa-rings.svg) no-repeat center / contain`,
        opacity: 0.12,
        pointerEvents: 'none',
      }}
    />

    <Box
      component="img"
      src="/brand/logo-white.png"
      alt={ORG.name}
      sx={{ height: 40, width: 'auto', alignSelf: 'flex-start', position: 'relative', animation: `${fadeUp} 0.7s ease both` }}
    />

    <Box sx={{ position: 'relative', maxWidth: 460 }}>
      <Typography
        sx={{
          fontFamily: brandFonts.body,
          fontStyle: 'italic',
          fontSize: { md: '1.25rem', lg: '1.4rem' },
          color: 'rgba(255,255,255,0.72)',
          mb: 2,
          animation: `${fadeUp} 0.7s ease 0.1s both`,
        }}
      >
        Empowering Africa, together.
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontWeight: 700,
          fontSize: { md: '2.6rem', lg: '3.1rem' },
          lineHeight: 1.08,
          color: brandColors.white,
          animation: `${fadeUp} 0.7s ease 0.2s both`,
        }}
      >
        Welcome back to
        <br />
        the work.
      </Typography>
      <Typography
        sx={{
          mt: 3,
          color: 'rgba(255,255,255,0.72)',
          fontSize: '1.05rem',
          lineHeight: 1.7,
          animation: `${fadeUp} 0.7s ease 0.3s both`,
        }}
      >
        Sign in to steward the stories, programs, and people powering Impact Africa Alliance.
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ mt: 4, flexWrap: 'wrap', gap: 1.25, animation: `${fadeUp} 0.7s ease 0.4s both` }}>
        {IMPACT_CHIPS.map((chip) => (
          <Box
            key={chip}
            sx={{
              px: 1.75,
              py: 0.75,
              borderRadius: 999,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: brandColors.forestGreen,
              border: `1px solid ${brandColors.borderSubtle}`,
              bgcolor: brandColors.white,
            }}
          >
            {chip}
          </Box>
        ))}
      </Stack>
    </Box>

    <Typography
      variant="body2"
      sx={{ position: 'relative', color: 'rgba(255,255,255,0.62)', animation: `${fadeUp} 0.7s ease 0.5s both` }}
    >
      Aligned with AU Agenda 2063 &amp; the UN Sustainable Development Goals.
    </Typography>
  </Box>
);
};

export const fieldSx = (theme: Theme) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    backgroundColor: theme.palette.background.paper,
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

const CredentialsForm = ({ onSubmit, onForgotPassword, error, isSubmitting }: CredentialsFormProps): JSX.Element => {
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
                <MailOutlineRoundedIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
              </InputAdornment>
            ),
          },
          inputLabel: {
            sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.text.primary } },
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
            sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.text.primary } },
          },
        }}
        inputRef={passwordRef}
        {...passwordRest}
      />

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

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

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

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
        <Button variant="text" size="small" onClick={onBack} sx={{ color: theme.palette.text.secondary }}>
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
                <MailOutlineRoundedIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
              </InputAdornment>
            ),
          },
          inputLabel: {
            sx: { color: theme.palette.text.secondary, '&.Mui-focused': { color: theme.palette.text.primary } },
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
          forgot.isPending ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardRoundedIcon />
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
      <Button variant="text" size="small" onClick={onBack} sx={{ color: theme.palette.text.secondary }}>
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
        return <MfaForm onSubmit={handleMfa} onBack={handleBack} error={error} isSubmitting={isSubmitting} />;
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
    credentials: 'Sign in',
    mfa: 'Two-factor authentication',
    forgot: 'Reset your password',
  };
  const subtitleMap: Record<typeof step, string> = {
    credentials: 'Manage Impact Africa Alliance content and activity.',
    mfa: 'Enter the 6-digit code from your authenticator app, or a recovery code.',
    forgot: 'Enter your email and we will send you a secure reset link.',
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.08fr 0.92fr' }, bgcolor: theme.palette.background.default }}>
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
            {titleMap[step]}
          </Typography>
          <Typography sx={{ mt: 1, mb: 4, color: theme.palette.text.secondary }}>
            {subtitleMap[step]}
          </Typography>

          {renderForm()}

          <Typography variant="body2" sx={{ mt: 4, color: theme.palette.text.secondary }}>
            Trouble signing in? Contact an administrator at{' '}
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

export default Login;

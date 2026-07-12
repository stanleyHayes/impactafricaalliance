import { zodResolver } from '@hookform/resolvers/zod';
import { type DisableMfaInput, totpCodeSchema } from '@iaa/shared';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import PhishingRoundedIcon from '@mui/icons-material/PhishingRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AccountPanel, AccountSectionHeader } from '../../components/account/AccountSurface';
import {
  useDisableMfa,
  useMfaStatus,
  useSetupMfa,
  useVerifyMfaSetup,
} from '../../lib/admin-hooks';

const passwordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type PasswordForm = z.infer<typeof passwordSchema>;

type TotpForm = { totpCode: string };

const SetupStep = ({
  onComplete,
}: {
  onComplete: () => void;
}): JSX.Element => {
  const setup = useSetupMfa();
  const verify = useVerifyMfaSetup();
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string; manualEntry: string } | null>(null);
  const [setupPassword, setSetupPassword] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register: registerPassword,
    handleSubmit: handlePassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const {
    register: registerCode,
    handleSubmit: handleCode,
    formState: { errors: codeErrors },
  } = useForm<TotpForm>({
    resolver: zodResolver(z.object({ totpCode: totpCodeSchema })),
  });

  const onStart = handlePassword((values) => {
    setSetupPassword(values.password);
    setup.mutate(values, {
      onSuccess: (data) => setSetupData(data),
    });
  });

  const onVerify = handleCode(({ totpCode }) => {
    verify.mutate(
      { password: setupPassword, totpCode },
      {
        onSuccess: (data) => {
          setRecoveryCodes(data.recoveryCodes);
        },
      },
    );
  });

  const copyCodes = async (): Promise<void> => {
    if (!recoveryCodes) return;
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (recoveryCodes) {
    return (
      <AccountPanel sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack spacing={2.5}>
          <Box sx={{ display: 'grid', placeItems: 'center' }}>
            <VerifiedUserRoundedIcon sx={{ fontSize: 48, color: 'success.main' }} />
          </Box>
          <Typography variant="h6" sx={{ textAlign: 'center' }}>
            Two-factor authentication is enabled
          </Typography>
          <Alert severity="warning" icon={<WarningAmberRoundedIcon />}>
            Save these recovery codes somewhere safe. They are the only way to regain access if you
            lose your authenticator device.
          </Alert>
          <Box
            component="pre"
            sx={{
              p: 2,
              bgcolor: 'rgba(0,30,20,0.04)',
              borderRadius: 2,
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              position: 'relative',
            }}
          >
            {recoveryCodes.join('\n')}
            <Tooltip title={copied ? 'Copied' : 'Copy all'}>
              <IconButton
                onClick={copyCodes}
                size="small"
                sx={{ position: 'absolute', top: 8, right: 8 }}
                aria-label="Copy recovery codes"
              >
                <ContentCopyRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Button variant="contained" onClick={onComplete}>
            Done
          </Button>
        </Stack>
      </AccountPanel>
    );
  }

  if (setupData) {
    return (
      <AccountPanel sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack spacing={2.5}>
          <Typography variant="h6">Verify the setup</Typography>
          <Typography variant="body2" color="text.secondary">
            Scan the QR code with your authenticator app, then enter the 6-digit code it generates.
          </Typography>
          <Box sx={{ display: 'grid', placeItems: 'center' }}>
            <Box
              component="img"
              src={setupData.qrCodeUrl}
              alt="QR code for authenticator app"
              sx={{ width: 220, height: 220, borderRadius: 2 }}
            />
          </Box>
          <TextField
            label="Manual entry"
            value={setupData.manualEntry}
            fullWidth
            slotProps={{ input: { readOnly: true } }}
            helperText="If you cannot scan the code, enter this URI manually."
          />
          <Stack component="form" spacing={2} onSubmit={onVerify} noValidate>
            <TextField
              label="Authentication code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              fullWidth
              placeholder="000000"
              error={Boolean(codeErrors.totpCode || verify.error)}
              helperText={codeErrors.totpCode?.message}
              {...registerCode('totpCode')}
            />
            {verify.error && <Alert severity="error">{verify.error.message}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={verify.isPending}
              endIcon={verify.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {verify.isPending ? 'Verifying…' : 'Enable MFA'}
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setSetupData(null);
                setup.reset();
              }}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </AccountPanel>
    );
  }

  return (
    <AccountPanel sx={{ p: { xs: 2.5, sm: 3.5 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h6">Set up authenticator app</Typography>
        <Typography variant="body2" color="text.secondary">
          You will need an authenticator app such as Google Authenticator, Authy, or 1Password.
        </Typography>
        <Stack component="form" spacing={2} onSubmit={onStart} noValidate>
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            fullWidth
            error={Boolean(passwordErrors.password || setup.error)}
            helperText={passwordErrors.password?.message}
            {...registerPassword('password')}
          />
          {setup.error && <Alert severity="error">{setup.error.message}</Alert>}
          <Button
            type="submit"
            variant="contained"
            disabled={setup.isPending}
            endIcon={setup.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {setup.isPending ? 'Starting…' : 'Continue'}
          </Button>
        </Stack>
      </Stack>
    </AccountPanel>
  );
};

const DisableStep = ({
  onComplete,
}: {
  onComplete: () => void;
}): JSX.Element => {
  const disable = useDisableMfa();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DisableMfaInput>({
    resolver: zodResolver(
      z.object({
        password: z.string().min(1, 'Password is required'),
        totpCode: totpCodeSchema,
      }),
    ),
  });

  const onSubmit = handleSubmit((values) => {
    disable.mutate(values, { onSuccess: onComplete });
  });

  return (
    <AccountPanel sx={{ p: { xs: 2.5, sm: 3.5 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h6">Disable two-factor authentication</Typography>
        <Alert severity="warning" icon={<WarningAmberRoundedIcon />}>
          Disabling MFA makes your account less secure. You will need to set it up again if you
          change your mind.
        </Alert>
        <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            fullWidth
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
          />
          <TextField
            label="Authentication code or recovery code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            fullWidth
            placeholder="000000"
            error={Boolean(errors.totpCode)}
            helperText={errors.totpCode?.message}
            {...register('totpCode')}
          />
          {disable.error && <Alert severity="error">{disable.error.message}</Alert>}
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={disable.isPending}
            endIcon={disable.isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {disable.isPending ? 'Disabling…' : 'Disable MFA'}
          </Button>
        </Stack>
      </Stack>
    </AccountPanel>
  );
};

const MfaSetup = (): JSX.Element => {
  const navigate = useNavigate();
  const { data: status, isLoading } = useMfaStatus();
  const [mode, setMode] = useState<'view' | 'setup' | 'disable'>('view');

  if (isLoading || !status) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AccountSectionHeader
        icon={<VerifiedUserRoundedIcon />}
        eyebrow="Account workspace"
        title="Two-factor authentication"
        description="Add an extra layer of security to your admin account."
        action={
          status.mfaEnabled ? (
            <Chip label="Enabled" color="success" icon={<VerifiedUserRoundedIcon />} />
          ) : (
            <Chip label="Not enabled" color="default" icon={<PhishingRoundedIcon />} />
          )
        }
      />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          {mode === 'setup' && <SetupStep onComplete={() => navigate('/account/profile')} />}
          {mode === 'disable' && <DisableStep onComplete={() => setMode('view')} />}
          {mode === 'view' && (
            <AccountPanel sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Stack spacing={2.5}>
                <Typography variant="h6">
                  {status.mfaEnabled
                    ? 'Two-factor authentication is enabled'
                    : 'Two-factor authentication is not enabled'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {status.mfaEnabled
                    ? 'Your account requires a code from your authenticator app each time you sign in.'
                    : 'Protect your account by requiring a code from an authenticator app in addition to your password.'}
                </Typography>
                <Box>
                  {status.mfaEnabled ? (
                    <Button variant="outlined" color="error" onClick={() => setMode('disable')}>
                      Disable MFA
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={() => setMode('setup')}>
                      Set up MFA
                    </Button>
                  )}
                </Box>
              </Stack>
            </AccountPanel>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <AccountPanel sx={{ height: '100%', p: 3 }}>
            <Box
              sx={{
                display: 'grid',
                width: 56,
                height: 56,
                placeItems: 'center',
                borderRadius: 2.5,
                bgcolor: 'rgba(0,30,20,0.06)',
                color: 'text.primary',
              }}
            >
              <LockResetRoundedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h6" sx={{ mt: 2.5 }}>
              Why MFA matters
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Even if your password is compromised, MFA prevents unauthorised access because the
              attacker would also need your physical device or a recovery code.
            </Typography>
          </AccountPanel>
        </Grid>
      </Grid>
    </>
  );
};

export default MfaSetup;

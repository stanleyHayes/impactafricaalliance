import { keyframes } from '@emotion/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ORG, brandColors, loginSchema, type LoginInput } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

interface LocationState {
  from?: string;
}

const fadeUp = keyframes`from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; }`;
const twinkle = keyframes`0%, 100% { opacity: 0.2; } 50% { opacity: 0.95; }`;
const drawIn = keyframes`from { opacity: 0; } to { opacity: 0.5; }`;

/** Decorative "networked Africa" constellation echoing the IAA logo mark. */
const NETWORK_NODES: ReadonlyArray<{ x: number; y: number; accent?: 'gold' | 'emerald' }> = [
  { x: 132, y: 70 }, { x: 226, y: 52 }, { x: 320, y: 104, accent: 'emerald' },
  { x: 372, y: 196 }, { x: 262, y: 168, accent: 'gold' }, { x: 156, y: 196 },
  { x: 96, y: 296 }, { x: 198, y: 300, accent: 'gold' }, { x: 312, y: 296 },
  { x: 368, y: 388 }, { x: 250, y: 408, accent: 'emerald' }, { x: 148, y: 430 },
  { x: 232, y: 530, accent: 'gold' }, { x: 318, y: 486 },
];
const NETWORK_EDGES: ReadonlyArray<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [0, 5], [1, 4], [2, 4], [4, 5], [5, 6], [4, 7], [7, 8],
  [3, 8], [6, 7], [8, 9], [7, 10], [10, 11], [6, 11], [10, 13], [13, 9], [11, 12], [12, 13],
];
const ACCENT_FILL = { gold: brandColors.goldAmber, emerald: '#5BD6A0' } as const;

const NetworkMotif = (): JSX.Element => (
  <Box
    component="svg"
    viewBox="0 0 460 600"
    aria-hidden
    sx={{
      position: 'absolute',
      right: { md: -40, lg: 0 },
      top: '50%',
      transform: 'translateY(-50%)',
      height: '92%',
      maxWidth: '60%',
      pointerEvents: 'none',
      '@media (prefers-reduced-motion: reduce)': { '& *': { animation: 'none !important' } },
    }}
  >
    {NETWORK_EDGES.map(([a, b], i) => {
      const p = NETWORK_NODES[a];
      const q = NETWORK_NODES[b];
      if (!p || !q) {
        return null;
      }
      return (
        <line
          key={`e${i}`}
          x1={p.x}
          y1={p.y}
          x2={q.x}
          y2={q.y}
          stroke="#ffffff"
          strokeWidth={1}
          style={{ opacity: 0, animation: `${drawIn} 1.2s ease ${0.3 + i * 0.04}s forwards` }}
        />
      );
    })}
    {NETWORK_NODES.map((n, i) => (
      <circle
        key={`n${i}`}
        cx={n.x}
        cy={n.y}
        r={n.accent ? 5 : 3}
        fill={n.accent ? ACCENT_FILL[n.accent] : '#ffffff'}
        style={{ animation: `${twinkle} ${3 + (i % 4)}s ease-in-out ${i * 0.25}s infinite` }}
      />
    ))}
  </Box>
);

const IMPACT_CHIPS = ['5+ countries', '1,000+ youth', '4 flagship programs'];

const BrandPanel = (): JSX.Element => (
  <Box
    sx={{
      display: { xs: 'none', md: 'flex' },
      position: 'relative',
      overflow: 'hidden',
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: { md: 6, lg: 8 },
      color: 'common.white',
      backgroundColor: '#103A24',
    }}
  >
    <NetworkMotif />

    <Box
      component="img"
      src="/brand/logo-white.png"
      alt={ORG.name}
      sx={{ height: 40, width: 'auto', alignSelf: 'flex-start', position: 'relative', animation: `${fadeUp} 0.7s ease both` }}
    />

    <Box sx={{ position: 'relative', maxWidth: 460 }}>
      <Typography
        sx={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: 'italic',
          fontSize: { md: '1.25rem', lg: '1.4rem' },
          color: brandColors.goldAmber,
          mb: 2,
          animation: `${fadeUp} 0.7s ease 0.1s both`,
        }}
      >
        Empowering Africa, together.
      </Typography>
      <Typography
        variant="h2"
        sx={{ fontWeight: 800, fontSize: { md: '2.6rem', lg: '3.1rem' }, lineHeight: 1.08, animation: `${fadeUp} 0.7s ease 0.2s both` }}
      >
        Welcome back to
        <br />
        the work.
      </Typography>
      <Typography sx={{ mt: 3, opacity: 0.88, fontSize: '1.05rem', lineHeight: 1.7, animation: `${fadeUp} 0.7s ease 0.3s both` }}>
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
              border: '1px solid rgba(255,255,255,0.28)',
              backgroundColor: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {chip}
          </Box>
        ))}
      </Stack>
    </Box>

    <Typography variant="body2" sx={{ position: 'relative', opacity: 0.7, animation: `${fadeUp} 0.7s ease 0.5s both` }}>
      Aligned with AU Agenda 2063 &amp; the UN Sustainable Development Goals.
    </Typography>
  </Box>
);

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    backgroundColor: '#FBFCFB',
    transition: 'box-shadow .2s, border-color .2s',
    '& fieldset': { borderColor: '#E2E7E3' },
    '&:hover fieldset': { borderColor: brandColors.emeraldGreen },
    '&.Mui-focused fieldset': { borderColor: brandColors.goldAmber, borderWidth: 2 },
    '&.Mui-focused': { boxShadow: `0 0 0 4px ${brandColors.goldAmber}22` },
  },
} as const;

const Login = (): JSX.Element => {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await login(values);
      const from = (location.state as LocationState | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch {
      setError('Invalid email or password.');
    }
  });

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.08fr 0.92fr' } }}>
      <BrandPanel />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 5 },
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 410, animation: `${fadeUp} 0.6s ease 0.15s both` }}>
          <Box
            component="img"
            src="/brand/logo-primary.png"
            alt={ORG.name}
            sx={{ height: 40, mb: 4, display: { xs: 'block', md: 'none' } }}
          />

          <Typography variant="overline" sx={{ color: 'success.main', fontWeight: 700, letterSpacing: 2 }}>
            Admin Console
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
            Sign in
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
            Manage Impact Africa Alliance content and activity.
          </Typography>

          <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              fullWidth
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              sx={fieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              {...register('email')}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              fullWidth
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              sx={fieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((show) => !show)}
                        edge="end"
                        size="small"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              }}
              {...register('password')}
            />

            {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                mt: 0.5,
                py: 1.4,
                borderRadius: 2.5,
                fontSize: '1rem',
                boxShadow: '0 10px 24px -10px rgba(26,92,56,0.6)',
                '& .MuiButton-endIcon': { transition: 'transform .2s' },
                '&:hover .MuiButton-endIcon': { transform: 'translateX(4px)' },
              }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            Trouble signing in? Contact an administrator at{' '}
            <Box component="a" href={`mailto:${ORG.email}`} sx={{ color: 'primary.main', fontWeight: 600 }}>
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

import { zodResolver } from '@hookform/resolvers/zod';
import { brandColors, subscribeSchema, type SubscribeInput } from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';

import { useSubscribe } from '../../lib/mutations';
import { ConsentCheckbox } from '../ConsentCheckbox';
import { SocialLinks } from '../SocialLinks';

// This panel stays dark in both page themes, so its fields use a matching green surface.
const newsletterFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#284239',
    color: '#F2F0EA',
    '&:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(242,240,234,0.24)',
    },
    '&:hover:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(242,240,234,0.42)',
    },
  },
  '& input::placeholder': { color: '#BAC8C1', opacity: 1 },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px #284239 inset',
    WebkitTextFillColor: '#F2F0EA',
    caretColor: '#F2F0EA',
    borderRadius: 'inherit',
  },
  '& .MuiFormHelperText-root': { mx: 0 },
};

/** Faint "alliance" constellation — connected nodes echoing the network-of-people brand idea. */
const NODES: ReadonlyArray<{ x: number; y: number; gold?: boolean }> = [
  { x: 40, y: 64 },
  { x: 128, y: 28 },
  { x: 214, y: 86, gold: true },
  { x: 312, y: 44 },
  { x: 372, y: 128 },
  { x: 286, y: 168 },
  { x: 188, y: 214 },
  { x: 86, y: 156 },
  { x: 150, y: 122, gold: true },
  { x: 344, y: 232 },
];
const EDGES: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 8],
  [8, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 0],
  [8, 5],
  [5, 9],
  [2, 6],
];

const NetworkMotif = (): JSX.Element => (
  <Box
    aria-hidden
    component="svg"
    viewBox="0 0 400 280"
    sx={{
      position: 'absolute',
      top: '50%',
      right: { xs: '-22%', md: '-4%' },
      transform: 'translateY(-50%)',
      width: { xs: 460, md: 620 },
      height: 'auto',
      opacity: 0.55,
      pointerEvents: 'none',
    }}
  >
    {EDGES.map(([a, b]) => {
      const from = NODES[a];
      const to = NODES[b];
      if (!from || !to) {
        return null;
      }
      return (
        <line
          key={`${a}-${b}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={1}
        />
      );
    })}
    {NODES.map((node) => (
      <circle
        key={`${node.x}-${node.y}`}
        cx={node.x}
        cy={node.y}
        r={node.gold ? 4.5 : 3}
        fill={node.gold ? brandColors.goldAmber : 'rgba(255,255,255,0.5)'}
      />
    ))}
  </Box>
);

/** "Join the Movement" CTA below every page: editorial pitch + newsletter signup + social links. */
export const NewsletterBanner = (): JSX.Element => {
  const subscribe = useSubscribe();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubscribeInput>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { name: '', email: '', consent: false },
  });

  const onSubmit = handleSubmit((values) => {
    subscribe.mutate(
      { ...values, source: 'newsletter-banner' },
      { onSuccess: () => reset({ name: '', email: '', consent: false }) },
    );
  });

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'common.black',
        color: 'common.white',
        borderTop: `3px solid ${brandColors.goldAmber}`,
        py: { xs: 7, md: 10 },
      }}
    >
      <NetworkMotif />
      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'center' }}>
          {/* Pitch */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <MarkEmailReadRoundedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography
                variant="overline"
                sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 2 }}
              >
                The IAA Newsletter
              </Typography>
            </Stack>
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: { xs: '2rem', md: '2.8rem' } }}
            >
              Join the{' '}
              <Box component="span" sx={{ color: 'secondary.main' }}>
                Movement
              </Box>
              .
            </Typography>
            <Typography sx={{ mt: 2, maxWidth: 460, opacity: 0.9, lineHeight: 1.7 }}>
              Field updates, opportunities, and stories of change across Africa — straight to your
              inbox, once a month.
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 4 }}>
              <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600 }}>
                Follow the journey
              </Typography>
              <SocialLinks color="inherit" />
            </Stack>
          </Grid>

          {/* Signup panel */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 2,
                p: { xs: 3, md: 4 },
              }}
            >
              {subscribe.isSuccess ? (
                <Stack spacing={1.5} alignItems="flex-start">
                  <CheckCircleRoundedIcon sx={{ color: 'primary.main', fontSize: 44 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    You&apos;re in — welcome to the movement!
                  </Typography>
                  <Typography sx={{ opacity: 0.85 }}>
                    Watch your inbox for our next dispatch from the field.
                  </Typography>
                </Stack>
              ) : (
                <Box component="form" onSubmit={onSubmit} noValidate>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Subscribe for updates
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, mb: 2.5, opacity: 0.82 }}>
                    Join changemakers across the continent. No spam — unsubscribe anytime.
                  </Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      placeholder="Your name (optional)"
                      autoComplete="name"
                      error={Boolean(errors.name)}
                      helperText={errors.name?.message}
                      sx={newsletterFieldSx}
                      {...register('name')}
                    />
                    <TextField
                      fullWidth
                      placeholder="Enter your email address"
                      type="email"
                      autoComplete="email"
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message}
                      sx={newsletterFieldSx}
                      {...register('email')}
                    />
                    <ConsentCheckbox
                      register={register('consent')}
                      error={errors.consent?.message}
                      label="I agree to receive updates and to the processing of my data under the"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      size="large"
                      fullWidth
                      disabled={subscribe.isPending}
                      endIcon={<SendRoundedIcon />}
                      sx={{ fontWeight: 700 }}
                    >
                      {subscribe.isPending ? 'Subscribing…' : 'Subscribe'}
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

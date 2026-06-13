import { zodResolver } from '@hookform/resolvers/zod';
import { subscribeSchema, type SubscribeInput } from '@iaa/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';

import { useSubscribe } from '../../lib/mutations';
import { SocialLinks } from '../SocialLinks';

/** "Join the Movement" footer CTA: newsletter signup + social links. */
export const NewsletterBanner = (): JSX.Element => {
  const subscribe = useSubscribe();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubscribeInput>({ resolver: zodResolver(subscribeSchema) });

  const onSubmit = handleSubmit((values) => {
    subscribe.mutate({ ...values, source: 'newsletter-banner' }, { onSuccess: () => reset() });
  });

  return (
    <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: { xs: 6, md: 8 } }}>
      <Container>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography variant="h3">Join the Movement.</Typography>
          <Typography sx={{ maxWidth: 560, opacity: 0.9 }}>
            Stay connected with IAA&apos;s work, opportunities, and stories of change across Africa.
          </Typography>

          {subscribe.isSuccess ? (
            <Typography sx={{ color: 'secondary.light', fontWeight: 600 }}>
              Thank you for subscribing — welcome to the movement!
            </Typography>
          ) : (
            <Box
              component="form"
              onSubmit={onSubmit}
              noValidate
              sx={{ width: '100%', maxWidth: 520 }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter your email address"
                  type="email"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  sx={{ bgcolor: 'common.white', borderRadius: 1 }}
                  {...register('email')}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  disabled={subscribe.isPending}
                >
                  {subscribe.isPending ? 'Subscribing…' : 'Subscribe'}
                </Button>
              </Stack>
            </Box>
          )}

          <Stack spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Follow the journey
            </Typography>
            <SocialLinks color="inherit" />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

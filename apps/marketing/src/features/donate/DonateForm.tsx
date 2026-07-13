import { zodResolver } from '@hookform/resolvers/zod';
import {
  brandColors,
  DONATION_PRESET_AMOUNTS_USD,
  DONATION_TIERS,
  PaymentProvider,
  createDonationSchema,
  type CreateDonationInput,
  type DonationInitResponse,
} from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { Elements } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';

import { useCreateDonation, usePaymentProviders } from '../../lib/mutations';

import { getStripe, isStripeEnabled } from './stripe';
import { StripeCheckout } from './StripeCheckout';

const DonationImpacts = (): JSX.Element => (
  <Stack spacing={1.25}>
    {DONATION_TIERS.map((tier, index) => {
      const featured = index === DONATION_TIERS.length - 1;
      return (
        <Box
          key={tier.amountUsd}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.75,
            borderRadius: 3,
            bgcolor: 'common.white',
            border: '1px solid',
            borderColor: featured ? 'secondary.main' : 'divider',
            color: 'common.black',
            boxShadow: featured ? `0 10px 28px -18px ${alpha(brandColors.gold, 0.7)}` : 'none',
            transition: (t) =>
              t.transitions.create(['transform', 'border-color', 'box-shadow'], {
                duration: t.transitions.duration.shorter,
              }),
            '&:hover': {
              transform: 'translateX(4px)',
              borderColor: featured ? 'secondary.main' : 'primary.light',
              boxShadow: '0 12px 26px -18px rgba(0,30,20,0.55)',
            },
          }}
        >
          <Box
            aria-hidden
            sx={{
              flexShrink: 0,
              minWidth: 84,
              py: 1,
              px: 1.5,
              borderRadius: 2,
              textAlign: 'center',
              color: featured ? 'secondary.contrastText' : 'common.black',
              bgcolor: (t) =>
                featured ? t.palette.secondary.main : alpha(t.palette.primary.main, 0.1),
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.1 }}>
              ${tier.amountUsd.toLocaleString()}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ lineHeight: 1.5, color: 'common.black' }}>
            {tier.impact}
          </Typography>
        </Box>
      );
    })}
  </Stack>
);

interface ProviderAvailability {
  stripe: boolean;
  paystack: boolean;
}

/** Stripe additionally needs the publishable key on the client; Paystack only the server secret. */
const useProviderAvailability = (): ProviderAvailability & {
  loaded: boolean;
  noneAvailable: boolean;
} => {
  const providers = usePaymentProviders();
  const stripe = Boolean(providers.data?.stripe) && isStripeEnabled();
  const paystack = Boolean(providers.data?.paystack);
  return {
    stripe,
    paystack,
    loaded: Boolean(providers.data),
    noneAvailable: Boolean(providers.data) && !stripe && !paystack,
  };
};

/** Fall back to whichever provider can take donations when the selection is unavailable. */
const resolveProvider = (
  current: CreateDonationInput['provider'],
  availability: ProviderAvailability,
): CreateDonationInput['provider'] | undefined => {
  if (current === PaymentProvider.Stripe && !availability.stripe && availability.paystack) {
    return PaymentProvider.Paystack;
  }
  if (current === PaymentProvider.Paystack && !availability.paystack && availability.stripe) {
    return PaymentProvider.Stripe;
  }
  return undefined;
};

/** Donation form: amount + provider selection, then Stripe Elements or Paystack redirect. */
export const DonateForm = (): JSX.Element => {
  const createDonation = useCreateDonation();
  const { loaded, stripe, paystack, noneAvailable } = useProviderAvailability();
  const [init, setInit] = useState<DonationInitResponse | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateDonationInput>({
    resolver: zodResolver(createDonationSchema) as Resolver<CreateDonationInput>,
    defaultValues: {
      provider: isStripeEnabled() ? PaymentProvider.Stripe : PaymentProvider.Paystack,
      amountUsd: 100,
      frequency: 'one-time',
      marketingConsent: false,
    },
  });

  const amount = watch('amountUsd');
  const provider = watch('provider');

  useEffect(() => {
    if (!loaded) {
      return;
    }
    const next = resolveProvider(provider, { stripe, paystack });
    if (next) {
      setValue('provider', next);
    }
  }, [loaded, provider, stripe, paystack, setValue]);

  const onSubmit = handleSubmit((values) => {
    createDonation.mutate(values, {
      onSuccess: (response) => {
        if (response.authorizationUrl) {
          window.location.href = response.authorizationUrl;
          return;
        }
        setInit(response);
      },
    });
  });

  if (init?.clientSecret) {
    return (
      <Elements stripe={getStripe()} options={{ clientSecret: init.clientSecret }}>
        <StripeCheckout />
      </Elements>
    );
  }

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1.5 }}
        >
          Your impact
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          The impact of your gift
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Every contribution is put to work directly — here&apos;s what each gift makes possible.
        </Typography>
        <DonationImpacts />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Choose an amount (USD)
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {DONATION_PRESET_AMOUNTS_USD.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset ? 'contained' : 'outlined'}
                  onClick={() => setValue('amountUsd', preset, { shouldValidate: true })}
                >
                  ${preset}
                </Button>
              ))}
            </Stack>
          </Box>

          <TextField
            label="Custom amount (USD)"
            type="number"
            error={Boolean(errors.amountUsd)}
            helperText={errors.amountUsd?.message}
            {...register('amountUsd', { valueAsNumber: true })}
          />

          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                exclusive
                color="primary"
                value={field.value}
                onChange={(_event, value) => value && field.onChange(value)}
              >
                <ToggleButton value="one-time">One-time</ToggleButton>
                <ToggleButton value="monthly">Monthly</ToggleButton>
              </ToggleButtonGroup>
            )}
          />

          <TextField label="Your name (optional)" {...register('donorName')} />
          <TextField
            label="Email address"
            type="email"
            error={Boolean(errors.donorEmail)}
            helperText={errors.donorEmail?.message}
            {...register('donorEmail')}
          />

          <Controller
            name="provider"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                exclusive
                fullWidth
                color="primary"
                value={field.value}
                onChange={(_event, value) => value && field.onChange(value)}
              >
                <ToggleButton value={PaymentProvider.Stripe} disabled={!stripe}>
                  Card (Stripe)
                </ToggleButton>
                <ToggleButton value={PaymentProvider.Paystack} disabled={!paystack}>
                  Card / Mobile (Paystack)
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          />

          {noneAvailable && (
            <Alert severity="warning">
              Online donations are temporarily unavailable. Please check back soon or contact us
              directly.
            </Alert>
          )}

          <FormControlLabel
            control={<Checkbox {...register('marketingConsent')} color="primary" />}
            label="Keep me updated on the impact of my donation and other IAA news (optional)."
          />

          {createDonation.isError && (
            <Alert severity="error">
              We couldn&apos;t start your donation. Please try another method or try again later.
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={createDonation.isPending || noneAvailable}
          >
            {createDonation.isPending
              ? 'Preparing…'
              : `Donate $${Number.isFinite(amount) ? amount : 0} ${provider === PaymentProvider.Stripe ? 'by card' : 'via Paystack'}`}
          </Button>
          <Typography variant="caption" color="text.secondary">
            IAA is committed to full financial transparency. Donation usage reports are published
            annually.
          </Typography>
        </Stack>
      </Grid>
    </Grid>
  );
};

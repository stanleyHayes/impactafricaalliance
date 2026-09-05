import { zodResolver } from '@hookform/resolvers/zod';
import {
  ORG,
  DONATION_PRESET_AMOUNTS_USD,
  PaymentProvider,
  createDonationSchema,
  type CreateDonationInput,
  type DonationInitResponse,
} from '@iaa/shared';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { Elements } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';

import { Watermark } from '../../components/Watermark';
import { useCreateDonation, usePaymentProviders } from '../../lib/mutations';

import { DonationImpacts } from './DonationImpacts';
import { getStripe, isStripeEnabled } from './stripe';
import { StripeCheckout } from './StripeCheckout';

interface ProviderAvailability {
  stripe: boolean;
  paystack: boolean;
}

/** Stripe additionally needs the publishable key on the client; Paystack only the server secret. */
const useProviderAvailability = (): ProviderAvailability & {
  loaded: boolean;
  noneAvailable: boolean;
  failed: boolean;
  loading: boolean;
  canPay: boolean;
  retry: () => void;
} => {
  const providers = usePaymentProviders();
  const stripe = Boolean(providers.data?.stripe) && isStripeEnabled();
  const paystack = Boolean(providers.data?.paystack);
  return {
    stripe,
    paystack,
    failed: providers.isError && !providers.data,
    loading: !providers.data && !providers.isError,
    canPay: stripe || paystack,
    retry: () => {
      void providers.refetch();
    },
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

const donationButtonLabel = ({
  pending,
  loaded,
  failed,
  noneAvailable,
  amount,
  provider,
}: {
  pending: boolean;
  loaded: boolean;
  failed: boolean;
  noneAvailable: boolean;
  amount: number;
  provider: CreateDonationInput['provider'];
}): string => {
  if (noneAvailable) return 'Online giving unavailable';
  if (failed) return 'Payment methods unavailable';
  if (!loaded) return 'Checking payment methods…';
  if (pending) return 'Preparing…';
  const value = Number.isFinite(amount) ? amount : 0;
  const method = provider === PaymentProvider.Stripe ? 'by card' : 'via Paystack';
  return `Donate $${value} ${method}`;
};

/** Donation form: amount + provider selection, then Stripe Elements or Paystack redirect. */
export const DonateForm = (): JSX.Element => {
  const createDonation = useCreateDonation();
  const { loaded, stripe, paystack, noneAvailable, failed, loading, canPay, retry } =
    useProviderAvailability();
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
    if (!loaded || noneAvailable || failed) return;
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
        <DonationImpacts
          amount={amount}
          onSelect={(value) => setValue('amountUsd', value, { shouldValidate: true })}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Stack
          component="form"
          aria-label="Make a donation"
          spacing={2.25}
          onSubmit={onSubmit}
          noValidate
          sx={{
            position: 'relative',
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            borderRadius: 4,
            p: { xs: 2.5, sm: 3 },
            bgcolor: (t) => alpha(t.palette.text.secondary, 0.045),
            '& > :not([aria-hidden])': { position: 'relative', zIndex: 1 },
            '& .MuiOutlinedInput-root': { bgcolor: (t) => alpha(t.palette.text.secondary, 0.035) },
          }}
        >
          <Watermark
            variant="contours"
            size={320}
            opacity={0.045}
            sx={{ color: 'text.secondary', animation: 'none' }}
          />
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <FavoriteBorderRoundedIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography variant="h5" component="h3">
                Make it possible
              </Typography>
              <Typography variant="body2" color="text.secondary">
                A gift towards a stronger community.
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Choose an amount (USD)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
              {DONATION_PRESET_AMOUNTS_USD.map((preset) => (
                <Button
                  key={preset}
                  variant="outlined"
                  color="inherit"
                  aria-pressed={amount === preset}
                  sx={{
                    minWidth: 0,
                    px: 1,
                    borderRadius: 2,
                    color: 'text.primary',
                    borderColor: amount === preset ? 'text.secondary' : 'divider',
                    bgcolor: (t) =>
                      alpha(t.palette.text.secondary, amount === preset ? 0.14 : 0.025),
                  }}
                  onClick={() => setValue('amountUsd', preset, { shouldValidate: true })}
                >
                  ${preset}
                </Button>
              ))}
            </Box>
          </Box>

          <TextField
            label="Custom amount (USD)"
            type="number"
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
              htmlInput: { min: 1, step: 1 },
            }}
            error={Boolean(errors.amountUsd)}
            helperText={errors.amountUsd?.message}
            {...register('amountUsd', { valueAsNumber: true })}
          />

          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                aria-label="Donation frequency"
                fullWidth
                exclusive
                color="standard"
                value={field.value}
                onChange={(_event, value) => value && field.onChange(value)}
              >
                <ToggleButton value="one-time">One-time</ToggleButton>
                <ToggleButton value="monthly">Monthly</ToggleButton>
              </ToggleButtonGroup>
            )}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr', lg: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              autoComplete="name"
              label="Your name (optional)"
              error={Boolean(errors.donorName)}
              helperText={errors.donorName?.message}
              {...register('donorName', {
                setValueAs: (value: string) => value.trim() || undefined,
              })}
            />
            <TextField
              autoComplete="email"
              label="Email address"
              type="email"
              error={Boolean(errors.donorEmail)}
              helperText={errors.donorEmail?.message}
              {...register('donorEmail')}
            />
          </Box>

          {canPay && (
            <Controller
              name="provider"
              control={control}
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  aria-label="Payment method"
                  color="standard"
                  value={field.value}
                  onChange={(_event, value) => value && field.onChange(value)}
                >
                  <ToggleButton value={PaymentProvider.Stripe} disabled={!stripe}>
                    <CreditCardRoundedIcon sx={{ mr: 0.75, fontSize: 18 }} /> Card (Stripe)
                  </ToggleButton>
                  <ToggleButton value={PaymentProvider.Paystack} disabled={!paystack}>
                    Card / Mobile money
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            />
          )}
          {loading && (
            <Skeleton variant="rounded" height={48} aria-label="Loading payment methods" />
          )}

          {failed && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" onClick={retry}>
                  Retry
                </Button>
              }
            >
              Payment methods could not be loaded.
            </Alert>
          )}

          {noneAvailable && (
            <Box
              role="status"
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: (t) => alpha(t.palette.text.secondary, 0.045),
              }}
            >
              <Typography variant="subtitle2">Online giving is currently unavailable</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Contact our team to discuss how you can support the Alliance.
              </Typography>
              <Button
                component="a"
                href={`mailto:${ORG.email}`}
                color="inherit"
                size="small"
                startIcon={<MailOutlineRoundedIcon />}
                sx={{ mt: 1, px: 0 }}
              >
                Contact us about giving
              </Button>
            </Box>
          )}

          <FormControlLabel
            sx={{
              alignItems: 'flex-start',
              '& .MuiFormControlLabel-label': { fontSize: '0.8rem', lineHeight: 1.5 },
              '& .MuiCheckbox-root': { pt: 0 },
            }}
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
            color="primary"
            size="large"
            disabled={createDonation.isPending || !canPay}
          >
            {donationButtonLabel({
              pending: createDonation.isPending,
              loaded,
              failed,
              noneAvailable,
              amount,
              provider,
            })}
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

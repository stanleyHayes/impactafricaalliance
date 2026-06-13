import { zodResolver } from '@hookform/resolvers/zod';
import {
  DONATION_PRESET_AMOUNTS_USD,
  DONATION_TIERS,
  PaymentProvider,
  createDonationSchema,
  type CreateDonationInput,
  type DonationInitResponse,
} from '@iaa/shared';
import CheckIcon from '@mui/icons-material/Check';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { Elements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';

import { useCreateDonation } from '../../lib/mutations';

import { getStripe, isStripeEnabled } from './stripe';
import { StripeCheckout } from './StripeCheckout';

const DonationImpacts = (): JSX.Element => (
  <List dense>
    {DONATION_TIERS.map((tier) => (
      <ListItem key={tier.amountUsd} disableGutters>
        <ListItemIcon sx={{ minWidth: 32 }}>
          <CheckIcon color="success" fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={`$${tier.amountUsd.toLocaleString()} — ${tier.impact}`} />
      </ListItem>
    ))}
  </List>
);

/** Donation form: amount + provider selection, then Stripe Elements or Paystack redirect. */
export const DonateForm = (): JSX.Element => {
  const createDonation = useCreateDonation();
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
    },
  });

  const amount = watch('amountUsd');
  const provider = watch('provider');

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
        <Typography variant="h6" gutterBottom>
          The impact of your gift
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
                <ToggleButton value={PaymentProvider.Stripe} disabled={!isStripeEnabled()}>
                  Card (Stripe)
                </ToggleButton>
                <ToggleButton value={PaymentProvider.Paystack}>
                  Card / Mobile (Paystack)
                </ToggleButton>
              </ToggleButtonGroup>
            )}
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
            disabled={createDonation.isPending}
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

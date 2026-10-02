import { formatMoney, type DonationConfirmation, type DonationCurrency } from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { ApiError, apiGet } from '../lib/api-client';

const ReferenceLine = ({ reference }: { reference: string }): JSX.Element => (
  <Typography variant="body2" color="text.secondary">
    Reference: {reference}
  </Typography>
);

/** The gift in the currency it was made in: GH₵100 through Paystack, $100 by card. */
const SucceededView = ({
  amount,
  currency,
}: {
  amount?: number;
  currency?: DonationCurrency;
}): JSX.Element => (
  <>
    <CheckCircleRoundedIcon sx={{ fontSize: 56, color: 'success.main' }} />
    <Typography variant="h5">Your donation was successful</Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      {amount && currency
        ? `We have received your donation of ${formatMoney(amount, currency)}. `
        : 'We have received your donation. '}
      Your support helps us equip youth, women, and communities across Africa. A receipt will be
      sent to your email address.
    </Typography>
    <Button component={RouterLink} to="/" variant="contained" sx={{ alignSelf: 'flex-start' }}>
      Back to homepage
    </Button>
  </>
);

const FailedView = ({
  reference,
  missing,
}: {
  reference: string;
  missing: boolean;
}): JSX.Element => (
  <>
    <ErrorOutlineRoundedIcon sx={{ fontSize: 56, color: 'error.main' }} />
    <Typography variant="h5">We could not confirm your donation</Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      {missing
        ? 'This page was opened without a payment reference.'
        : 'The payment was not completed or could not be verified. If money was deducted from your account, it will be reversed by your bank or you can contact us with your payment reference.'}
    </Typography>
    {reference && <ReferenceLine reference={reference} />}
    <Button
      component={RouterLink}
      to="/get-involved#donate"
      variant="contained"
      sx={{ alignSelf: 'flex-start' }}
    >
      Try again
    </Button>
  </>
);

/**
 * Not confirmed yet. The site hears nothing from Paystack on its own, so a payment that lands
 * after the donor is back (mobile money approved later) is confirmed by the API's hourly check.
 * That runs once an hour, and a run can come late, so the page says "usually".
 */
const PendingView = ({
  reference,
  checking,
  onCheck,
}: {
  reference: string;
  checking: boolean;
  onCheck: () => void;
}): JSX.Element => (
  <>
    <HourglassTopRoundedIcon sx={{ fontSize: 56, color: 'warning.main' }} />
    <Typography variant="h5">Your payment is being confirmed</Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      Paystack has not confirmed it yet. If you paid, your donation will usually be confirmed within
      an hour, so there is no need to pay again.
    </Typography>
    <ReferenceLine reference={reference} />
    <Button
      variant="contained"
      disabled={checking}
      onClick={onCheck}
      sx={{ alignSelf: 'flex-start' }}
    >
      {checking ? 'Checking…' : 'Check again'}
    </Button>
  </>
);

/**
 * Paystack's Cancel button brings the donor here. Nothing was paid, unless the quiet check the
 * page still makes finds a payment Paystack confirms (mobile money approved as they cancelled).
 */
const CancelledView = (): JSX.Element => (
  <>
    <UndoRoundedIcon sx={{ fontSize: 56, color: 'text.secondary' }} />
    <Typography variant="h5">You cancelled the payment</Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      Nothing was charged. If you would still like to give, you can start again whenever you are
      ready.
    </Typography>
    <Button
      component={RouterLink}
      to="/get-involved#donate"
      variant="contained"
      sx={{ alignSelf: 'flex-start' }}
    >
      Back to donate
    </Button>
  </>
);

/**
 * The API's 404: the reference is not one of the site's gifts. Any other failure (Paystack or
 * the API out of reach for a moment) says nothing about the payment, which the hourly check
 * will still confirm.
 */
const isUnknownGift = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404;

/**
 * Landing page for the Paystack checkout: its `callback_url` after paying, and its
 * `cancel_action` (`?cancelled=1`) when the donor presses Cancel. The API builds both.
 */
const DonateComplete = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? '';
  const cancelled = searchParams.get('cancelled') === '1';

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['paystack-verify', reference],
    queryFn: () =>
      apiGet<DonationConfirmation>(`/payments/paystack/verify/${encodeURIComponent(reference)}`),
    enabled: Boolean(reference),
    retry: 1,
  });

  const renderBody = (): JSX.Element => {
    // Straight away, without waiting for the check: only a confirmed payment changes it.
    if (cancelled && data?.status !== 'succeeded') {
      return <CancelledView />;
    }
    if (reference && (isLoading || !data) && !isError) {
      return (
        <Stack role="status" aria-label="Confirming your donation with Paystack" spacing={2}>
          <Skeleton variant="rounded" height={80} />
          <Skeleton width="70%" height={28} />
          <Skeleton width="45%" height={24} />
        </Stack>
      );
    }
    if (!reference) {
      return <FailedView reference="" missing />;
    }
    if (isUnknownGift(error) || data?.status === 'failed') {
      return <FailedView reference={reference} missing={false} />;
    }
    if (data?.status === 'succeeded') {
      return <SucceededView amount={data.amount} currency={data.currency} />;
    }
    return (
      <PendingView reference={reference} checking={isFetching} onCheck={() => void refetch()} />
    );
  };

  return (
    <>
      <Seo
        title="Donation status"
        description="Confirming your donation to Impact Africa Alliance."
      />
      <Box
        component="header"
        sx={{ bgcolor: 'common.black', color: 'common.white', py: { xs: 7, md: 10 } }}
      >
        <Container>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: '2.4rem', md: '3.25rem' }, lineHeight: 1.08 }}
          >
            {data?.status === 'succeeded' ? 'Thank you for your donation' : 'Donation status'}
          </Typography>
        </Container>
      </Box>

      <Container sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={2.5} alignItems="flex-start" sx={{ maxWidth: 560 }}>
          {renderBody()}
        </Stack>
      </Container>
    </>
  );
};

export default DonateComplete;

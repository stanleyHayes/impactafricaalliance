import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { apiGet } from '../lib/api-client';

interface PaystackVerifyResponse {
  status: 'pending' | 'succeeded' | 'failed';
  amountUsd?: number;
}

const ReferenceLine = ({ reference }: { reference: string }): JSX.Element => (
  <Typography variant="body2" color="text.secondary">
    Reference: {reference}
  </Typography>
);

const SucceededView = ({ amountUsd }: { amountUsd?: number }): JSX.Element => (
  <>
    <CheckCircleRoundedIcon sx={{ fontSize: 56, color: 'success.main' }} />
    <Typography variant="h5">Your donation was successful</Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      {amountUsd
        ? `We have received your donation of $${amountUsd.toLocaleString()}. `
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

const PendingView = ({ reference }: { reference: string }): JSX.Element => (
  <>
    <HourglassTopRoundedIcon sx={{ fontSize: 56, color: 'warning.main' }} />
    <Typography variant="h5">Your donation is being processed</Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      Paystack has not confirmed the payment yet. This usually takes a few seconds — you can
      refresh this page. If the amount was deducted, it will reflect shortly.
    </Typography>
    <ReferenceLine reference={reference} />
  </>
);

/** Landing page for the Paystack checkout redirect (`callback_url`). */
const DonateComplete = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['paystack-verify', reference],
    queryFn: () =>
      apiGet<PaystackVerifyResponse>(`/payments/paystack/verify/${encodeURIComponent(reference)}`),
    enabled: Boolean(reference),
    retry: 1,
  });

  const renderBody = (): JSX.Element => {
    if (reference && (isLoading || !data) && !isError) {
      return (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={28} />
          <Typography color="text.secondary">Confirming your donation with Paystack…</Typography>
        </Stack>
      );
    }
    if (!reference) {
      return <FailedView reference="" missing />;
    }
    if (isError || data?.status === 'failed') {
      return <FailedView reference={reference} missing={false} />;
    }
    if (data?.status === 'succeeded') {
      return <SucceededView amountUsd={data.amountUsd} />;
    }
    return <PendingView reference={reference} />;
  };

  return (
    <>
      <Seo title="Donation status" description="Confirming your donation to Impact Africa Alliance." />
      <Box component="header" sx={{ bgcolor: 'common.black', color: 'common.white', py: { xs: 7, md: 10 } }}>
        <Container>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.4rem', md: '3.25rem' }, lineHeight: 1.08 }}>
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

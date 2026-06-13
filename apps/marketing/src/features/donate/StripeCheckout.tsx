import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState } from 'react';

/** Stripe Payment Element + confirm step, rendered inside an <Elements> provider. */
export const StripeCheckout = (): JSX.Element => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (): Promise<void> => {
    if (!stripe || !elements) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/get-involved?donation=complete` },
    });
    if (result.error) {
      setError(result.error.message ?? 'Payment could not be completed.');
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <PaymentElement />
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        color="secondary"
        disabled={!stripe || submitting}
        onClick={handleConfirm}
      >
        {submitting ? 'Processing…' : 'Complete Donation'}
      </Button>
    </Stack>
  );
};

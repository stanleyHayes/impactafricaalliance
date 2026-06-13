import { loadStripe, type Stripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

/** Lazily load Stripe.js once. Returns null when no publishable key is set. */
export const getStripe = (): Promise<Stripe | null> => {
  if (!publishableKey) {
    return Promise.resolve(null);
  }
  stripePromise ??= loadStripe(publishableKey);
  return stripePromise;
};

export const isStripeEnabled = (): boolean => Boolean(publishableKey);

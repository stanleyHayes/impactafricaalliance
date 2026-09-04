import type {
  CreateDonationInput,
  EventRegistrationInput,
  EventRegistrationResult,
  DonationInitResponse,
  PaymentProvidersPublic,
  SubmissionInput,
  SubscribeInput,
} from '@iaa/shared';
import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

import { apiGet, apiPost } from './api-client';

export const useSubmitForm = (): UseMutationResult<{ id: string }, Error, SubmissionInput> =>
  useMutation({ mutationFn: (input) => apiPost<{ id: string }>('/submissions', input) });

export const useSubscribe = (): UseMutationResult<{ subscribed: true }, Error, SubscribeInput> =>
  useMutation({
    mutationFn: (input) => apiPost<{ subscribed: true }>('/submissions/subscribe', input),
  });

export const useRegisterForEvent = (
  eventId: string,
): UseMutationResult<EventRegistrationResult, Error, EventRegistrationInput> =>
  useMutation({
    mutationFn: (input) =>
      apiPost<EventRegistrationResult>(`/events/${eventId}/register`, input),
  });

export const useCreateDonation = (): UseMutationResult<
  DonationInitResponse,
  Error,
  CreateDonationInput
> => useMutation({ mutationFn: (input) => apiPost<DonationInitResponse>('/payments', input) });

/** Which payment providers are currently accepting donations (server-side toggle + keys). */
export const usePaymentProviders = (): UseQueryResult<PaymentProvidersPublic> =>
  useQuery({
    queryKey: ['payment-providers'],
    queryFn: () => apiGet<PaymentProvidersPublic>('/payments/providers'),
    staleTime: 60_000,
  });

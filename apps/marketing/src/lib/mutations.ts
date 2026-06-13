import type {
  CreateDonationInput,
  DonationInitResponse,
  SubmissionInput,
  SubscribeInput,
} from '@iaa/shared';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { apiPost } from './api-client';

export const useSubmitForm = (): UseMutationResult<{ id: string }, Error, SubmissionInput> =>
  useMutation({ mutationFn: (input) => apiPost<{ id: string }>('/submissions', input) });

export const useSubscribe = (): UseMutationResult<{ subscribed: true }, Error, SubscribeInput> =>
  useMutation({
    mutationFn: (input) => apiPost<{ subscribed: true }>('/submissions/subscribe', input),
  });

export const useCreateDonation = (): UseMutationResult<
  DonationInitResponse,
  Error,
  CreateDonationInput
> => useMutation({ mutationFn: (input) => apiPost<DonationInitResponse>('/payments', input) });

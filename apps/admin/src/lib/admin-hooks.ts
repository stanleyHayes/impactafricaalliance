import type {
  AiAssistInput,
  AiAssistResponse,
  ChangePasswordInput,
  CreateUserInput,
  Donation,
  Paginated,
  PublicUser,
  Submission,
  SubmissionStatus,
  Subscriber,
  UpdateProfileInput,
  UpdateUserInput,
} from '@iaa/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from './api-client';

export const useSubmissions = (params: {
  type?: string;
  status?: string;
}): UseQueryResult<Paginated<Submission>> => {
  const query = new URLSearchParams({ pageSize: '100' });
  if (params.type) {
    query.set('type', params.type);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  return useQuery({
    queryKey: ['submissions', params],
    queryFn: () => api.get<Paginated<Submission>>(`/admin/submissions?${query.toString()}`),
  });
};

export const useUpdateSubmissionStatus = (): UseMutationResult<
  Submission,
  Error,
  { id: string; status: SubmissionStatus }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch<Submission>(`/admin/submissions/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
  });
};

export const useSubscribers = (): UseQueryResult<Paginated<Subscriber>> =>
  useQuery({
    queryKey: ['subscribers'],
    queryFn: () =>
      api.get<Paginated<Subscriber>>('/admin/submissions/subscribers/list?pageSize=100'),
  });

export const useDonations = (): UseQueryResult<Paginated<Donation>> =>
  useQuery({
    queryKey: ['donations'],
    queryFn: () => api.get<Paginated<Donation>>('/admin/donations?pageSize=100'),
  });

/** Update the signed-in user's own profile (name / email). */
export const useUpdateProfile = (): UseMutationResult<PublicUser, Error, UpdateProfileInput> =>
  useMutation({ mutationFn: (body) => api.patch<PublicUser>('/auth/me', body) });

/** Change the signed-in user's own password. */
export const useChangePassword = (): UseMutationResult<void, Error, ChangePasswordInput> =>
  useMutation({ mutationFn: (body) => api.post<void>('/auth/change-password', body) });

/** Run an AI writing-assistant transformation over a block of text. */
export const useAiAssist = (): UseMutationResult<AiAssistResponse, Error, AiAssistInput> =>
  useMutation({ mutationFn: (body) => api.post<AiAssistResponse>('/admin/ai/assist', body) });

export const useUsers = (): UseQueryResult<PublicUser[]> =>
  useQuery({ queryKey: ['users'], queryFn: () => api.get<PublicUser[]>('/admin/users') });

export const useSaveUser = (): UseMutationResult<
  PublicUser,
  Error,
  { id?: string; body: CreateUserInput | UpdateUserInput }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      id
        ? api.patch<PublicUser>(`/admin/users/${id}`, body)
        : api.post<PublicUser>('/admin/users', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteUser = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete<void>(`/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};

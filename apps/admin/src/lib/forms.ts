import type {
  FormDefinition,
  FormInput,
  FormListItem,
  FormStatus,
  FormTemplateKey,
  FormType,
  FormUpdate,
  Paginated,
  PreviewLink,
} from '@iaa/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api, type ApiError } from './api-client';

/**
 * The form builder's data (plan §3.4). Every key starts with `forms`, so one
 * `invalidateQueries({ queryKey: ['forms'] })` after a change refreshes the
 * list, the form and its counts together.
 */
export const FORMS_KEY = ['forms'] as const;

export interface FormListParams {
  q?: string;
  status?: FormStatus;
  type?: FormType;
  /** Only archived forms: the Archived tab. */
  archived?: boolean;
  /** Archived forms alongside the rest, for pickers that must find any form. */
  includeArchived?: boolean;
  page: number;
  pageSize: number;
}

/** A query string from the values that are set, in a stable order for the cache key. */
export const queryString = (params: object): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const useForms = (
  params: FormListParams,
  enabled = true,
): UseQueryResult<Paginated<FormListItem>, ApiError> =>
  useQuery({
    queryKey: [...FORMS_KEY, 'list', params],
    queryFn: () => api.get<Paginated<FormListItem>>(`/admin/forms${queryString(params)}`),
    enabled,
    // Keeps the current page on screen while the next one loads, so the grid
    // does not collapse into a skeleton on every page turn.
    placeholderData: keepPreviousData,
  });

export const useForm = (id: string | undefined): UseQueryResult<FormDefinition, ApiError> =>
  useQuery({
    queryKey: [...FORMS_KEY, id],
    queryFn: () => api.get<FormDefinition>(`/admin/forms/${id}`),
    enabled: Boolean(id),
  });

/** What the editor sends to create a form. A template, when named, replaces the questions. */
export type FormCreateBody = Omit<FormInput, 'description' | 'intro'> & {
  description?: string;
  intro?: FormInput['intro'];
  template?: FormTemplateKey;
};

const useInvalidateForms = (): (() => Promise<void>) => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: FORMS_KEY });
};

export const useCreateForm = (): UseMutationResult<FormDefinition, ApiError, FormCreateBody> => {
  const invalidate = useInvalidateForms();
  return useMutation({
    mutationFn: (body) => api.post<FormDefinition>('/admin/forms', body),
    onSuccess: invalidate,
  });
};

export const useUpdateForm = (): UseMutationResult<
  FormDefinition,
  ApiError,
  { id: string; body: FormUpdate }
> => {
  const invalidate = useInvalidateForms();
  return useMutation({
    mutationFn: ({ id, body }) => api.patch<FormDefinition>(`/admin/forms/${id}`, body),
    onSuccess: invalidate,
  });
};

/** Publish, close, reopen or return to draft. The API refuses anyone but an administrator. */
export const useChangeFormStatus = (): UseMutationResult<
  FormDefinition,
  ApiError,
  { id: string; status: FormStatus }
> => {
  const invalidate = useInvalidateForms();
  return useMutation({
    mutationFn: ({ id, status }) =>
      api.patch<FormDefinition>(`/admin/forms/${id}/status`, { status }),
    onSuccess: invalidate,
  });
};

export const useArchiveForm = (): UseMutationResult<
  FormDefinition,
  ApiError,
  { id: string; archived: boolean }
> => {
  const invalidate = useInvalidateForms();
  return useMutation({
    mutationFn: ({ id, archived }) =>
      api.patch<FormDefinition>(`/admin/forms/${id}/archive`, { archived }),
    onSuccess: invalidate,
  });
};

export const useDuplicateForm = (): UseMutationResult<FormDefinition, ApiError, string> => {
  const invalidate = useInvalidateForms();
  return useMutation({
    mutationFn: (id) => api.post<FormDefinition>(`/admin/forms/${id}/duplicate`, {}),
    onSuccess: invalidate,
  });
};

export const useDeleteForm = (): UseMutationResult<void, ApiError, string> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete<void>(`/admin/forms/${id}`),
    onSuccess: async (_result, id) => {
      // The form is gone; asking for it again would only produce a 404.
      client.removeQueries({ queryKey: [...FORMS_KEY, id] });
      await client.invalidateQueries({ queryKey: FORMS_KEY });
    },
  });
};

/** A two-hour link to the real public page (plan D10). */
export const useFormPreview = (): UseMutationResult<PreviewLink, ApiError, string> =>
  useMutation({
    mutationFn: (id) => api.post<PreviewLink>(`/admin/forms/${id}/preview`, {}),
  });

/**
 * Where a form lives on the public site. The address is the marketing site's,
 * set for the dashboard in `VITE_SITE_URL`.
 */
export const publicFormUrl = (slug: string): string => {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  const base = (configured ?? 'https://www.impactafricaalliance.org').replace(/\/+$/, '');
  return `${base}/apply/${slug}`;
};

const INSTANT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * A moment in the reader's own time zone and on a 12-hour clock, as the
 * schedule pickers show it: "5 Oct 2026, 6:00 pm". A form's opening time is
 * picked in local time, so reading it back in UTC would look like a mistake.
 */
export const formatInstant = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : INSTANT_FORMAT.format(date);
};

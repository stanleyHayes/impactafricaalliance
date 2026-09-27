import {
  DRAFT_TOKEN_HEADER,
  PREVIEW_TOKEN_HEADER,
  type ApplicantDraft,
  type DraftCreateInput,
  type DraftSaveInput,
  type DraftSession,
  type DraftSubmitInput,
  type PublicForm,
  type ResumeLinkInput,
  type SignedApplicationUpload,
  type SubmissionReceipt,
  type UploadSignInput,
} from '@iaa/shared';

import { apiGet, apiPatch, apiPost } from '../../lib/api-client';

/**
 * Every call the applicant flow makes to the API (plan §3.4, public
 * `/api/forms`). The flow's tests mock this module whole, so nothing else in
 * the feature talks to the network except the direct upload to Cloudinary.
 *
 * Tokens always travel in headers, never in the path or query string, which
 * reach server logs and analytics (plan D8, D10).
 */

const formPath = (slug: string): string => `/forms/${encodeURIComponent(slug)}`;

const draftHeaders = (token: string): Record<string, string> => ({ [DRAFT_TOKEN_HEADER]: token });

/** A published form by slug. 404 when it is a draft, archived or unknown. */
export const getPublicForm = (slug: string, signal?: AbortSignal): Promise<PublicForm> =>
  apiGet<PublicForm>(formPath(slug), signal);

/** Any form, in any status, for a staff preview link. 404 when the token is bad or expired. */
export const getPreviewForm = (token: string, signal?: AbortSignal): Promise<PublicForm> =>
  apiGet<PublicForm>('/forms/preview', signal, { headers: { [PREVIEW_TOKEN_HEADER]: token } });

/** Start an application. 409 when the form is not open or has all the applications it takes. */
export const createDraft = (slug: string, input: DraftCreateInput = {}): Promise<DraftSession> =>
  apiPost<DraftSession>(`${formPath(slug)}/draft`, input);

/** The applicant's saved draft. 404 for a bad, expired or already submitted token. */
export const getDraft = (
  slug: string,
  token: string,
  signal?: AbortSignal,
): Promise<ApplicantDraft> =>
  apiGet<ApplicantDraft>(`${formPath(slug)}/draft`, signal, { headers: draftHeaders(token) });

/** Autosave: replaces the stored answers and remembers the step. */
export const saveDraft = (
  slug: string,
  token: string,
  input: DraftSaveInput,
): Promise<ApplicantDraft> =>
  apiPatch<ApplicantDraft>(`${formPath(slug)}/draft`, input, { headers: draftHeaders(token) });

/** Permission to upload one file for one question, straight to Cloudinary. */
export const signUpload = (
  slug: string,
  token: string,
  input: UploadSignInput,
  signal?: AbortSignal,
): Promise<SignedApplicationUpload> =>
  apiPost<SignedApplicationUpload>(`${formPath(slug)}/draft/uploads/sign`, input, {
    headers: draftHeaders(token),
    signal,
  });

/** Send the application. The answers sent here are the ones checked and kept. */
export const submitDraft = (
  slug: string,
  token: string,
  input: DraftSubmitInput,
): Promise<SubmissionReceipt> =>
  apiPost<SubmissionReceipt>(`${formPath(slug)}/draft/submit`, input, {
    headers: draftHeaders(token),
  });

/**
 * Ask for a link to finish later. The API answers 202 whatever happens, so an
 * address cannot be tested for a draft. A 202 may carry no body, which the
 * shared client cannot parse as JSON; that `SyntaxError` only happens after a
 * successful response, so it is success. A network failure is a `TypeError`
 * and an HTTP failure an `ApiError`, and both still reach the caller.
 */
export const requestResumeLink = async (
  slug: string,
  token: string,
  input: ResumeLinkInput,
): Promise<void> => {
  try {
    await apiPost<unknown>(`${formPath(slug)}/draft/resume-link`, input, {
      headers: draftHeaders(token),
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return;
    }
    throw error;
  }
};

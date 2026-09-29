import {
  answerFor,
  pruneHiddenAnswers,
  visibleSteps,
  type AnswerMap,
  type AnswerProblem,
  type DraftSaveInput,
  type FileAnswer,
  type FormAnswer,
  type FormField,
  type FormStep,
  type PublicForm,
  type SubmissionReceipt,
} from '@iaa/shared';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import {
  firstStepErrors,
  hasAnyAnswer,
  locateProblems,
  savableAnswers,
  stepProblems,
  submitProblems,
} from './answers';
import {
  createDraft,
  getDraft,
  requestResumeLink,
  saveDraft,
  signUpload,
  submitDraft,
} from './api';
import {
  clearStoredToken,
  peekResumeToken,
  readStoredToken,
  storeToken,
  takeResumeToken,
} from './draft-token';
import {
  DraftLostError,
  answerProblemsFrom,
  blockedPhaseFor,
  failureKind,
  failureMessage,
  loadFailurePhase,
} from './errors';
import { useApplicationForm, type FormSource } from './queries';
import {
  flowReducer,
  initialFlowState,
  type AnswerUpdate,
  type FlowState,
  type FocusRequest,
} from './session-state';
import { UploadCancelledError, uploadFile, type UploadHandle } from './upload';
import { useAutosave, type AutosaveStatus } from './use-autosave';

/**
 * Every screen the applicant flow can show.
 *
 * `loading → cover → steps → review → submitting → done` is the path through
 * the form; the rest replace it when the form cannot be filled in.
 */
export type SessionPhase =
  | 'loading'
  | 'cover'
  | 'steps'
  | 'review'
  | 'submitting'
  | 'done'
  | 'not-found'
  | 'not-yet-open'
  | 'closed'
  | 'limit-reached'
  | 'error';

export interface SessionActions {
  /** Start, or pick up a saved draft where it was left. */
  begin: () => void;
  /** Leave the saved draft behind and start with a blank form. */
  startOver: () => void;
  setAnswer: (fieldId: string, update: AnswerUpdate) => void;
  /** Check this step, then move on (or back to review when editing from there). */
  next: () => void;
  back: () => void;
  /** Open a step from the review screen. */
  editStep: (stepId: string) => void;
  submit: () => void;
  /** Try loading again after a failure. */
  retry: () => void;
  /** Tell the flow a file question has an upload running, which holds Continue. */
  setUploadBusy: (fieldId: string, busy: boolean) => void;
  uploadFile: (
    field: FormField,
    file: File,
    onProgress: (fraction: number) => void,
  ) => UploadHandle;
  /** Save now and email a link to finish later. */
  requestResumeLink: (email: string) => Promise<void>;
  /**
   * After the draft was lost, start a new one holding these answers, so saving
   * and uploads work again. Rejects with a message-bearing error when that
   * fails for a reason the person can try again.
   */
  continueAsNew: () => Promise<void>;
}

/**
 * What leaving the flow now would lose, so the page can ask first:
 *
 * - `uploading`: a file is still on its way and would not be added.
 * - `unsaved`: the latest change has not reached the server and saving is
 *   failing (offline, or retrying), or the draft stopped working.
 * - `no-drafts`: this form keeps nothing part-way, so every answer would go.
 *
 * Null when nothing would be lost, including when autosave has everything.
 *
 * This replaces the browser's own "Leave site?" prompt, which could not be
 * worded or styled and interrupted people whose answers were already safe.
 */
export type LeaveRisk = 'uploading' | 'unsaved' | 'no-drafts' | null;

export interface FormSession {
  phase: SessionPhase;
  form: PublicForm | undefined;
  preview: boolean;
  /** Autosave and resume are on for this form (never in a preview). */
  drafts: boolean;
  /** "Save and finish later" is offered (simulated in a preview). */
  canSaveForLater: boolean;
  answers: AnswerMap;
  /** The steps the person can see, given their answers so far. */
  steps: FormStep[];
  stepIndex: number;
  currentStep: FormStep | undefined;
  errors: Record<string, string>;
  focus: FocusRequest | null;
  hasDraft: boolean;
  beginning: boolean;
  /** The draft's token stopped working; see `FlowState.draftLost`. */
  draftLost: boolean;
  /** Whether any file has been added, which a new application would need again. */
  hasFiles: boolean;
  returnToReview: boolean;
  notice: string | null;
  receipt: SubmissionReceipt | null;
  autosave: AutosaveStatus;
  uploading: boolean;
  /** What leaving now would lose, read at the moment of leaving. See `LeaveRisk`. */
  leaveRisk: () => LeaveRisk;
  actions: SessionActions;
}

interface PhaseInput {
  isPending: boolean;
  isFetching: boolean;
  error: Error | null;
  form: PublicForm | undefined;
  state: FlowState;
  preview: boolean;
}

const derivePhase = ({
  isPending,
  isFetching,
  error,
  form,
  state,
  preview,
}: PhaseInput): SessionPhase => {
  // Trying again after a failed load shows the loading screen at once, rather
  // than leaving the error up until the answer arrives.
  if (error && !form) {
    return isFetching ? 'loading' : loadFailurePhase(error, preview);
  }
  if (isPending || !form) {
    return 'loading';
  }
  if (state.blocked) {
    return state.blocked;
  }
  if (state.view === 'done') {
    return 'done';
  }
  // A preview shows the form whatever its schedule, so staff can check it
  // before it opens.
  if (!preview && form.window !== 'open') {
    return form.window;
  }
  // Only a form that keeps drafts waits for one; a stored token for a form
  // without drafts is simply dropped.
  if (state.draftCheck === 'pending' && form.settings.allowDrafts) {
    return 'loading';
  }
  return state.draftCheck === 'failed' ? 'error' : state.view;
};

const previewReceipt = (form: PublicForm): SubmissionReceipt => ({
  reference: 'APP-PREVIEW',
  submittedAt: new Date().toISOString(),
  ...(form.settings.successMessage ? { successMessage: form.settings.successMessage } : {}),
});

// A stand-in for an uploaded file, so a preview can be clicked through past a
// required upload without sending anything anywhere.
const previewFileAnswer = (field: FormField, file: File): FileAnswer => {
  const dot = file.name.lastIndexOf('.');
  return {
    publicId: `preview/${field.id}-${Date.now()}`,
    url: 'https://preview.invalid/file',
    name: file.name,
    ...(dot === -1 ? {} : { format: file.name.slice(dot + 1).toLowerCase() }),
    bytes: file.size,
  };
};

const RESUME_LINK_GONE =
  'That link no longer opens an application. It may already have been sent, or the link has expired. You can start a new application here.';

const FORM_CHANGED =
  'This form has changed since you opened it. Check the new or changed questions below, then send your application again.';

const LOST_UPLOAD_MESSAGE =
  'Files cannot be added to this application any more. Choose “Continue as a new application” at the top of the page, then add the file again.';

const hasFileAnswers = (form: PublicForm | undefined, answers: AnswerMap): boolean =>
  form !== undefined &&
  form.steps.some((step) =>
    step.fields.some((field) => {
      const value = answerFor(answers, field.id);
      return field.type === 'file' && Array.isArray(value) && value.length > 0;
    }),
  );

const isActiveView = (view: FlowState['view']): boolean =>
  view === 'steps' || view === 'review' || view === 'submitting';

// Saves that have not got through. A change still waiting out the quiet
// period, or a save on its way, is sent when the flow closes, so neither
// needs the person to stay.
const STUCK_SAVES = new Set<AutosaveStatus['kind']>(['retrying', 'offline', 'failed']);

interface LeaveRiskInput {
  uploading: boolean;
  drafts: boolean;
  /** The draft stopped working, so nothing typed since is being saved. */
  draftLost: boolean;
  /** A change the server has not got, with saving currently failing. */
  stuck: boolean;
  answered: boolean;
}

const leaveRiskFor = (input: LeaveRiskInput): LeaveRisk => {
  if (input.uploading) {
    return 'uploading';
  }
  if (!input.drafts) {
    return input.answered ? 'no-drafts' : null;
  }
  return input.stuck || (input.draftLost && input.answered) ? 'unsaved' : null;
};

/**
 * The applicant flow's state machine (spec §7, plan §5.1, D8).
 *
 * Owns the answers, which step is showing, validation per step, the draft
 * token, autosave and submission. Screens only render what it returns and call
 * its actions, so the same flow drives the public page and the staff preview;
 * a preview never writes anything to the API.
 */
export const useFormSession = (source: FormSource): FormSession => {
  const preview = source.kind === 'preview';
  const slug = source.kind === 'public' ? source.slug : '';
  const query = useApplicationForm(source);
  const form = query.data;
  // Known before the first render, so a visitor with nothing saved goes
  // straight from loading to the cover with no extra loading step between.
  const [checkForDraft] = useState(
    () => !preview && (peekResumeToken() ?? readStoredToken(slug)) !== null,
  );
  const [state, dispatch] = useReducer(flowReducer, checkForDraft, initialFlowState);
  const tokenRef = useRef<string | null>(null);
  // A resume link's token, kept here too in case this browser refuses storage.
  const resumeTokenRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  // Mirrors `state.draftLost` for the async paths (autosave, uploads) that
  // must not wait for a render to learn the token is dead.
  const lostRef = useRef(false);
  const [busyUploads, setBusyUploads] = useState<Record<string, boolean>>({});

  const drafts = !preview && Boolean(form?.settings.allowDrafts);
  const steps = useMemo(
    () => (form ? visibleSteps(form.steps, state.answers) : []),
    [form, state.answers],
  );
  const foundIndex = steps.findIndex((step) => step.id === state.stepId);
  const stepIndex = foundIndex === -1 ? 0 : foundIndex;
  const currentStep = steps[stepIndex];
  const currentStepId = currentStep?.id;
  const uploading = Object.values(busyUploads).some(Boolean);

  const rememberToken = useCallback(
    (token: string): void => {
      tokenRef.current = token;
      // Without drafts nothing is offered for later, so the token lives only
      // as long as this page: it is needed to sign uploads and to submit.
      if (drafts) {
        storeToken(slug, token);
      }
    },
    [drafts, slug],
  );

  /**
   * A new draft holding these answers, once the person has chosen to carry on
   * after the old one was lost. Never done without asking: the old token may
   * have stopped working because the application was already sent.
   */
  const recoverDraft = useCallback(
    async (answers: FormAnswer[]): Promise<string> => {
      const session = await createDraft(slug, { answers });
      rememberToken(session.token);
      lostRef.current = false;
      dispatch({ type: 'draft-renewed' });
      return session.token;
    },
    [rememberToken, slug],
  );

  const markLost = useCallback((): void => {
    lostRef.current = true;
    dispatch({ type: 'draft-lost' });
  }, []);

  const saveNow = useCallback(
    async (payload: DraftSaveInput): Promise<void> => {
      if (submittingRef.current) {
        return;
      }
      const token = tokenRef.current;
      if (!token) {
        throw new Error('There is no draft to save to.');
      }
      try {
        await saveDraft(slug, token, payload);
      } catch (error) {
        // A save that lands after Submit is refused because the draft is no
        // longer a draft; that is expected, not something to recover from.
        // Nor is a refusal for a token already replaced by a new draft.
        if (submittingRef.current || tokenRef.current !== token) {
          return;
        }
        if (failureKind(error) !== 'not-found') {
          throw error;
        }
        markLost();
        throw new DraftLostError();
      }
    },
    [markLost, slug],
  );

  const autosave = useAutosave({
    enabled: drafts && !state.draftLost && (state.view === 'steps' || state.view === 'review'),
    save: saveNow,
  });
  const { schedule, flush, cancel, hasUnsent } = autosave;

  const payloadFor = useCallback(
    (answers: AnswerMap, stepId: string | undefined): DraftSaveInput => ({
      answers: form ? savableAnswers(form.steps, answers) : [],
      ...(stepId ? { currentStepId: stepId } : {}),
    }),
    [form],
  );

  // A resume link's token is taken out of the address bar at once, before the
  // form has even loaded, so it is never left sitting in the URL.
  useEffect(() => {
    if (!preview && slug) {
      resumeTokenRef.current = takeResumeToken(slug) ?? resumeTokenRef.current;
    }
  }, [preview, slug]);

  const formLoaded = form !== undefined;
  const formAllowsDrafts = form?.settings.allowDrafts === true;
  useEffect(() => {
    if (preview || !formLoaded || state.draftCheck !== 'pending') {
      return undefined;
    }
    const token = resumeTokenRef.current ?? readStoredToken(slug);
    const forget = (): void => {
      resumeTokenRef.current = null;
      clearStoredToken(slug);
    };
    if (!token || !formAllowsDrafts) {
      if (token) {
        forget();
      }
      dispatch({ type: 'draft-checked', draft: null });
      return undefined;
    }
    const controller = new AbortController();
    getDraft(slug, token, controller.signal).then(
      (draft) => {
        const usable = draft.status === 'draft';
        tokenRef.current = usable ? token : null;
        if (!usable) {
          forget();
        }
        dispatch({ type: 'draft-checked', draft: usable ? draft : null });
      },
      (error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (failureKind(error) === 'not-found') {
          // Someone who followed an emailed link expects their answers; say
          // why the form is blank rather than leave them wondering.
          const fromLink = resumeTokenRef.current === token;
          forget();
          dispatch({
            type: 'draft-checked',
            draft: null,
            ...(fromLink ? { notice: RESUME_LINK_GONE } : {}),
          });
          return;
        }
        dispatch({ type: 'draft-check-failed' });
      },
    );
    return () => controller.abort();
  }, [formAllowsDrafts, formLoaded, preview, slug, state.draftCheck]);

  // Autosave follows real changes to answers only (see `changeSeq`), never a
  // draft being loaded back in.
  useEffect(() => {
    if (state.changeSeq > 0) {
      schedule(payloadFor(state.answers, currentStepId));
    }
  }, [currentStepId, payloadFor, schedule, state.answers, state.changeSeq]);

  // Read when the person goes to leave, so it always sees the latest answers
  // and upload state without making the check change on every keystroke.
  const leaveRiskRef = useRef<() => LeaveRisk>(() => null);
  useEffect(() => {
    leaveRiskRef.current = () =>
      leaveRiskFor({
        uploading,
        drafts,
        draftLost: state.draftLost,
        stuck: hasUnsent() && STUCK_SAVES.has(autosave.status.kind),
        answered: hasAnyAnswer(state.answers),
      });
  }, [autosave.status.kind, drafts, hasUnsent, state.answers, state.draftLost, uploading]);
  const guarding = !preview && isActiveView(state.view);
  const leaveRisk = useCallback(
    (): LeaveRisk => (guarding ? leaveRiskRef.current() : null),
    [guarding],
  );

  const showProblems = useCallback(
    (problems: readonly AnswerProblem[], returnToReview: boolean, notice?: string): boolean => {
      const first = firstStepErrors(problems);
      if (!first) {
        return false;
      }
      dispatch({ type: 'invalid', ...first, returnToReview, ...(notice ? { notice } : {}) });
      return true;
    },
    [],
  );

  const begin = useCallback((): void => {
    if (!form || state.beginning) {
      return;
    }
    if (state.hasDraft) {
      dispatch({ type: 'resume' });
      return;
    }
    if (preview) {
      dispatch({ type: 'begun' });
      return;
    }
    dispatch({ type: 'begin-start' });
    createDraft(slug).then(
      (session) => {
        rememberToken(session.token);
        dispatch({ type: 'begun' });
      },
      (error: unknown) => {
        const blocked = blockedPhaseFor(error, form.window);
        dispatch(
          blocked
            ? { type: 'blocked', phase: blocked }
            : { type: 'begin-failed', notice: failureMessage(error) },
        );
      },
    );
  }, [form, preview, rememberToken, slug, state.beginning, state.hasDraft]);

  const startOver = useCallback((): void => {
    if (!preview) {
      clearStoredToken(slug);
    }
    tokenRef.current = null;
    resumeTokenRef.current = null;
    lostRef.current = false;
    cancel();
    dispatch({ type: 'start-over' });
  }, [cancel, preview, slug]);

  const setAnswer = useCallback((fieldId: string, update: AnswerUpdate): void => {
    dispatch({ type: 'answer', fieldId, update });
  }, []);

  const next = useCallback((): void => {
    if (!form || uploading) {
      return;
    }
    if (!currentStep) {
      dispatch({ type: 'go-review' });
      return;
    }
    if (
      showProblems(stepProblems(form.steps, state.answers, currentStep.id), state.returnToReview)
    ) {
      return;
    }
    if (state.returnToReview) {
      // An edit can reveal questions further on; check the whole form so the
      // person is taken to anything new before the review screen.
      const all = submitProblems(form.steps, state.answers);
      if (!showProblems(all, true)) {
        dispatch({ type: 'go-review' });
      }
      void flush(payloadFor(state.answers, currentStep.id));
      return;
    }
    const following = steps[stepIndex + 1];
    dispatch(following ? { type: 'go-step', stepId: following.id } : { type: 'go-review' });
    void flush(payloadFor(state.answers, following?.id ?? currentStep.id));
  }, [currentStep, flush, form, payloadFor, showProblems, state, stepIndex, steps, uploading]);

  const back = useCallback((): void => {
    if (uploading) {
      return;
    }
    if (state.view === 'review') {
      const last = steps[steps.length - 1];
      dispatch(last ? { type: 'go-step', stepId: last.id } : { type: 'go-cover' });
      return;
    }
    const previous = steps[stepIndex - 1];
    dispatch(previous ? { type: 'go-step', stepId: previous.id } : { type: 'go-cover' });
    void flush(payloadFor(state.answers, previous?.id ?? currentStepId));
  }, [currentStepId, flush, payloadFor, state, stepIndex, steps, uploading]);

  const editStep = useCallback((stepId: string): void => {
    dispatch({ type: 'go-step', stepId, fromReview: true });
  }, []);

  /**
   * Send the answers. A lost draft is replaced first only because the person
   * pressed "Send as a new application"; a token refused now is reported, not
   * worked around, since the likeliest reason is that it was already sent.
   */
  const sendSubmission = useCallback(
    async (answers: FormAnswer[], asNew: boolean): Promise<SubmissionReceipt> => {
      const token = asNew || !tokenRef.current ? await recoverDraft(answers) : tokenRef.current;
      try {
        return await submitDraft(slug, token, { answers });
      } catch (error) {
        if (failureKind(error) !== 'not-found') {
          throw error;
        }
        markLost();
        throw new DraftLostError();
      }
    },
    [markLost, recoverDraft, slug],
  );

  const { refetch, isError } = query;

  const handleSubmitFailure = useCallback(
    (error: unknown, sent: FormAnswer[]): void => {
      if (error instanceof DraftLostError) {
        // The flow is already back on the review screen with the choice shown.
        return;
      }
      const problems = answerProblemsFrom(error, sent);
      const located = locateProblems(problems, steps);
      if (
        showProblems(located, true, 'Please check this answer, then send your application again.')
      ) {
        return;
      }
      if (problems.length > 0) {
        // The server checked against questions this page does not have: the
        // form was edited after it was opened. Load it again so the new
        // questions appear, rather than refuse the same send for ever.
        void refetch();
        dispatch({ type: 'submit-failed', notice: FORM_CHANGED });
        return;
      }
      const blocked = blockedPhaseFor(error, form?.window);
      dispatch(
        blocked
          ? { type: 'blocked', phase: blocked }
          : { type: 'submit-failed', notice: failureMessage(error) },
      );
    },
    [form?.window, refetch, showProblems, steps],
  );

  const submit = useCallback((): void => {
    if (!form || uploading || state.view === 'submitting') {
      return;
    }
    if (showProblems(submitProblems(form.steps, state.answers), true)) {
      return;
    }
    if (preview) {
      dispatch({ type: 'submitted', receipt: previewReceipt(form) });
      return;
    }
    const sent = pruneHiddenAnswers(form.steps, state.answers);
    submittingRef.current = true;
    cancel();
    dispatch({ type: 'submit-start' });
    sendSubmission(sent, state.draftLost).then(
      (receipt) => {
        clearStoredToken(slug);
        tokenRef.current = null;
        dispatch({ type: 'submitted', receipt });
      },
      (error: unknown) => {
        submittingRef.current = false;
        handleSubmitFailure(error, sent);
      },
    );
  }, [
    cancel,
    form,
    handleSubmitFailure,
    preview,
    sendSubmission,
    showProblems,
    slug,
    state.answers,
    state.draftLost,
    state.view,
    uploading,
  ]);

  const retry = useCallback((): void => {
    if (isError) {
      void refetch();
      return;
    }
    dispatch({ type: 'draft-recheck' });
  }, [isError, refetch]);

  const setUploadBusy = useCallback((fieldId: string, busy: boolean): void => {
    setBusyUploads((current) =>
      Boolean(current[fieldId]) === busy ? current : { ...current, [fieldId]: busy },
    );
  }, []);

  const startUpload = useCallback(
    (field: FormField, file: File, onProgress: (fraction: number) => void): UploadHandle => {
      if (preview) {
        onProgress(1);
        return { promise: Promise.resolve(previewFileAnswer(field, file)), abort: () => undefined };
      }
      const controller = new AbortController();
      let upload: UploadHandle | null = null;
      const sign = async (token: string) => {
        try {
          return await signUpload(
            slug,
            token,
            { fieldId: field.id, filename: file.name, bytes: file.size },
            controller.signal,
          );
        } catch (error) {
          if (failureKind(error) === 'not-found' && tokenRef.current === token) {
            markLost();
            throw new DraftLostError(LOST_UPLOAD_MESSAGE);
          }
          throw error;
        }
      };
      const run = async (): Promise<FileAnswer> => {
        const token = tokenRef.current;
        if (lostRef.current) {
          throw new DraftLostError(LOST_UPLOAD_MESSAGE);
        }
        if (!token) {
          throw new Error('Go back to the start and begin again before adding files.');
        }
        try {
          const signed = await sign(token);
          if (controller.signal.aborted) {
            throw new UploadCancelledError();
          }
          upload = uploadFile(signed, file, onProgress);
          return await upload.promise;
        } catch (error) {
          throw controller.signal.aborted ? new UploadCancelledError() : error;
        }
      };
      return {
        promise: run(),
        abort: () => {
          controller.abort();
          upload?.abort();
        },
      };
    },
    [markLost, preview, slug],
  );

  const sendResumeLink = useCallback(
    async (email: string): Promise<void> => {
      if (preview) {
        return;
      }
      // Save first so the link opens the answers as they are now.
      await flush(payloadFor(state.answers, currentStepId));
      const token = tokenRef.current;
      if (!token) {
        throw new Error('Start the application before asking for a link.');
      }
      await requestResumeLink(slug, token, { email });
    },
    [currentStepId, flush, payloadFor, preview, slug, state.answers],
  );

  const continueAsNew = useCallback(async (): Promise<void> => {
    if (!form || !lostRef.current) {
      return;
    }
    try {
      await recoverDraft(savableAnswers(form.steps, state.answers));
      // The new draft already holds these answers; nothing is waiting any more.
      cancel();
    } catch (error) {
      const blocked = blockedPhaseFor(error, form.window);
      if (blocked) {
        dispatch({ type: 'blocked', phase: blocked });
        return;
      }
      throw new Error(failureMessage(error));
    }
  }, [cancel, form, recoverDraft, state.answers]);

  const actions = useMemo<SessionActions>(
    () => ({
      begin,
      startOver,
      setAnswer,
      next,
      back,
      editStep,
      submit,
      retry,
      setUploadBusy,
      uploadFile: startUpload,
      requestResumeLink: sendResumeLink,
      continueAsNew,
    }),
    [
      back,
      begin,
      continueAsNew,
      editStep,
      next,
      retry,
      sendResumeLink,
      setAnswer,
      setUploadBusy,
      startOver,
      startUpload,
      submit,
    ],
  );

  return {
    phase: derivePhase({
      isPending: query.isPending,
      isFetching: query.isFetching,
      error: query.error,
      form,
      state,
      preview,
    }),
    form,
    preview,
    drafts,
    // A lost draft has no link to send: the API would quietly send nothing.
    canSaveForLater: formAllowsDrafts && !state.draftLost,
    answers: state.answers,
    steps,
    stepIndex,
    currentStep,
    errors: state.errors,
    focus: state.focus,
    hasDraft: state.hasDraft,
    beginning: state.beginning,
    draftLost: state.draftLost,
    hasFiles: hasFileAnswers(form, state.answers),
    returnToReview: state.returnToReview,
    notice: state.notice,
    receipt: state.receipt,
    autosave: autosave.status,
    uploading,
    leaveRisk,
    actions,
  };
};

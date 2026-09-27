import {
  answerFor,
  answersToMap,
  type AnswerMap,
  type AnswerValue,
  type ApplicantDraft,
  type SubmissionReceipt,
} from '@iaa/shared';

import { sameAnswer } from './answers';
import type { UnavailablePhase } from './errors';

/**
 * The applicant flow's state and the only ways it changes, kept free of
 * React and the network so each transition can be read (and tested) alone.
 */

/** Where the person is in the flow once the form has loaded. */
export type FlowView = 'cover' | 'steps' | 'review' | 'submitting' | 'done';

/** Screens that replace the flow when the form cannot be filled in. */
export type BlockedPhase = 'not-found' | UnavailablePhase;

/** A request to move focus to a question; `seq` makes a repeat request a change. */
export interface FocusRequest {
  fieldId: string;
  seq: number;
}

export interface FlowState {
  view: FlowView;
  blocked: BlockedPhase | null;
  /** Looking for a saved draft before the cover can say Begin or Continue. */
  draftCheck: 'pending' | 'done' | 'failed';
  answers: AnswerMap;
  /** Bumped on every real change to an answer, which is what autosave follows. */
  changeSeq: number;
  stepId: string | null;
  /** The step was opened from the review screen, so Continue goes back there. */
  returnToReview: boolean;
  errors: Record<string, string>;
  focus: FocusRequest | null;
  hasDraft: boolean;
  resumeStepId: string | null;
  beginning: boolean;
  /** A message about the last action that failed (Begin or Submit). */
  notice: string | null;
  receipt: SubmissionReceipt | null;
  /**
   * The API no longer knows this draft's token: the application was sent from
   * another device or an earlier try, or the draft expired. Nothing more is
   * saved or sent until the person chooses to carry on as a new application,
   * because doing that for them could send the same application twice.
   */
  draftLost: boolean;
}

export type AnswerUpdate = AnswerValue | ((previous: AnswerValue | undefined) => AnswerValue);

export type FlowAction =
  | { type: 'draft-checked'; draft: ApplicantDraft | null; notice?: string }
  | { type: 'draft-check-failed' }
  | { type: 'draft-recheck' }
  | { type: 'begin-start' }
  | { type: 'begun' }
  | { type: 'begin-failed'; notice: string }
  | { type: 'resume' }
  | { type: 'start-over' }
  | { type: 'answer'; fieldId: string; update: AnswerUpdate }
  | { type: 'go-step'; stepId: string; fromReview?: boolean }
  | { type: 'go-cover' }
  | { type: 'go-review' }
  | {
      type: 'invalid';
      stepId: string;
      errors: Record<string, string>;
      focusFieldId: string;
      returnToReview: boolean;
      notice?: string;
    }
  | { type: 'submit-start' }
  | { type: 'submit-failed'; notice: string }
  | { type: 'submitted'; receipt: SubmissionReceipt }
  | { type: 'blocked'; phase: BlockedPhase }
  | { type: 'draft-lost' }
  | { type: 'draft-renewed' };

export const initialFlowState = (checkForDraft: boolean): FlowState => ({
  view: 'cover',
  blocked: null,
  draftCheck: checkForDraft ? 'pending' : 'done',
  answers: {},
  changeSeq: 0,
  stepId: null,
  returnToReview: false,
  errors: {},
  focus: null,
  hasDraft: false,
  resumeStepId: null,
  beginning: false,
  notice: null,
  receipt: null,
  draftLost: false,
});

// Every screen change starts clean: errors belong to the step they were
// found on, and a notice to the action that raised it.
const moveTo = (state: FlowState, changes: Partial<FlowState>): FlowState => ({
  ...state,
  errors: {},
  notice: null,
  focus: null,
  ...changes,
});

const applyAnswer = (state: FlowState, fieldId: string, update: AnswerUpdate): FlowState => {
  const previous = answerFor(state.answers, fieldId);
  const value = typeof update === 'function' ? update(previous) : update;
  if (previous !== undefined && sameAnswer(previous, value)) {
    return state;
  }
  // The person has changed the answer, so its old error no longer applies.
  const errors = { ...state.errors };
  delete errors[fieldId];
  return {
    ...state,
    answers: { ...state.answers, [fieldId]: value },
    changeSeq: state.changeSeq + 1,
    errors,
  };
};

type Handlers = {
  [Type in FlowAction['type']]: (
    state: FlowState,
    action: Extract<FlowAction, { type: Type }>,
  ) => FlowState;
};

const HANDLERS: Handlers = {
  'draft-checked': (state, { draft, notice }) =>
    draft
      ? {
          ...state,
          draftCheck: 'done',
          hasDraft: true,
          answers: answersToMap(draft.answers),
          resumeStepId: draft.currentStepId ?? null,
        }
      : { ...state, draftCheck: 'done', notice: notice ?? state.notice },
  'draft-check-failed': (state) => ({ ...state, draftCheck: 'failed' }),
  'draft-recheck': (state) => ({ ...state, draftCheck: 'pending' }),
  'begin-start': (state) => ({ ...state, beginning: true, notice: null }),
  // From here on the cover offers to continue: going back to it and pressing
  // the button again must pick this application up, not start a second one.
  begun: (state) =>
    moveTo(state, { view: 'steps', stepId: null, beginning: false, hasDraft: true }),
  'begin-failed': (state, { notice }) => ({ ...state, beginning: false, notice }),
  resume: (state) => moveTo(state, { view: 'steps', stepId: state.resumeStepId }),
  'start-over': (state) => ({
    ...initialFlowState(false),
    changeSeq: state.changeSeq,
  }),
  answer: (state, { fieldId, update }) => applyAnswer(state, fieldId, update),
  'go-step': (state, { stepId, fromReview }) =>
    moveTo(state, {
      view: 'steps',
      stepId,
      returnToReview: fromReview ?? false,
    }),
  'go-cover': (state) => moveTo(state, { view: 'cover', returnToReview: false }),
  'go-review': (state) => moveTo(state, { view: 'review', returnToReview: false }),
  invalid: (state, action) => ({
    ...state,
    view: 'steps',
    stepId: action.stepId,
    errors: action.errors,
    returnToReview: action.returnToReview,
    notice: action.notice ?? null,
    focus: { fieldId: action.focusFieldId, seq: (state.focus?.seq ?? 0) + 1 },
  }),
  'submit-start': (state) => ({ ...state, view: 'submitting', notice: null }),
  'submit-failed': (state, { notice }) => ({ ...state, view: 'review', notice }),
  submitted: (state, { receipt }) => moveTo(state, { view: 'done', receipt, hasDraft: false }),
  blocked: (state, { phase }) => ({ ...state, blocked: phase, beginning: false }),
  // A send that found the draft gone returns to the review screen, where the
  // person decides whether to send these answers as a new application.
  'draft-lost': (state) => ({
    ...state,
    draftLost: true,
    view: state.view === 'submitting' ? 'review' : state.view,
  }),
  'draft-renewed': (state) => ({ ...state, draftLost: false, notice: null }),
};

export const flowReducer = (state: FlowState, action: FlowAction): FlowState =>
  (HANDLERS[action.type] as (state: FlowState, action: FlowAction) => FlowState)(state, action);

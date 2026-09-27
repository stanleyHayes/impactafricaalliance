import { describe, expect, it } from 'vitest';

import { flowReducer, initialFlowState, type FlowState } from './session-state';

const inSteps = (changes: Partial<FlowState> = {}): FlowState => ({
  ...initialFlowState(false),
  view: 'steps',
  stepId: 'about',
  ...changes,
});

describe('flowReducer', () => {
  it('counts only real changes to an answer, and clears that question’s error', () => {
    const start = inSteps({
      answers: { name: 'Ama' },
      errors: { name: 'Needed', email: 'Needed' },
    });

    expect(flowReducer(start, { type: 'answer', fieldId: 'name', update: 'Ama' })).toBe(start);

    const changed = flowReducer(start, { type: 'answer', fieldId: 'name', update: 'Ama M' });
    expect(changed.answers).toEqual({ name: 'Ama M' });
    expect(changed.changeSeq).toBe(start.changeSeq + 1);
    expect(changed.errors).toEqual({ email: 'Needed' });
  });

  it('applies an update from the previous answer, so two quick changes both count', () => {
    const add = (item: string) => (previous: unknown) => [
      ...(Array.isArray(previous) ? (previous as string[]) : []),
      item,
    ];
    const once = flowReducer(inSteps(), { type: 'answer', fieldId: 'topics', update: add('a') });
    const twice = flowReducer(once, { type: 'answer', fieldId: 'topics', update: add('b') });
    expect(twice.answers.topics).toEqual(['a', 'b']);
  });

  it('asks for focus again each time the same step is refused', () => {
    const refuse = {
      type: 'invalid',
      stepId: 'about',
      errors: { name: 'Needed' },
      focusFieldId: 'name',
      returnToReview: false,
    } as const;
    const first = flowReducer(inSteps(), refuse);
    const second = flowReducer(first, refuse);
    expect(first.focus).toEqual({ fieldId: 'name', seq: 1 });
    expect(second.focus).toEqual({ fieldId: 'name', seq: 2 });
  });

  it('starts every screen change clean and remembers where an edit came from', () => {
    const fromReview = flowReducer(inSteps({ view: 'review', notice: 'Oops' }), {
      type: 'go-step',
      stepId: 'about',
      fromReview: true,
    });
    expect(fromReview).toMatchObject({
      view: 'steps',
      returnToReview: true,
      notice: null,
      errors: {},
    });
    expect(flowReducer(fromReview, { type: 'go-step', stepId: 'next' }).returnToReview).toBe(false);
  });

  it('picks a draft back up at its saved step', () => {
    const found = flowReducer(initialFlowState(true), {
      type: 'draft-checked',
      draft: {
        formSlug: 'speakers',
        formVersion: 1,
        status: 'draft',
        answers: [{ fieldId: 'name', value: 'Ama' }],
        currentStepId: 'session',
        updatedAt: '2026-09-27T10:00:00.000Z',
      },
    });
    expect(found).toMatchObject({ draftCheck: 'done', hasDraft: true, answers: { name: 'Ama' } });
    expect(flowReducer(found, { type: 'resume' })).toMatchObject({
      view: 'steps',
      stepId: 'session',
    });
  });

  it('returns to review with a message when sending fails', () => {
    const sending = flowReducer(inSteps({ view: 'review' }), { type: 'submit-start' });
    expect(sending.view).toBe('submitting');
    expect(flowReducer(sending, { type: 'submit-failed', notice: 'Try again' })).toMatchObject({
      view: 'review',
      notice: 'Try again',
    });
  });

  it('returns a send that found the draft gone to the review screen, until the person carries on', () => {
    const sending = inSteps({ view: 'submitting' });
    const lost = flowReducer(sending, { type: 'draft-lost' });
    expect(lost.view).toBe('review');
    expect(lost.draftLost).toBe(true);

    const typing = flowReducer(inSteps(), { type: 'draft-lost' });
    expect(typing.view).toBe('steps');

    const renewed = flowReducer({ ...lost, notice: 'Old' }, { type: 'draft-renewed' });
    expect(renewed.draftLost).toBe(false);
    expect(renewed.notice).toBeNull();
    expect(flowReducer(lost, { type: 'start-over' }).draftLost).toBe(false);
  });
});

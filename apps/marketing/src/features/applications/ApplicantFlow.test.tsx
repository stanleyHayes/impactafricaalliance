import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type * as FramerMotion from 'framer-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api-client';

import {
  createDraft,
  getDraft,
  getPreviewForm,
  getPublicForm,
  requestResumeLink,
  saveDraft,
  signUpload,
  submitDraft,
} from './api';
import { draftStorageKey } from './draft-token';
import {
  DRAFT_TOKEN,
  findScreenHeading,
  makeDraft,
  makeForm,
  renderApplyRoute,
  stubStorage,
  withInstantMotion,
} from './flow-test-utils';

vi.mock('./api');

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof FramerMotion>();
  return { ...actual, useReducedMotion: () => motion.reduced };
});

const click = (name: string | RegExp): void => {
  fireEvent.click(screen.getByRole('button', { name }));
};

const type = (label: string | RegExp, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const startApplication = async (): Promise<void> => {
  await findScreenHeading('Speak at our summit');
  click('Begin');
  await findScreenHeading('About you');
};

const completeAboutYou = async (): Promise<void> => {
  type(/Full name/, 'Ama Mensah');
  type(/Email address/, 'ama@example.com');
  click('Continue');
  await findScreenHeading('Your session');
};

const completeToReview = async (): Promise<void> => {
  await startApplication();
  await completeAboutYou();
  fireEvent.click(screen.getByRole('radio', { name: 'No' }));
  click('Continue');
  await findScreenHeading('Consent');
  fireEvent.click(screen.getByRole('checkbox', { name: /I agree/ }));
  click('Review answers');
  await findScreenHeading('Check your answers');
};

withInstantMotion();

beforeEach(() => {
  motion.reduced = false;
  stubStorage();
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.mocked(getPublicForm).mockResolvedValue(makeForm());
  vi.mocked(createDraft).mockResolvedValue({ token: DRAFT_TOKEN, draft: makeDraft() });
  vi.mocked(saveDraft).mockResolvedValue(makeDraft());
});

afterEach(() => {
  // Unmount first: leaving the flow sends any change still waiting to be
  // saved, and that call must land in this test, not the next one.
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('starting an application', () => {
  it('creates a draft on Begin and keeps its token on this device', async () => {
    renderApplyRoute('/apply/speakers');
    await findScreenHeading('Speak at our summit');
    expect(createDraft).not.toHaveBeenCalled();

    click('Begin');
    await findScreenHeading('About you');

    expect(createDraft).toHaveBeenCalledWith('speakers');
    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBe(DRAFT_TOKEN);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('picks the same application up again after going back to the cover', async () => {
    renderApplyRoute('/apply/speakers');
    await startApplication();
    type(/Full name/, 'Ama Mensah');

    click('Back');
    await findScreenHeading('Speak at our summit');
    click('Continue where you left off');
    await findScreenHeading('About you');

    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Full name/)).toHaveValue('Ama Mensah');
  });

  it('keeps the token in memory only when the form does not allow drafts', async () => {
    vi.mocked(getPublicForm).mockResolvedValue(makeForm({ settings: { allowDrafts: false } }));
    renderApplyRoute('/apply/speakers');
    await startApplication();

    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save and finish later' })).not.toBeInTheDocument();
    click('Back');
    expect(
      await screen.findByText(/Nothing is saved until you send your answers/),
    ).toBeInTheDocument();
    click('Continue where you left off');
    await findScreenHeading('About you');

    type(/Full name/, 'Ama Mensah');
    await new Promise((resolve) => setTimeout(resolve, 1700));
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('says calmly when there have been too many tries', async () => {
    vi.mocked(createDraft).mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'Too many'));
    renderApplyRoute('/apply/speakers');
    await findScreenHeading('Speak at our summit');
    click('Begin');

    expect(await screen.findByText(/Wait a minute, then try again/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Speak at our summit' }),
    ).toBeInTheDocument();
  });
});

describe('moving through the steps', () => {
  it('blocks Continue on a missing required answer and focuses that question', async () => {
    renderApplyRoute('/apply/speakers');
    await startApplication();

    click('Continue');

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('2 answers need attention');
    const name = screen.getByLabelText(/Full name/);
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('heading', { level: 1, name: 'About you' })).toBeInTheDocument();
  });

  it('skips hidden questions and steps, and does not require them', async () => {
    renderApplyRoute('/apply/speakers');
    await startApplication();
    await completeAboutYou();

    expect(screen.queryByLabelText(/Link to a past talk/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(screen.getByLabelText(/Link to a past talk/)).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();

    click('Continue');
    expect(await screen.findByText('One answer needs attention')).toBeInTheDocument();
    expect(screen.getByLabelText(/Link to a past talk/)).toHaveFocus();

    fireEvent.click(screen.getByRole('radio', { name: 'No' }));
    expect(screen.queryByLabelText(/Link to a past talk/)).not.toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    click('Continue');
    await findScreenHeading('Consent');
  });

  it('moves on when Enter is pressed in a one-line answer, but not in long text', async () => {
    renderApplyRoute('/apply/speakers');
    await startApplication();
    type(/Full name/, 'Ama Mensah');
    type(/Email address/, 'ama@example.com');

    fireEvent.keyDown(screen.getByLabelText(/Email address/), { key: 'Enter' });
    await findScreenHeading('Your session');

    const abstract = screen.getByLabelText(/What is the session about/);
    fireEvent.keyDown(abstract, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Yes' }), { key: 'Enter' });
    expect(screen.getByRole('heading', { level: 1, name: 'Your session' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not move on from Enter while an input method is composing', async () => {
    renderApplyRoute('/apply/speakers');
    await startApplication();
    type(/Full name/, 'Ama Mensah');
    type(/Email address/, 'ama@example.com');

    const email = screen.getByLabelText(/Email address/);
    fireEvent.compositionStart(email);
    fireEvent.keyDown(email, { key: 'Enter' });

    expect(screen.getByRole('heading', { level: 1, name: 'About you' })).toBeInTheDocument();
  });
});

describe('autosave', () => {
  it('waits for a pause in typing, saves once with the latest answers, and says so', async () => {
    renderApplyRoute('/apply/speakers');
    await startApplication();

    type(/Full name/, 'Am');
    type(/Full name/, 'Ama Mensah');
    expect(saveDraft).not.toHaveBeenCalled();

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(saveDraft).toHaveBeenCalledWith('speakers', DRAFT_TOKEN, {
      answers: [{ fieldId: 'full-name', value: 'Ama Mensah' }],
      currentStepId: 'about',
    });
    expect(await screen.findByText(/^Saved at /)).toBeInTheDocument();
  });

  it('saves straight away on a step change', async () => {
    renderApplyRoute('/apply/speakers');
    await startApplication();
    await completeAboutYou();

    await waitFor(() =>
      expect(saveDraft).toHaveBeenCalledWith('speakers', DRAFT_TOKEN, {
        answers: [
          { fieldId: 'full-name', value: 'Ama Mensah' },
          { fieldId: 'email', value: 'ama@example.com' },
        ],
        currentStepId: 'session',
      }),
    );
  });
});

describe('resuming', () => {
  it('moves a #resume= token into storage, strips it from the address and offers to continue', async () => {
    const resumeToken = 'resumeToken_ABCDEFGH12345';
    window.history.replaceState(null, '', `/apply/speakers#resume=${resumeToken}`);
    vi.mocked(getDraft).mockResolvedValue(
      makeDraft({
        answers: [{ fieldId: 'full-name', value: 'Ama Mensah' }],
        currentStepId: 'session',
      }),
    );

    renderApplyRoute('/apply/speakers');

    expect(
      await screen.findByRole('button', { name: 'Continue where you left off' }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBe(resumeToken);
    expect(getDraft).toHaveBeenCalledWith('speakers', resumeToken, expect.any(AbortSignal));

    click('Continue where you left off');
    await findScreenHeading('Your session');
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('says why the form is blank when an emailed link no longer works', async () => {
    window.history.replaceState(null, '', '/apply/speakers#resume=resumeToken_ABCDEFGH12345');
    vi.mocked(getDraft).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'));

    renderApplyRoute('/apply/speakers');

    expect(await screen.findByRole('button', { name: 'Begin' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That link no longer opens an application. It may already have been sent',
    );
    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBeNull();
  });

  it('starts afresh when the stored token has expired', async () => {
    window.localStorage.setItem(draftStorageKey('speakers'), 'expiredToken_0123456789');
    vi.mocked(getDraft).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'));

    renderApplyRoute('/apply/speakers');

    expect(await screen.findByRole('button', { name: 'Begin' })).toBeInTheDocument();
    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBeNull();
  });

  it('emails a link to finish later without saying whether a draft exists', async () => {
    vi.mocked(requestResumeLink).mockResolvedValue(undefined);
    renderApplyRoute('/apply/speakers');
    await startApplication();
    type(/Email address/, 'ama@example.com');

    click('Save and finish later');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/Email address/)).toHaveValue('ama@example.com');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Email me a link' }));

    expect(
      await within(dialog).findByText(/If that address can receive email, a link is on its way/),
    ).toBeInTheDocument();
    expect(requestResumeLink).toHaveBeenCalledWith('speakers', DRAFT_TOKEN, {
      email: 'ama@example.com',
    });
  });
});

describe('when the draft stops working', () => {
  const NEW_TOKEN = 'newDraftToken_0123456789abc';
  const gone = (): ApiError => new ApiError(404, 'NOT_FOUND', 'Application draft not found');

  it('stops saving and asks, rather than quietly starting a second application', async () => {
    vi.mocked(saveDraft).mockRejectedValueOnce(gone()).mockResolvedValue(makeDraft());
    renderApplyRoute('/apply/speakers');
    await startApplication();
    type(/Full name/, 'Ama Mensah');

    const banner = await screen.findByRole(
      'alert',
      { name: /We can no longer save this application/ },
      { timeout: 3000 },
    );
    expect(banner).toHaveTextContent(/It may already have been sent/);
    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Save and finish later' })).not.toBeInTheDocument();

    // Further changes are not sent to a draft that is gone.
    type(/Email address/, 'ama@example.com');
    await new Promise((resolve) => setTimeout(resolve, 1700));
    expect(saveDraft).toHaveBeenCalledTimes(1);

    vi.mocked(createDraft).mockResolvedValueOnce({ token: NEW_TOKEN, draft: makeDraft() });
    fireEvent.click(within(banner).getByRole('button', { name: 'Continue as a new application' }));
    await waitFor(() =>
      expect(screen.queryByText(/We can no longer save this application/)).not.toBeInTheDocument(),
    );
    expect(createDraft).toHaveBeenLastCalledWith('speakers', {
      answers: [
        { fieldId: 'full-name', value: 'Ama Mensah' },
        { fieldId: 'email', value: 'ama@example.com' },
      ],
    });
    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBe(NEW_TOKEN);

    type(/Full name/, 'Ama K. Mensah');
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(saveDraft).toHaveBeenLastCalledWith('speakers', NEW_TOKEN, expect.anything());
  });

  it('never sends a second copy on its own when the draft is refused at submit', async () => {
    vi.mocked(submitDraft).mockRejectedValueOnce(gone()).mockResolvedValueOnce({
      reference: 'APP-7K2Q9M',
      submittedAt: '2026-09-27T12:00:00.000Z',
    });
    renderApplyRoute('/apply/speakers');
    await completeToReview();

    click('Send application');
    expect(
      await screen.findByRole('alert', { name: /We can no longer save this application/ }),
    ).toBeInTheDocument();
    expect(submitDraft).toHaveBeenCalledTimes(1);
    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Check your answers' }),
    ).toBeInTheDocument();

    vi.mocked(createDraft).mockResolvedValueOnce({ token: NEW_TOKEN, draft: makeDraft() });
    click('Send as a new application');
    await findScreenHeading('Application sent');
    expect(createDraft).toHaveBeenCalledTimes(2);
    expect(submitDraft).toHaveBeenLastCalledWith('speakers', NEW_TOKEN, expect.anything());
  });
});

describe('review and submit', () => {
  it('lists every visible answer, marks unanswered ones, and Edit returns to the step', async () => {
    renderApplyRoute('/apply/speakers');
    await completeToReview();

    const about = screen.getByRole('region', { name: 'About you' });
    expect(within(about).getByText('Ama Mensah')).toBeInTheDocument();
    const session = screen.getByRole('region', { name: 'Your session' });
    expect(within(session).getByText('Not answered')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Travel' })).not.toBeInTheDocument();
    expect(within(session).getByText('No')).toBeInTheDocument();
    expect(screen.queryByText('Link to a past talk')).not.toBeInTheDocument();

    click('Edit About you');
    await findScreenHeading('About you');
    expect(screen.getByLabelText(/Full name/)).toHaveValue('Ama Mensah');
    click('Return to review');
    await findScreenHeading('Check your answers');
  });

  it('submits the visible answers and shows the reference', async () => {
    vi.mocked(submitDraft).mockResolvedValue({
      reference: 'APP-7K2Q9M',
      submittedAt: '2026-09-27T12:00:00.000Z',
      successMessage: 'Thank you for offering to speak.',
    });
    renderApplyRoute('/apply/speakers');
    await completeToReview();

    click('Send application');
    await findScreenHeading('Application sent');

    expect(screen.getByText('APP-7K2Q9M')).toBeInTheDocument();
    expect(screen.getByText('Thank you for offering to speak.')).toBeInTheDocument();
    expect(submitDraft).toHaveBeenCalledWith('speakers', DRAFT_TOKEN, {
      answers: [
        { fieldId: 'full-name', value: 'Ama Mensah' },
        { fieldId: 'email', value: 'ama@example.com' },
        { fieldId: 'spoken-before', value: 'no' },
        { fieldId: 'privacy', value: true },
      ],
    });
    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBeNull();
  });

  it('takes the applicant to the step and question the server refused', async () => {
    vi.mocked(submitDraft).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { path: 'answers.email', message: 'This address cannot receive email.' },
      ]),
    );
    renderApplyRoute('/apply/speakers');
    await completeToReview();

    click('Send application');
    await findScreenHeading('About you');

    const email = screen.getByLabelText(/Email address/);
    expect(email).toHaveFocus();
    expect(email).toHaveAccessibleDescription(/This address cannot receive email\./);
    expect(screen.getByRole('alert')).toHaveTextContent('This address cannot receive email.');
    expect(screen.getByRole('button', { name: 'Return to review' })).toBeInTheDocument();
  });

  it('loads the form again when the server checked questions this page does not have', async () => {
    const edited = makeForm({ version: 2 });
    const about = edited.steps[0];
    if (!about) {
      throw new Error('fixture has no steps');
    }
    edited.steps = [
      {
        ...about,
        fields: [
          ...about.fields,
          { id: 'pronouns', type: 'short-text', label: 'Pronouns', required: true, options: [] },
        ],
      },
      ...edited.steps.slice(1),
    ];
    vi.mocked(getPublicForm).mockResolvedValueOnce(makeForm()).mockResolvedValue(edited);
    vi.mocked(submitDraft).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Some answers need attention', [
        { path: 'answers.pronouns', message: 'This question needs an answer.' },
      ]),
    );
    renderApplyRoute('/apply/speakers');
    await completeToReview();

    click('Send application');
    expect(
      await screen.findByText(/This form has changed since you opened it/),
    ).toBeInTheDocument();
    await waitFor(() => expect(getPublicForm).toHaveBeenCalledTimes(2));
    const aboutAnswers = await screen.findByRole('region', { name: 'About you' });
    expect(await within(aboutAnswers).findByText('Pronouns')).toBeInTheDocument();

    click('Send application');
    await findScreenHeading('About you');
    expect(screen.getByLabelText(/Pronouns/)).toHaveFocus();
    expect(submitDraft).toHaveBeenCalledTimes(1);
  });

  it('shows the limit-reached screen when the form fills up while applying', async () => {
    vi.mocked(submitDraft).mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'This form has reached its submission limit'),
    );
    renderApplyRoute('/apply/speakers');
    await completeToReview();

    click('Send application');
    await findScreenHeading('This form has all the applications it can take');
  });
});

describe('when the form cannot be filled in', () => {
  it('says the form has closed', async () => {
    vi.mocked(getPublicForm).mockResolvedValue(makeForm({ window: 'closed' }));
    renderApplyRoute('/apply/speakers');

    await findScreenHeading('Applications have closed');
    expect(screen.getByRole('link', { name: 'Back to the homepage' })).toHaveAttribute('href', '/');
  });

  it('says when it opens', async () => {
    vi.mocked(getPublicForm).mockResolvedValue(
      makeForm({
        window: 'not-yet-open',
        settings: { allowDrafts: true, opensAt: '2026-10-05T09:00:00.000Z' },
      }),
    );
    renderApplyRoute('/apply/speakers');

    await findScreenHeading('This form is not open yet');
    expect(screen.getByText(/Applications open on 5 October 2026/)).toBeInTheDocument();
  });

  it('says it cannot find an unknown or unpublished form', async () => {
    vi.mocked(getPublicForm).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'));
    renderApplyRoute('/apply/missing');

    await findScreenHeading('We cannot find this form');
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  it('offers Retry when the form could not be loaded', async () => {
    vi.mocked(getPublicForm)
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Refused'))
      .mockResolvedValueOnce(makeForm());
    renderApplyRoute('/apply/speakers');

    await findScreenHeading('We could not load this form');
    click('Try again');
    await findScreenHeading('Speak at our summit');
  });
});

describe('preview', () => {
  it('renders the form from the fragment token and never writes anything', async () => {
    vi.mocked(getPreviewForm).mockResolvedValue(makeForm({ window: 'not-yet-open' }));
    renderApplyRoute('/apply/preview#header.payload.signature');

    await findScreenHeading('Speak at our summit');
    expect(getPreviewForm).toHaveBeenCalledWith(
      'header.payload.signature',
      expect.any(AbortSignal),
    );
    expect(screen.getByText('Preview — nothing you enter is sent')).toBeInTheDocument();
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );

    await startApplication();
    await completeAboutYou();
    fireEvent.click(screen.getByRole('radio', { name: 'No' }));
    click('Continue');
    await findScreenHeading('Consent');
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree/ }));
    click('Review answers');
    await findScreenHeading('Check your answers');
    click('Send application');
    await findScreenHeading('Application sent');
    expect(screen.getByText(/This is a preview, so nothing was sent/)).toBeInTheDocument();

    for (const write of [createDraft, saveDraft, signUpload, submitDraft, requestResumeLink]) {
      expect(write).not.toHaveBeenCalled();
    }
    expect(getPublicForm).not.toHaveBeenCalled();
  });

  it('explains an incomplete preview link', async () => {
    renderApplyRoute('/apply/preview');
    await findScreenHeading('This preview link is incomplete');
    expect(getPreviewForm).not.toHaveBeenCalled();
  });

  it('explains an expired preview link', async () => {
    vi.mocked(getPreviewForm).mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Expired'));
    renderApplyRoute('/apply/preview#expired.token.value');
    await findScreenHeading('This preview link has expired');
  });
});

describe('motion', () => {
  it('rises into place normally', async () => {
    renderApplyRoute('/apply/speakers');
    const heading = await findScreenHeading('Speak at our summit');
    expect(heading.closest('[data-motion]')).toHaveAttribute('data-motion', 'rise');
  });

  it('shows each screen without animation when reduced motion is asked for', async () => {
    motion.reduced = true;
    renderApplyRoute('/apply/speakers');

    const heading = await findScreenHeading('Speak at our summit');
    const screenBox = heading.closest('[data-motion]');
    expect(screenBox).toHaveAttribute('data-motion', 'none');
    expect(screenBox).not.toHaveAttribute('style');
    expect(heading).toBeVisible();

    click('Begin');
    const next = await findScreenHeading('About you');
    expect(next.closest('[data-motion]')).toHaveAttribute('data-motion', 'none');
    expect(next).toBeVisible();
  });
});

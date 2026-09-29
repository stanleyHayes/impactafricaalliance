import { applicantFromAnswers } from '@iaa/shared';
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import { useEffect, useMemo, useState, type ComponentType } from 'react';

import { DraftLostBanner } from './chrome/DraftLostBanner';
import { PreviewRibbon } from './chrome/PreviewRibbon';
import { ProgressHeader } from './chrome/ProgressHeader';
import { SaveLaterDialog } from './chrome/SaveLaterDialog';
import { ScreenTransition } from './chrome/ScreenTransition';
import type { FormSource } from './queries';
import { CoverScreen } from './screens/CoverScreen';
import { DoneScreen } from './screens/DoneScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { StatusScreen, type StatusKind } from './screens/StatusScreen';
import { StepScreen } from './screens/StepScreen';
import { UploadContext, type UploadContextValue } from './upload-context';
import { useFormSession, type FormSession, type SessionPhase } from './use-form-session';
import { useLeaveConfirmation } from './use-leave-confirmation';

interface ScreenProps {
  session: FormSession;
}

const ReviewView = ({ session }: ScreenProps): JSX.Element | null => {
  const { form, actions } = session;
  if (!form) {
    return null;
  }
  return (
    <ReviewScreen
      formTitle={form.title}
      steps={session.steps}
      answers={session.answers}
      notice={session.notice}
      submitting={session.phase === 'submitting'}
      asNew={session.draftLost}
      preview={session.preview}
      onEdit={actions.editStep}
      onBack={actions.back}
      onSubmit={actions.submit}
    />
  );
};

const StepsView = ({ session }: ScreenProps): JSX.Element | null => {
  const { form, currentStep, actions } = session;
  if (!form) {
    return null;
  }
  // A form with no questions to show goes straight to the review.
  if (!currentStep) {
    return <ReviewView session={session} />;
  }
  return (
    <StepScreen
      step={currentStep}
      formTitle={form.title}
      isLast={session.stepIndex === session.steps.length - 1}
      answers={session.answers}
      errors={session.errors}
      focus={session.focus}
      notice={session.notice}
      uploading={session.uploading}
      returnToReview={session.returnToReview}
      onAnswer={actions.setAnswer}
      onNext={actions.next}
      onBack={actions.back}
    />
  );
};

const CoverView = ({ session }: ScreenProps): JSX.Element | null =>
  session.form ? (
    <CoverScreen
      form={session.form}
      stepCount={session.steps.length}
      hasDraft={session.hasDraft}
      // The form's own setting, so a preview describes what applicants get.
      drafts={session.form.settings.allowDrafts}
      beginning={session.beginning}
      notice={session.notice}
      autoFocus
      onBegin={session.actions.begin}
      onStartOver={session.actions.startOver}
    />
  ) : null;

const DoneView = ({ session }: ScreenProps): JSX.Element | null =>
  session.receipt ? (
    <DoneScreen
      receipt={session.receipt}
      successMessage={session.form?.settings.successMessage}
      preview={session.preview}
    />
  ) : null;

const statusView = (kind: StatusKind): ComponentType<ScreenProps> =>
  function StatusView({ session }: ScreenProps): JSX.Element {
    // An expired preview link is not a missing form; it needs different words.
    const shown = session.preview && kind === 'not-found' ? 'preview-expired' : kind;
    return <StatusScreen kind={shown} form={session.form} onRetry={session.actions.retry} />;
  };

/** Which screen each phase shows. */
const SCREENS: Record<SessionPhase, ComponentType<ScreenProps>> = {
  loading: LoadingScreen,
  cover: CoverView,
  steps: StepsView,
  review: ReviewView,
  submitting: ReviewView,
  done: DoneView,
  'not-found': statusView('not-found'),
  'not-yet-open': statusView('not-yet-open'),
  closed: statusView('closed'),
  'limit-reached': statusView('limit-reached'),
  error: statusView('error'),
};

// Sending keeps the review screen in place, so the button the person pressed
// keeps focus; every other change of phase or step is a new screen.
const screenKeyFor = (session: FormSession): string => {
  if (session.phase === 'steps') {
    return `steps:${session.currentStep?.id ?? 'none'}`;
  }
  return session.phase === 'submitting' ? 'review' : session.phase;
};

const progressFor = (session: FormSession): { label: string | null; value: number } => {
  const total = session.steps.length;
  if (session.phase === 'steps' && session.currentStep) {
    return {
      label: `Step ${session.stepIndex + 1} of ${total}`,
      value: ((session.stepIndex + 1) / (total + 1)) * 100,
    };
  }
  if (session.phase === 'review' || session.phase === 'submitting') {
    return { label: 'Check and send', value: (total / (total + 1)) * 100 };
  }
  return { label: null, value: 0 };
};

// On phones Back and Continue are pinned to the bottom of the screen. Scroll
// padding keeps a question that takes focus (by Tab, or after a failed
// Continue) clear of them rather than hidden underneath.
const FOOTER_SCROLL_PADDING = (
  <GlobalStyles
    styles={{ '@media (max-width: 899.95px)': { html: { scrollPaddingBottom: '104px' } } }}
  />
);

const scrollToTop = (): void => {
  try {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    // Older browsers without scroll options still show the new screen.
  }
};

/**
 * The whole applicant experience for one form: minimal chrome, one screen at
 * a time, moving between them with the site's rise-and-settle motion. The
 * same flow renders the public form and a staff preview; which one is
 * decided by `source`.
 */
export const ApplicantFlow = ({ source }: { source: FormSource }): JSX.Element => {
  const session = useFormSession(source);
  const [saveLaterOpen, setSaveLaterOpen] = useState(false);
  const { phase, form, actions } = session;
  const screenKey = screenKeyFor(session);
  const Screen = SCREENS[phase];
  const progress = progressFor(session);
  const inForm = phase === 'steps' || phase === 'review';
  const leaving = useLeaveConfirmation(session.leaveRisk);

  useEffect(() => {
    scrollToTop();
  }, [screenKey]);

  const uploadContext = useMemo<UploadContextValue>(
    () => ({
      uploadFile: actions.uploadFile,
      setUploadBusy: actions.setUploadBusy,
      preview: session.preview,
    }),
    [actions.setUploadBusy, actions.uploadFile, session.preview],
  );

  const suggestedEmail = useMemo(
    () => (form ? applicantFromAnswers(form.steps, session.answers).email : undefined),
    [form, session.answers],
  );

  return (
    <UploadContext.Provider value={uploadContext}>
      {FOOTER_SCROLL_PADDING}
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          overflowX: 'clip',
          bgcolor: 'background.default',
          '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
        }}
      >
        {session.preview && <PreviewRibbon />}
        <ProgressHeader
          progressLabel={progress.label}
          progress={progress.value}
          // A lost draft is explained by the banner below, not the save line.
          autosave={session.drafts && inForm && !session.draftLost ? session.autosave : null}
          onSaveForLater={
            session.canSaveForLater && inForm ? () => setSaveLaterOpen(true) : undefined
          }
          onHomeClick={leaving.onHomeClick}
        />
        <Box component="main" sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          {session.draftLost && inForm && (
            <DraftLostBanner hasFiles={session.hasFiles} onContinue={actions.continueAsNew} />
          )}
          <ScreenTransition screenKey={screenKey}>
            <Screen session={session} />
          </ScreenTransition>
        </Box>
      </Box>
      <SaveLaterDialog
        open={saveLaterOpen}
        suggestedEmail={suggestedEmail}
        preview={session.preview}
        onClose={() => setSaveLaterOpen(false)}
        onSend={actions.requestResumeLink}
      />
      {leaving.dialog}
    </UploadContext.Provider>
  );
};

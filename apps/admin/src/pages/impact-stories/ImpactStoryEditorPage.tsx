import type { ImpactStory, ImpactStoryStatus } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useHasPermission } from '../../auth/useCan';
import { FormStepNavigation } from '../../components/forms/FormStepNavigation';
import { BlockEditor } from '../../components/impact-stories/BlockEditor';
import {
  checkStoryStep,
  emptyStoryForm,
  firstStepWithProblems,
  hasStoryProblems,
  REVIEW_STEP,
  STORY_FORM_STEPS,
  storyCreateBody,
  storyFormPublishProblems,
  storyToForm,
  storyUpdateBody,
  type StoryFormState,
} from '../../components/impact-stories/story-form';
import {
  PublishChecklist,
  StoryBasicsStep,
  StoryClassificationStep,
  StoryReviewSummary,
  StorySearchStep,
} from '../../components/impact-stories/StoryEditorSteps';
import { StoryStatusChip } from '../../components/impact-stories/StoryStatusChip';
import { useStoryPreview } from '../../components/impact-stories/useStoryPreview';
import {
  storyErrorText,
  useStoryStatusFlow,
} from '../../components/impact-stories/useStoryStatusFlow';
import { PageHeader } from '../../components/PageHeader';
import { FormPageSkeleton } from '../../components/PageSkeleton';
import { ApiError } from '../../lib/api-client';
import {
  IMPACT_STORIES_QUERY_KEY,
  storyStatusActions,
  useImpactStory,
  useSaveImpactStory,
} from '../../lib/impact-stories';
import { pageGuides } from '../../lib/page-guides';
import { backLinkSx, skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

/** What the editor is told when it opens straight after creating a story. */
interface EditorLocationState {
  step?: number;
  notice?: string;
}

const STEP_OF_FIELD: Record<string, number> = {
  title: 0,
  slug: 0,
  excerpt: 0,
  cover: 0,
  projectId: 1,
  programme: 1,
  country: 1,
  tags: 1,
  blocks: 2,
  seo: 3,
};

/** The step holding the field a server refusal names, so the reader lands where to fix it. */
const stepForError = (error: unknown): number | null => {
  if (!(error instanceof ApiError)) return null;
  // A clash over the web address is the one conflict a save can hit.
  if (error.status === 409) return 0;
  const first = Array.isArray(error.details) ? (error.details[0] as { path?: unknown }) : null;
  const field = typeof first?.path === 'string' ? first.path.split('.')[0] : undefined;
  return field === undefined ? null : (STEP_OF_FIELD[field] ?? null);
};

const submitLabel = (saving: boolean, step: number, editing: boolean): string => {
  if (saving) return 'Saving…';
  if (step < REVIEW_STEP) return 'Continue';
  return editing ? 'Save story' : 'Create story';
};

const serialise = (form: StoryFormState): string => JSON.stringify(form);

/** How a status reads after "The story is now". */
const STATUS_PHRASES: Record<ImpactStoryStatus, string> = {
  draft: 'a draft',
  'in-review': 'in review',
  published: 'published',
  archived: 'archived',
};

/**
 * The status panel on the Review step. Classic outlines it on the card; the
 * other skins sink it into the card as a well, so its buttons stand out.
 */
const STATUS_PANEL_SX = skinned({ border: 1, borderColor: 'divider' }, surfaceSx.inset);

/**
 * The Back and Continue strip under each step. Classic paints it in the page
 * colour. The other skins make it a well in the card instead: their page
 * colour is an opaque canvas that would lie across a frosted or clay card as a
 * flat band.
 */
const FOOTER_SX = skinned(
  { bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' },
  { bgcolor: tokenVar('surfaceInsetBg') },
);

/** Preview and status moves for a saved story, on the Review step. */
const StoryReviewActions = ({
  story,
  dirty,
  busy,
  onNotice,
}: {
  story: ImpactStory;
  dirty: boolean;
  busy: boolean;
  onNotice: (message: string) => void;
}): JSX.Element => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canUpdate = useHasPermission('update', 'impact-stories');
  const preview = useStoryPreview();
  const flow = useStoryStatusFlow(story, (updated) =>
    onNotice(`Done. The story is now ${STATUS_PHRASES[updated.status]}.`),
  );
  const actions = canUpdate ? storyStatusActions(story.status, { isAdmin }) : [];

  return (
    <Box sx={[{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }, STATUS_PANEL_SX]}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
          Status
        </Typography>
        <StoryStatusChip status={story.status} />
      </Stack>
      {dirty && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          You have unsaved changes. Save them first: the preview and the status buttons use the
          saved story.
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={<OpenInNewRoundedIcon />}
          onClick={() => preview.open(story.id)}
          disabled={busy || preview.pending}
        >
          {preview.pending ? 'Opening preview…' : 'Preview on the website'}
        </Button>
        {actions.map((action) => (
          <Button
            key={action.to}
            variant={action.to === 'published' ? 'contained' : 'outlined'}
            color={action.to === 'published' ? 'primary' : 'inherit'}
            onClick={() => flow.request(action)}
            disabled={busy || dirty || flow.pending}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
      {!isAdmin && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Submit it for review when it is ready. Only an administrator can publish, unpublish or
          archive a story.
        </Typography>
      )}
      {(flow.error ?? preview.error) && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {flow.error ?? preview.error}
        </Alert>
      )}
      {flow.dialog}
    </Box>
  );
};

/** Where a visit starts: a saved story opens with every step reachable. */
const startingSteps = (
  story: ImpactStory | undefined,
  initial: EditorLocationState,
): { step: number; maxStep: number } => {
  const step = initial.step ?? 0;
  return { step, maxStep: story ? REVIEW_STEP : step };
};

/** A live story is changed only by administrators (the API refuses anyone else). */
const isLockedFor = (story: ImpactStory | undefined, role: string | undefined): boolean =>
  story !== undefined && story.status === 'published' && role !== 'admin';

/** The editor's state and the rules for moving between steps and saving. */
const useStoryEditor = (story: ImpactStory | undefined, initial: EditorLocationState) => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { user } = useAuth();
  const save = useSaveImpactStory();
  const start = startingSteps(story, initial);
  const [form, setForm] = useState<StoryFormState>(() =>
    story ? storyToForm(story) : emptyStoryForm(),
  );
  const [saved, setSaved] = useState(() => (story ? serialise(storyToForm(story)) : ''));
  const [step, setStep] = useState(start.step);
  const [maxStep, setMaxStep] = useState(start.maxStep);
  const [uploads, setUploads] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(() => new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(initial.notice ?? null);
  const locked = isLockedFor(story, user?.role);
  const busy = uploads > 0 || save.isPending;

  const update = (patch: Partial<StoryFormState>): void => {
    setForm((previous) => ({ ...previous, ...patch }));
    setError('');
  };
  const trackUpload = (uploading: boolean): void =>
    setUploads((count) => Math.max(0, count + (uploading ? 1 : -1)));
  const markAttempted = (index: number): void =>
    setAttempted((current) => new Set(current).add(index));
  const changeStep = (next: number): void => {
    if (busy) return;
    if (next > step && hasStoryProblems(checkStoryStep(form, step))) {
      markAttempted(step);
      setError('Fix the problems marked on this step before you continue.');
      return;
    }
    setError('');
    setStep(next);
    setMaxStep((previous) => Math.max(previous, next));
  };
  const onSaved = (result: ImpactStory): void => {
    if (!story) {
      // Opened as the saved story's own edit page, so a reload keeps it,
      // without a loading flash for a story already in hand.
      client.setQueryData([...IMPACT_STORIES_QUERY_KEY, 'detail', result.id], result);
      void navigate(`/impact-stories/${result.id}/edit`, {
        replace: true,
        state: { step: REVIEW_STEP, notice: 'Story created. It is a draft until published.' },
      });
      return;
    }
    const next = storyToForm(result);
    setForm(next);
    setSaved(serialise(next));
    setNotice('Story saved.');
  };
  const saveStory = (): void => {
    const failing = firstStepWithProblems(form);
    if (failing !== null) {
      markAttempted(failing);
      setStep(failing);
      setError('This step needs attention before the story can be saved.');
      return;
    }
    save.mutate(
      { id: story?.id, body: story ? storyUpdateBody(form) : storyCreateBody(form) },
      {
        onSuccess: onSaved,
        onError: (cause) => {
          const target = stepForError(cause);
          if (target !== null) setStep(target);
          setError(storyErrorText(cause));
        },
      },
    );
  };
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy) return;
    if (step < REVIEW_STEP) changeStep(step + 1);
    else if (!locked) saveStory();
  };

  return {
    form,
    update,
    step,
    maxStep,
    changeStep,
    submit,
    trackUpload,
    uploads,
    busy,
    saving: save.isPending,
    locked,
    showErrors: attempted.has(step),
    dirty: serialise(form) !== saved,
    error,
    notice,
    setNotice,
  };
};

type StoryEditor = ReturnType<typeof useStoryEditor>;

/**
 * Every control on the step, switched off together while the story is locked,
 * uploading or saving. The upload and image fields have no switch of their
 * own, and a second upload started during the first would finish against a
 * copy of the story from before it.
 */
const LockableFields = ({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}): JSX.Element => (
  <Box component="fieldset" disabled={disabled} sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
    {children}
  </Box>
);

/** The fields of the current step. */
const StepBody = ({
  editor,
  story,
}: {
  editor: StoryEditor;
  story: ImpactStory | undefined;
}): JSX.Element => {
  const { form, update, step, busy, locked, showErrors, trackUpload } = editor;
  const disabled = busy || locked;
  const check = checkStoryStep(form, step);
  const stepProps = {
    form,
    update,
    errors: showErrors ? check.fields : {},
    disabled,
    onUploadingChange: trackUpload,
  };
  if (step === 0) {
    return (
      <LockableFields disabled={disabled}>
        <StoryBasicsStep {...stepProps} />
      </LockableFields>
    );
  }
  if (step === 1) {
    return (
      <LockableFields disabled={disabled}>
        <StoryClassificationStep {...stepProps} />
      </LockableFields>
    );
  }
  if (step === 3) {
    return (
      <LockableFields disabled={disabled}>
        <StorySearchStep {...stepProps} />
      </LockableFields>
    );
  }
  if (step === 2) {
    return (
      <>
        <LockableFields disabled={disabled}>
          <BlockEditor
            blocks={form.blocks}
            onChange={(blocks) => update({ blocks })}
            showErrors={showErrors}
            disabled={disabled}
            onUploadingChange={trackUpload}
          />
        </LockableFields>
        {showErrors && check.fields.blocks && <Alert severity="error">{check.fields.blocks}</Alert>}
      </>
    );
  }
  return (
    <Stack spacing={2}>
      <StoryReviewSummary form={form} goTo={editor.changeStep} disabled={busy} />
      <PublishChecklist problems={storyFormPublishProblems(form)} />
      {story ? (
        <StoryReviewActions
          story={story}
          dirty={editor.dirty}
          busy={busy}
          onNotice={editor.setNotice}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Create the story to preview it on the website and send it for review.
        </Typography>
      )}
    </Stack>
  );
};

/** Back or Cancel, and Continue or the final save. */
const EditorFooter = ({
  editor,
  editing,
}: {
  editor: StoryEditor;
  editing: boolean;
}): JSX.Element => {
  const navigate = useNavigate();
  const { step, busy, locked, saving, changeStep } = editor;
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      spacing={2}
      sx={[
        {
          p: { xs: 2, md: 3 },
          // The card's own corners (12px in Classic), because the card does
          // not clip: each skin rounds cards more, and a fixed radius would
          // let the strip show past the curve.
          borderBottomLeftRadius: 'inherit',
          borderBottomRightRadius: 'inherit',
        },
        FOOTER_SX,
      ]}
    >
      <Button
        onClick={() => (step > 0 ? changeStep(step - 1) : void navigate('/impact-stories'))}
        disabled={busy}
      >
        {step > 0 ? 'Back' : 'Cancel'}
      </Button>
      <Button type="submit" variant="contained" disabled={busy || (step === REVIEW_STEP && locked)}>
        {submitLabel(saving, step, editing)}
      </Button>
    </Stack>
  );
};

const StoryEditorForm = ({
  story,
  initial,
}: {
  story?: ImpactStory;
  initial: EditorLocationState;
}): JSX.Element => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const editor = useStoryEditor(story, initial);
  const heading = useRef<HTMLHeadingElement>(null);
  const { step } = editor;

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  // The welcome after creating a story is for this visit only, not every reload.
  const arrivedWithState = Boolean(initial.notice ?? initial.step);
  useEffect(() => {
    if (arrivedWithState) void navigate(pathname, { replace: true, state: null });
  }, [arrivedWithState, navigate, pathname]);

  return (
    <>
      <PageHeader
        icon={<HistoryEduIcon />}
        title={story ? 'Edit impact story' : 'New impact story'}
        description="Write the story step by step: basics, classification, blocks, search and sharing."
        help={pageGuides['impact-story-editor']}
        action={
          <Button
            component={RouterLink}
            to="/impact-stories"
            startIcon={<ArrowBackRoundedIcon />}
            disabled={editor.busy}
            sx={backLinkSx}
          >
            All stories
          </Button>
        }
      />
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        {editor.locked && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This story is on the website, so only an administrator can change it. You can read it
            here and preview it.
          </Alert>
        )}
        <FormStepNavigation
          steps={STORY_FORM_STEPS}
          activeStep={step}
          maxStep={editor.maxStep}
          onStepChange={editor.changeStep}
          disabled={editor.busy}
        />
        <Box
          component="form"
          noValidate
          onSubmit={editor.submit}
          aria-busy={editor.busy}
          // The skin's card: in Classic, paper with a divider border.
          sx={{ borderRadius: 3, ...surfaceSx.card }}
        >
          <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Typography
              ref={heading}
              tabIndex={-1}
              component="h2"
              variant="h5"
              sx={{ mb: 3, outline: 'none' }}
            >
              {STORY_FORM_STEPS[step]}
            </Typography>
            <Stack spacing={3}>
              <StepBody editor={editor} story={story} />
              {editor.error && (
                <Alert severity="error" role="alert">
                  {editor.error}
                </Alert>
              )}
              {editor.uploads > 0 && (
                <Alert severity="info">Wait for the upload to finish before you move on.</Alert>
              )}
            </Stack>
          </Box>
          <EditorFooter editor={editor} editing={Boolean(story)} />
        </Box>
      </Box>
      <Snackbar
        open={Boolean(editor.notice)}
        autoHideDuration={5000}
        onClose={() => editor.setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => editor.setNotice(null)}>
          {editor.notice}
        </Alert>
      </Snackbar>
    </>
  );
};

/**
 * Writing an impact story (`/impact-stories/new` and
 * `/impact-stories/:storyId/edit`): one stepwise flow for creating and
 * editing, per the admin form rules in AGENTS.md.
 */
const ImpactStoryEditorPage = (): JSX.Element => {
  // Creating and editing share one page, told apart by the id in the address.
  const { storyId } = useParams();
  const location = useLocation();
  const query = useImpactStory(storyId);
  const initial = (location.state ?? {}) as EditorLocationState;

  if (storyId && query.isPending) {
    return (
      <>
        <PageHeader
          title="Edit impact story"
          icon={<HistoryEduIcon />}
          help={pageGuides['impact-story-editor']}
        />
        <FormPageSkeleton backLink steps fields={4} />
      </>
    );
  }
  if (storyId && (query.isError || !query.data)) {
    return (
      <Stack spacing={2}>
        <PageHeader title="Edit impact story" icon={<HistoryEduIcon />} />
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        >
          {query.error?.message || 'This story could not be found.'}
        </Alert>
        <Button component={RouterLink} to="/impact-stories" sx={{ alignSelf: 'flex-start' }}>
          Back to impact stories
        </Button>
      </Stack>
    );
  }
  return (
    <StoryEditorForm
      key={storyId ?? 'new'}
      story={storyId ? query.data : undefined}
      initial={initial}
    />
  );
};

export default ImpactStoryEditorPage;

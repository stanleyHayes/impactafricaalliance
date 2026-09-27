import type { Project } from '@iaa/shared';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { FormStepNavigation } from '../../components/forms/FormStepNavigation';
import { PageHeader } from '../../components/PageHeader';
import { FormPageSkeleton } from '../../components/PageSkeleton';
import {
  emptyProjectForm,
  firstInvalidStep,
  parseProjectForm,
  PROJECT_FORM_STEPS,
  projectEditBody,
  projectToForm,
  REVIEW_STEP,
  serverProblem,
  stepErrors,
  withTitle,
  type FieldErrors,
  type ProjectFormState,
} from '../../components/projects/project-form';
import {
  ProjectStepContent,
  type SetProjectField,
} from '../../components/projects/ProjectFormSteps';
import { ApiError } from '../../lib/api-client';
import { pageGuides } from '../../lib/page-guides';
import { useCreateProject, useProject, useUpdateProject } from '../../lib/projects';

const DESCRIPTION =
  'Set the project out step by step: basics, people, schedule and place, scope, story and cover.';

const submitLabel = (saving: boolean, step: number, editing: boolean): string => {
  if (saving) return 'Saving…';
  if (step < REVIEW_STEP) return 'Continue';
  return editing ? 'Update project' : 'Create project';
};

const hasErrors = (errors: FieldErrors): boolean => Object.keys(errors).length > 0;

/** Drops the errors for one field (and the rows inside it) once someone edits it. */
const withoutField = (errors: FieldErrors, key: string): FieldErrors =>
  Object.fromEntries(
    Object.entries(errors).filter(([path]) => path !== key && !path.startsWith(`${key}.`)),
  );

const EditorHeader = ({
  editing,
  backTo,
  busy,
}: {
  editing: boolean;
  backTo: string;
  busy: boolean;
}): JSX.Element => (
  <PageHeader
    icon={<AccountTreeIcon />}
    title={editing ? 'Edit project' : 'New project'}
    description={DESCRIPTION}
    help={pageGuides['project-editor']}
    action={
      <Button
        component={RouterLink}
        to={backTo}
        startIcon={<ArrowBackRoundedIcon />}
        disabled={busy}
      >
        {editing ? 'Back to project' : 'All projects'}
      </Button>
    }
  />
);

/** The step's own problem, or a save the API refused for a reason no field explains. */
const EditorProblems = ({
  notice,
  saveError,
}: {
  notice: string;
  saveError: Error | null;
}): JSX.Element => (
  <>
    {notice && (
      <Alert severity="error" role="alert">
        {notice}
      </Alert>
    )}
    {saveError && (
      <Alert severity="error" role="alert">
        {saveError.message ||
          'The project could not be saved. Your changes are still here; try again.'}
      </Alert>
    )}
  </>
);

const EditorFooter = ({
  backLabel,
  onBack,
  submitLabel: label,
  busy,
}: {
  backLabel: string;
  onBack: () => void;
  submitLabel: string;
  busy: boolean;
}): JSX.Element => (
  <Stack
    direction="row"
    justifyContent="space-between"
    spacing={2}
    sx={{
      p: { xs: 2, md: 3 },
      bgcolor: 'background.default',
      borderTop: 1,
      borderColor: 'divider',
    }}
  >
    <Button onClick={onBack} disabled={busy}>
      {backLabel}
    </Button>
    <Button type="submit" variant="contained" disabled={busy}>
      {label}
    </Button>
  </Stack>
);

const ProjectEditorForm = ({ project: loaded }: { project?: Project }): JSX.Element => {
  // The project as it was when the editor opened. A background refetch (a
  // task created from the top bar refreshes every project) must not move the
  // status this edit compares against, or a colleague's archive would read
  // as a change made here.
  const [project] = useState(loaded);
  const navigate = useNavigate();
  const create = useCreateProject();
  const update = useUpdateProject();
  const [form, setForm] = useState<ProjectFormState>(() =>
    project ? projectToForm(project) : emptyProjectForm(),
  );
  const [step, setStep] = useState(0);
  // A saved project has been through every step, so any of them can be opened.
  const [maxStep, setMaxStep] = useState(project ? REVIEW_STEP : 0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const opened = useRef(false);
  const saving = create.isPending || update.isPending;
  const busy = uploading || saving;
  const saveError = create.error ?? update.error;
  const backTo = project ? `/projects/${project.id}` : '/projects';

  // Focus follows the step, so a keyboard or screen reader user lands on its
  // heading. Not on first load: the page title is where they should start.
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const setField: SetProjectField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => withoutField(previous, key));
    setNotice('');
  };

  const goTo = (index: number, problems: FieldErrors = {}, message = ''): void => {
    // A refused save is shown once, where it happened; moving on clears it.
    create.reset();
    update.reset();
    setStep(index);
    setErrors(problems);
    setNotice(message);
    setMaxStep((previous) => Math.max(previous, index));
  };

  const changeStep = (next: number): void => {
    if (busy || next === step) return;
    // Moving forward checks every step being passed, so the stepper cannot
    // skip over a problem that Continue would have caught.
    for (let index = step; index < next; index += 1) {
      const problems = stepErrors(form, index);
      if (hasErrors(problems)) {
        goTo(index, problems, 'Check the highlighted fields before you continue.');
        return;
      }
    }
    goTo(next);
  };

  const failed = (error: Error): void => {
    const problem = serverProblem(error);
    if (problem) goTo(problem.step, problem.errors, error.message);
  };

  const save = (): void => {
    const invalid = firstInvalidStep(form);
    if (invalid !== null) {
      goTo(
        invalid,
        stepErrors(form, invalid),
        'This step needs attention before the project can be saved.',
      );
      return;
    }
    const parsed = parseProjectForm(form);
    if (!parsed.success) {
      setNotice(parsed.error.issues[0]?.message ?? 'Check the project details.');
      return;
    }
    const done = {
      onSuccess: (saved: Project) => navigate(`/projects/${saved.id}`),
      onError: failed,
    };
    if (project) {
      update.mutate({ id: project.id, body: projectEditBody(parsed.data, project.status) }, done);
    } else create.mutate(parsed.data, done);
  };

  // Enter anywhere on an intermediate step lands here and moves on, with the
  // step's checks; only the Review step saves.
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy) return;
    if (step < REVIEW_STEP) changeStep(step + 1);
    else save();
  };

  const stepProps = { form, setField, errors, disabled: busy };
  // A refusal the editor could place on a step is shown there instead.
  const unmapped = saveError !== null && serverProblem(saveError) === null;

  return (
    <>
      <EditorHeader editing={Boolean(project)} backTo={backTo} busy={busy} />
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <FormStepNavigation
          steps={PROJECT_FORM_STEPS}
          activeStep={step}
          maxStep={maxStep}
          onStepChange={changeStep}
          disabled={busy}
        />
        <Box
          component="form"
          noValidate
          onSubmit={submit}
          aria-label={project ? `Edit ${project.title}` : 'New project'}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography
              ref={heading}
              tabIndex={-1}
              component="h2"
              variant="h5"
              sx={{ mb: 3, outline: 'none' }}
            >
              {PROJECT_FORM_STEPS[step]}
            </Typography>
            <Stack spacing={3}>
              <ProjectStepContent
                step={step}
                stepProps={stepProps}
                savedStatus={project?.status ?? null}
                onTitleChange={(title) => {
                  setForm((previous) => withTitle(previous, title));
                  setErrors((previous) => withoutField(withoutField(previous, 'title'), 'slug'));
                }}
                onSlugChange={(slug) => {
                  setForm((previous) => ({ ...previous, slug, slugTouched: true }));
                  setErrors((previous) => withoutField(previous, 'slug'));
                }}
                onUploadingChange={setUploading}
                // Every step before Review has passed its checks, so its Edit
                // links go straight back without checking again.
                onEdit={(index) => goTo(index)}
              />
              <EditorProblems notice={notice} saveError={unmapped ? saveError : null} />
            </Stack>
          </Box>
          <EditorFooter
            backLabel={step > 0 ? 'Back' : 'Cancel'}
            onBack={() => (step > 0 ? goTo(step - 1) : navigate(backTo))}
            submitLabel={uploading ? 'Uploading…' : submitLabel(saving, step, Boolean(project))}
            busy={busy}
          />
        </Box>
      </Box>
    </>
  );
};

/**
 * Creating and editing a project: one stepwise flow for both (AGENTS.md),
 * told apart by the id in the address. An existing project loads behind a
 * skeleton of the form; a failed load says why and offers Retry.
 */
const ProjectEditorPage = (): JSX.Element => {
  const { projectId } = useParams();
  const query = useProject(projectId);

  if (projectId && query.isPending) {
    return (
      <>
        <PageHeader
          title="Edit project"
          description={DESCRIPTION}
          icon={<AccountTreeIcon />}
          help={pageGuides['project-editor']}
        />
        <FormPageSkeleton steps fields={5} />
      </>
    );
  }

  // Only when there is nothing to show: a failed refetch behind an open form
  // keeps the form, and what has been typed into it.
  if (projectId && !query.data) {
    // A malformed id in the address is answered 400; to the reader it is the same missing page.
    const missing = query.error instanceof ApiError && [400, 404].includes(query.error.status);
    return (
      <>
        <PageHeader title="Edit project" description={DESCRIPTION} icon={<AccountTreeIcon />} />
        <Alert
          severity={missing ? 'warning' : 'error'}
          action={
            missing ? undefined : (
              <Button color="inherit" size="small" onClick={() => void query.refetch()}>
                Retry
              </Button>
            )
          }
        >
          {missing
            ? 'This project could not be found. It may have been deleted.'
            : query.error?.message || 'The project could not be loaded.'}
        </Alert>
        <Button
          component={RouterLink}
          to="/projects"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ mt: 2 }}
        >
          All projects
        </Button>
      </>
    );
  }

  return (
    <ProjectEditorForm key={projectId ?? 'new'} project={projectId ? query.data : undefined} />
  );
};

export default ProjectEditorPage;

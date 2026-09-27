import { FORM_TEMPLATE_KEYS, type FormDefinition, type FormTemplateKey } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { FormBuilder } from '../../components/form-builder/FormBuilder';
import { FormStepNavigation } from '../../components/forms/FormStepNavigation';
import { PageHeader } from '../../components/PageHeader';
import { FormPageSkeleton } from '../../components/PageSkeleton';
import type { ApiError } from '../../lib/api-client';
import { useCreateForm, useForm, useUpdateForm } from '../../lib/forms';
import { pageGuides } from '../../lib/page-guides';

import {
  createBody,
  emptyFormState,
  firstProblem,
  FORM_EDITOR_STEPS,
  formToState,
  REVIEW_STEP,
  stepForPath,
  stepProblem,
  templateState,
  updateBody,
  type FormEditorState,
} from './form-editor-model';
import {
  BasicsStep,
  ConfirmationStep,
  IntroductionStep,
  ReviewStep,
  ScheduleStep,
  type SetField,
} from './FormEditorSteps';

type DateKey = 'opensAt' | 'closesAt';

const submitLabel = (saving: boolean, step: number, editing: boolean): string => {
  if (saving) return 'Saving…';
  if (step < REVIEW_STEP) return 'Continue';
  return editing ? 'Update form' : 'Create form';
};

const isTemplateKey = (value: string | null): value is FormTemplateKey =>
  (FORM_TEMPLATE_KEYS as readonly string[]).includes(value ?? '');

/** The step a server refusal is about, and what to say, so the editor lands where the fix is. */
const serverProblem = (error: ApiError): { step: number; message: string } => {
  const details = Array.isArray(error.details)
    ? (error.details as { path?: unknown; message?: unknown }[])
    : [];
  const first = details[0];
  const path = typeof first?.path === 'string' ? first.path.split('.') : [];
  if (error.status === 409 && /address/i.test(error.message)) {
    return { step: 0, message: error.message };
  }
  const message = error.message || 'The form could not be saved.';
  // The API's summaries have no full stop; its details are sentences.
  const joined = /[.!?]$/.test(message) ? message : `${message}.`;
  const detail = typeof first?.message === 'string' ? ` ${first.message}` : '';
  return {
    step: path.length > 0 ? stepForPath(path) : REVIEW_STEP,
    message: detail ? `${joined}${detail}` : message,
  };
};

interface StepBodyProps {
  step: number;
  state: FormEditorState;
  setField: SetField;
  busy: boolean;
  showErrors: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onDateProblem: (key: DateKey, problem: string | null) => void;
  goTo: (step: number) => void;
}

// One renderer per step, in step order: a lookup rather than a chain of
// conditions, so adding a step is adding a line.
const STEP_BODIES: ((props: StepBodyProps) => JSX.Element)[] = [
  ({ state, setField, busy }) => <BasicsStep form={state} setField={setField} disabled={busy} />,
  ({ state, setField, busy, onUploadingChange }) => (
    <IntroductionStep
      form={state}
      setField={setField}
      disabled={busy}
      onUploadingChange={onUploadingChange}
    />
  ),
  ({ state, setField, busy, showErrors, onUploadingChange }) => (
    <FormBuilder
      steps={state.steps}
      onChange={(steps) => setField('steps', steps)}
      showErrors={showErrors}
      disabled={busy}
      onUploadingChange={onUploadingChange}
    />
  ),
  ({ state, setField, busy, onDateProblem }) => (
    <ScheduleStep form={state} setField={setField} disabled={busy} onDateProblem={onDateProblem} />
  ),
  ({ state, setField, busy }) => (
    <ConfirmationStep form={state} setField={setField} disabled={busy} />
  ),
  ({ state, goTo }) => <ReviewStep form={state} goTo={goTo} />,
];

const StepBody = (props: StepBodyProps): JSX.Element | null =>
  STEP_BODIES[props.step]?.(props) ?? null;

const initialState = (form?: FormDefinition, template?: FormTemplateKey): FormEditorState => {
  if (form) return formToState(form);
  return template ? templateState(template) : emptyFormState();
};

const FormEditorForm = ({
  form,
  template,
}: {
  form?: FormDefinition;
  template?: FormTemplateKey;
}): JSX.Element => {
  const navigate = useNavigate();
  const create = useCreateForm();
  const update = useUpdateForm();
  const [state, setState] = useState<FormEditorState>(() => initialState(form, template));
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(form ? REVIEW_STEP : 0);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [dateProblems, setDateProblems] = useState<Partial<Record<DateKey, string | null>>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const saving = create.isPending || update.isPending;
  const busy = saving || uploads > 0;

  useEffect(() => {
    // Focus moves to each new step's heading, but not on arrival, where the
    // page's own heading comes first.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const setField: SetField = (key, value) => {
    setState((previous) => ({ ...previous, [key]: value }));
    setError('');
  };
  const onUploadingChange = useCallback((uploading: boolean) => {
    setUploads((count) => Math.max(0, count + (uploading ? 1 : -1)));
  }, []);
  const onDateProblem = useCallback((key: DateKey, problem: string | null) => {
    setDateProblems((previous) =>
      previous[key] === problem ? previous : { ...previous, [key]: problem },
    );
  }, []);

  const problemAt = (index: number): string | undefined => {
    if (index === 3 && (dateProblems.opensAt || dateProblems.closesAt)) {
      return 'Finish typing the dates, or clear them, before continuing.';
    }
    return stepProblem(state, index);
  };

  const changeStep = (next: number): void => {
    if (busy) return;
    if (next > step) {
      const problem = problemAt(step);
      if (problem) {
        setShowErrors(true);
        setError(problem);
        return;
      }
    }
    setError('');
    setStep(next);
    setMaxStep((previous) => Math.max(previous, next));
  };

  const fail = (problem: { step: number; message: string }): void => {
    setShowErrors(true);
    setStep(problem.step);
    setError(problem.message);
  };

  const save = (): void => {
    const datesProblem = problemAt(3);
    if (datesProblem && datesProblem !== stepProblem(state, 3)) {
      fail({ step: 3, message: datesProblem });
      return;
    }
    const problem = firstProblem(state);
    if (problem) {
      fail(problem);
      return;
    }
    const options = {
      onSuccess: (saved: FormDefinition) => navigate(`/forms/${saved.id}`),
      onError: (failure: ApiError) => fail(serverProblem(failure)),
    };
    if (form) update.mutate({ id: form.id, body: updateBody(state) }, options);
    else create.mutate(createBody(state), options);
  };

  // Enter on an intermediate step moves on, with that step checked; only the
  // Review step's button saves.
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy) return;
    if (step < REVIEW_STEP) changeStep(step + 1);
    else save();
  };

  const backTo = form ? `/forms/${form.id}` : '/forms';

  return (
    <>
      <PageHeader
        icon={<DynamicFormIcon />}
        title={form ? 'Edit form' : 'New form'}
        description="Build the form one step at a time, then review before saving. Saving never publishes."
        help={pageGuides['form-editor']}
        action={
          <Button
            component={RouterLink}
            to={backTo}
            startIcon={<ArrowBackRoundedIcon />}
            disabled={busy}
          >
            {form ? 'Back to the form' : 'All forms'}
          </Button>
        }
      />
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
        {form?.status === 'published' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            This form is live. Changes to its questions reach applicants as soon as you save, and
            applications already sent keep the version they answered.
          </Alert>
        )}
        <FormStepNavigation
          steps={FORM_EDITOR_STEPS}
          activeStep={step}
          maxStep={maxStep}
          onStepChange={changeStep}
          disabled={busy}
        />
        <Box
          component="form"
          noValidate
          onSubmit={submit}
          aria-label={form ? `Edit ${form.title}` : 'New form'}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Typography
              ref={heading}
              tabIndex={-1}
              component="h2"
              variant="h5"
              sx={{ mb: 3, outline: 'none' }}
            >
              {FORM_EDITOR_STEPS[step]}
            </Typography>
            <Stack spacing={3}>
              <StepBody
                step={step}
                state={state}
                setField={setField}
                busy={busy}
                showErrors={showErrors}
                onUploadingChange={onUploadingChange}
                onDateProblem={onDateProblem}
                goTo={changeStep}
              />
              {error && (
                <Alert severity="error" role="alert">
                  {error}
                </Alert>
              )}
            </Stack>
          </Box>
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
            <Button
              onClick={() => (step > 0 ? changeStep(step - 1) : navigate(backTo))}
              disabled={busy}
            >
              {step > 0 ? 'Back' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {uploads > 0 ? 'Uploading…' : submitLabel(saving, step, Boolean(form))}
            </Button>
          </Stack>
        </Box>
      </Box>
    </>
  );
};

/** Why the form could not be opened, with a way to try again unless it is gone. */
const LoadError = ({
  error,
  onRetry,
}: {
  error: ApiError | null;
  onRetry: () => void;
}): JSX.Element => {
  const missing = error?.status === 404;
  return (
    <Stack spacing={2}>
      <PageHeader title="Edit form" icon={<DynamicFormIcon />} />
      <Alert
        severity="error"
        action={missing ? undefined : <Button onClick={onRetry}>Retry</Button>}
      >
        {missing
          ? 'This form could not be found. It may have been deleted.'
          : error?.message || 'The form could not be loaded.'}
      </Alert>
      <Box>
        <Button component={RouterLink} to="/forms" startIcon={<ArrowBackRoundedIcon />}>
          All forms
        </Button>
      </Box>
    </Stack>
  );
};

/**
 * Creating and editing a form (plan §4.3): one stepwise page for both, at
 * `/forms/new` (with `?template=speaker-application` to start from the
 * template) and `/forms/:formId/edit`.
 */
const FormEditorPage = (): JSX.Element => {
  // Creating and editing share one page, told apart by the id in the address.
  const { formId } = useParams();
  const [params] = useSearchParams();
  const query = useForm(formId);
  const template = params.get('template');

  if (formId && query.isPending) {
    return (
      <>
        <PageHeader title="Edit form" icon={<DynamicFormIcon />} help={pageGuides['form-editor']} />
        <FormPageSkeleton backLink steps fields={5} />
      </>
    );
  }
  if (formId && (query.isError || !query.data)) {
    return <LoadError error={query.error} onRetry={() => void query.refetch()} />;
  }
  return (
    <FormEditorForm
      key={formId ?? `new-${template ?? ''}`}
      form={formId ? query.data : undefined}
      template={isTemplateKey(template) ? template : undefined}
    />
  );
};

export default FormEditorPage;

import { formDefinitionProblems, type FormField, type FormStep } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { EmptyState } from '../EmptyState';

import { duplicateField, MAX_FIELDS_PER_STEP, moveItem, newField, newStep } from './builder-model';
import { StepSection } from './StepSection';

/** Most steps in one form, as the shared schema allows. */
const MAX_STEPS = 20;

type Pending =
  | { kind: 'step'; stepIndex: number }
  | { kind: 'field'; stepIndex: number; field: FormField }
  | null;

export interface FormBuilderProps {
  steps: FormStep[];
  onChange: (steps: FormStep[]) => void;
  /** Show "required" style errors, after an attempt to move on. */
  showErrors?: boolean;
  disabled?: boolean;
  /** Told when a step picture starts or finishes uploading, so the editor can wait. */
  onUploadingChange?: (uploading: boolean) => void;
}

const fieldCount = (steps: readonly FormStep[]): number =>
  steps.reduce((total, step) => total + step.fields.length, 0);

/** What will be removed, named, before it goes. */
const RemovalDialog = ({
  pending,
  steps,
  onConfirm,
  onClose,
}: {
  pending: Pending;
  steps: readonly FormStep[];
  onConfirm: () => void;
  onClose: () => void;
}): JSX.Element => {
  const isStep = pending?.kind === 'step';
  const step = pending ? steps[pending.stepIndex] : undefined;
  const questions = step?.fields.length ?? 0;
  const description = isStep ? (
    <>
      <strong>{step?.title || 'This step'}</strong> and its {questions}{' '}
      {questions === 1 ? 'question' : 'questions'} will be removed from the form when you save.
      Applications already sent keep their answers.
    </>
  ) : (
    <>
      <strong>
        {(pending?.kind === 'field' && pending.field.label.trim()) || 'This question'}
      </strong>{' '}
      will be removed from the form when you save. Applications already sent keep their answers.
    </>
  );
  return (
    <ConfirmDialog
      open={pending !== null}
      tone="error"
      eyebrow="Form builder"
      title={isStep ? 'Remove this step?' : 'Delete this question?'}
      description={description}
      confirmLabel={isStep ? 'Remove step' : 'Delete question'}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};

/** Everything that would stop the form being published, as the editor works. */
const ProblemSummary = ({ problems }: { problems: readonly string[] }): JSX.Element | null => {
  if (problems.length === 0) return null;
  const shown = problems.slice(0, 8);
  return (
    <Alert severity="warning" role="status">
      <AlertTitle>
        {problems.length === 1
          ? 'One thing to fix before this form can be published'
          : `${problems.length} things to fix before this form can be published`}
      </AlertTitle>
      You can still save while you work on them.
      <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
        {shown.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </Box>
      {problems.length > shown.length &&
        `And ${problems.length - shown.length} more, shown beside their questions.`}
    </Alert>
  );
};

const countLine = (steps: readonly FormStep[]): string => {
  const questions = fieldCount(steps);
  return `${steps.length} ${steps.length === 1 ? 'step' : 'steps'} · ${questions} ${
    questions === 1 ? 'question' : 'questions'
  }. Applicants see one step at a time.`;
};

/**
 * The questions of a form, grouped into steps: one screen each for the
 * applicant. Steps can be added, renamed, described, given a condition,
 * reordered and removed; questions can be added from a menu of types, edited
 * beside a preview, dragged or moved with buttons, sent to another step,
 * duplicated and deleted.
 *
 * Every id is made once, when the step or question is added, and never
 * changes: answers are stored against ids, so renaming a question never
 * detaches the answers already given to it. Problems that would stop the form
 * being published are listed as the editor works, but never stop it being
 * saved; a half-built form is a normal thing to save.
 */
export const FormBuilder = ({
  steps,
  onChange,
  showErrors = false,
  disabled = false,
  onUploadingChange,
}: FormBuilderProps): JSX.Element => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const problems = useMemo(() => formDefinitionProblems(steps), [steps]);

  const setStep = (index: number, step: FormStep): void =>
    onChange(steps.map((current, position) => (position === index ? step : current)));
  const setFields = (index: number, fields: FormField[]): void => {
    const step = steps[index];
    if (step) setStep(index, { ...step, fields });
  };
  const addStep = (): void => onChange([...steps, newStep(steps.length)]);
  const addField = (stepIndex: number, type: FormField['type']): void => {
    const field = newField(type);
    setFields(stepIndex, [...(steps[stepIndex]?.fields ?? []), field]);
    setExpandedId(field.id);
  };
  const moveFieldToStep = (fieldId: string, targetStepId: string): void => {
    const field = steps
      .flatMap((step) => step.fields)
      .find((candidate) => candidate.id === fieldId);
    const target = steps.find((step) => step.id === targetStepId);
    if (!field || !target || target.fields.length >= MAX_FIELDS_PER_STEP) return;
    onChange(
      steps.map((step) => {
        const without = step.fields.filter((candidate) => candidate.id !== fieldId);
        return step.id === targetStepId
          ? { ...step, fields: [...without, field] }
          : { ...step, fields: without };
      }),
    );
  };
  const duplicate = (stepIndex: number, fieldIndex: number): void => {
    const fields = steps[stepIndex]?.fields ?? [];
    const original = fields[fieldIndex];
    if (!original || fields.length >= MAX_FIELDS_PER_STEP) return;
    const copy = duplicateField(original);
    setFields(stepIndex, [
      ...fields.slice(0, fieldIndex + 1),
      copy,
      ...fields.slice(fieldIndex + 1),
    ]);
    setExpandedId(copy.id);
  };
  // A step with questions is only removed after asking; an empty one goes at once.
  const requestRemoveStep = (stepIndex: number): void => {
    if ((steps[stepIndex]?.fields.length ?? 0) > 0) setPending({ kind: 'step', stepIndex });
    else onChange(steps.filter((_step, position) => position !== stepIndex));
  };
  const confirmRemoval = (): void => {
    if (!pending) return;
    if (pending.kind === 'step') {
      onChange(steps.filter((_step, position) => position !== pending.stepIndex));
    } else {
      setFields(
        pending.stepIndex,
        (steps[pending.stepIndex]?.fields ?? []).filter((field) => field.id !== pending.field.id),
      );
    }
    setPending(null);
  };

  if (steps.length === 0) {
    return (
      <EmptyState
        compact
        icon={<PostAddRoundedIcon />}
        title="No steps yet"
        description="A form is a series of steps, each one screen for the applicant. Add the first step, then its questions."
        primaryAction={{ label: 'Add a step', onClick: addStep, icon: <AddRoundedIcon /> }}
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        {countLine(steps)}
      </Typography>
      <ProblemSummary problems={problems} />
      {steps.map((step, stepIndex) => (
        <StepSection
          key={step.id}
          steps={steps}
          stepIndex={stepIndex}
          onStepChange={(next) => setStep(stepIndex, next)}
          onMoveStep={(offset) => onChange(moveItem(steps, stepIndex, stepIndex + offset))}
          onRemoveStep={() => requestRemoveStep(stepIndex)}
          onAddField={(type) => addField(stepIndex, type)}
          onMoveField={(from, to) => setFields(stepIndex, moveItem(step.fields, from, to))}
          onMoveFieldToStep={moveFieldToStep}
          onDuplicateField={(fieldIndex) => duplicate(stepIndex, fieldIndex)}
          onRemoveField={(field) => setPending({ kind: 'field', stepIndex, field })}
          expandedId={expandedId}
          onToggleField={(fieldId) =>
            setExpandedId((current) => (current === fieldId ? null : fieldId))
          }
          problems={problems}
          showErrors={showErrors}
          disabled={disabled}
          onUploadingChange={onUploadingChange}
        />
      ))}
      <Box>
        <Button
          variant="outlined"
          startIcon={<AddRoundedIcon />}
          onClick={addStep}
          disabled={disabled || steps.length >= MAX_STEPS}
        >
          Add a step
        </Button>
      </Box>
      <RemovalDialog
        pending={pending}
        steps={steps}
        onConfirm={confirmRemoval}
        onClose={() => setPending(null)}
      />
    </Stack>
  );
};

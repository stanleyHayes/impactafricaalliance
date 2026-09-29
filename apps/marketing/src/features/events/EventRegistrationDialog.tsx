import type {
  Event,
  EventAnswer,
  EventRegistrationInput,
  EventRegistrationResult,
} from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { DateField } from '../../components/forms/DateField';
import { calendarDateProblem } from '../../lib/calendar-date';
import { useRegisterForEvent } from '../../lib/mutations';

import { buildSteps, type RegistrationStep } from './registration-steps';

interface EventRegistrationDialogProps {
  event: Event;
  open: boolean;
  onClose: () => void;
}

type AnswerValue = string | string[];

const isBlank = (value: AnswerValue | undefined): boolean =>
  value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim() === '');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate the current step in isolation; empty is fine unless it is required.
 * A date is checked here too, since the Day / Month / Year field keeps an
 * unfinished date as typed rather than quietly dropping it.
 */
const stepError = (step: RegistrationStep, value: AnswerValue | undefined): string | undefined => {
  if (isBlank(value)) {
    return step.required ? 'This one we do need.' : undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  if (step.kind === 'email' && !EMAIL_PATTERN.test(value.trim())) {
    return 'That email address does not look right.';
  }
  return step.kind === 'date' ? (calendarDateProblem(value) ?? undefined) : undefined;
};

/** Enter in a one-line input moves on, as a form would submit. */
const enterAdvances =
  (onEnter: () => void) =>
  (keyEvent: KeyboardEvent<HTMLElement>): void => {
    if (keyEvent.key === 'Enter' && (keyEvent.target as HTMLElement).tagName === 'INPUT') {
      keyEvent.preventDefault();
      onEnter();
    }
  };

interface SuccessPanelProps {
  title: string;
  /** The server's answer, which carries the joining link when there is one. */
  result: EventRegistrationResult;
  onClose: () => void;
}

const SuccessPanel = ({ title, result, onClose }: SuccessPanelProps): JSX.Element => {
  const { alreadyRegistered, meetingUrl } = result;
  return (
    <Stack spacing={2.5} alignItems="flex-start">
      <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 56 }} />
      <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
        {alreadyRegistered ? "You're already on the list." : "You're in."}
      </Typography>
      <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
        {meetingUrl ? (
          <>
            Here is your link to join <strong>{title}</strong>. We&apos;ll email it to you as well,
            so you have it when the session starts.
          </>
        ) : (
          <>
            We&apos;ll email the joining details for <strong>{title}</strong> before it starts. Keep
            an eye on your inbox.
          </>
        )}
      </Typography>
      {meetingUrl && (
        <Box
          sx={{
            alignSelf: 'stretch',
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Button
            component="a"
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            startIcon={<VideocamRoundedIcon />}
            sx={{ fontWeight: 700 }}
          >
            Join the session
          </Button>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.5, overflowWrap: 'anywhere' }}
          >
            {meetingUrl}
          </Typography>
        </Box>
      )}
      <Button
        variant={meetingUrl ? 'text' : 'contained'}
        onClick={onClose}
        sx={{ mt: 1, fontWeight: 700 }}
      >
        Done
      </Button>
    </Stack>
  );
};

interface ConsentPanelProps {
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  failed: boolean;
}

const ConsentPanel = ({ consent, onConsentChange, failed }: ConsentPanelProps): JSX.Element => (
  <Stack spacing={2.5} sx={{ mt: 2 }}>
    <Typography variant="h4" sx={{ fontSize: { xs: '1.6rem', md: '2.1rem' } }}>
      One last thing.
    </Typography>
    <FormControlLabel
      control={
        <Checkbox checked={consent} onChange={(_event, checked) => onConsentChange(checked)} />
      }
      label="I agree to Impact Africa Alliance contacting me about this event and processing my details under the Privacy Policy."
    />
    {failed && (
      <Alert severity="error">We couldn&apos;t complete your registration. Please try again.</Alert>
    )}
  </Stack>
);

interface StepFooterProps {
  canGoBack: boolean;
  showSkip: boolean;
  isConsentStep: boolean;
  canSubmit: boolean;
  pending: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const StepFooter = ({
  canGoBack,
  showSkip,
  isConsentStep,
  canSubmit,
  pending,
  onBack,
  onNext,
  onSubmit,
}: StepFooterProps): JSX.Element => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1.5}
    sx={{ flexShrink: 0, px: { xs: 2.5, md: 5 }, py: 3 }}
  >
    <Button
      onClick={onBack}
      disabled={!canGoBack}
      startIcon={<ArrowBackRoundedIcon />}
      sx={{ fontWeight: 700 }}
    >
      Back
    </Button>
    <Box sx={{ flex: 1 }} />
    {showSkip && (
      <Button onClick={onNext} sx={{ color: 'text.secondary', fontWeight: 700 }}>
        Skip
      </Button>
    )}
    {isConsentStep ? (
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={!canSubmit || pending}
        sx={{ fontWeight: 750 }}
      >
        {pending ? 'Registering…' : 'Complete registration'}
      </Button>
    ) : (
      <Button
        variant="contained"
        onClick={onNext}
        endIcon={<ArrowForwardRoundedIcon />}
        sx={{ fontWeight: 750 }}
      >
        Continue
      </Button>
    )}
  </Stack>
);

interface StepIds {
  /** The question heading, which names the answer. */
  question: string;
  /** Hint and error ids, for `aria-describedby`. */
  describedBy: string | undefined;
  error: string;
}

interface StepFieldProps {
  step: RegistrationStep;
  value: AnswerValue | undefined;
  error: string | undefined;
  ids: StepIds;
  fieldRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: AnswerValue) => void;
  onEnter: () => void;
}

/** The ids tying the current question, its hint and its problem to the answer. */
const stepIdsFor = (
  base: string,
  step: RegistrationStep | undefined,
  error: string | undefined,
): StepIds => ({
  question: `${base}-question`,
  error: `${base}-error`,
  describedBy:
    [step?.hint ? `${base}-hint` : '', error ? `${base}-error` : ''].filter(Boolean).join(' ') ||
    undefined,
});

/** The problem with the answer, in words, tied to the answer by its id. */
const StepError = ({ id, message }: { id: string; message: string | undefined }) =>
  message ? (
    <Typography id={id} role="alert" sx={{ mt: 1.5, color: 'error.main', fontWeight: 600 }}>
      {message}
    </Typography>
  ) : null;

const SingleChoiceStep = ({ step, value, ids, onChange }: StepFieldProps): JSX.Element => (
  <RadioGroup
    sx={{ mt: 2 }}
    aria-labelledby={ids.question}
    aria-describedby={ids.describedBy}
    value={typeof value === 'string' ? value : ''}
    onChange={(changeEvent) => onChange(changeEvent.target.value)}
  >
    {(step.options ?? []).map((option) => (
      <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
    ))}
  </RadioGroup>
);

const MultiChoiceStep = ({ step, value, ids, onChange }: StepFieldProps): JSX.Element => {
  const selected = Array.isArray(value) ? value : [];
  return (
    <Stack
      role="group"
      aria-labelledby={ids.question}
      aria-describedby={ids.describedBy}
      sx={{ mt: 2 }}
    >
      {(step.options ?? []).map((option) => (
        <FormControlLabel
          key={option}
          control={
            <Checkbox
              checked={selected.includes(option)}
              onChange={(_changeEvent, checked) =>
                onChange(
                  checked ? [...selected, option] : selected.filter((entry) => entry !== option),
                )
              }
            />
          }
          label={option}
        />
      ))}
    </Stack>
  );
};

// The dialog's big answer type, shared by the text input and the date parts.
const ANSWER_INPUT_SX = {
  '& .MuiInputBase-input': { fontSize: { xs: '1.35rem', md: '1.8rem' }, py: 1.5 },
} as const;

/** A date as Day, Month and Year, never the browser's own date input. */
const DateStep = ({
  step,
  value,
  error,
  ids,
  fieldRef,
  onChange,
  onEnter,
}: StepFieldProps): JSX.Element => (
  <Box sx={{ mt: 3 }} onKeyDown={enterAdvances(onEnter)}>
    <DateField
      id={`registration-${step.key}`}
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
      labelledBy={ids.question}
      describedBy={ids.describedBy}
      invalid={Boolean(error)}
      required={step.required}
      clearable={!step.required}
      variant="standard"
      inputSx={ANSWER_INPUT_SX}
      dayRef={fieldRef}
    />
  </Box>
);

// Only the types that bring up the right phone keyboard. Anything else is
// plain text, so a new step kind can never fall back to a browser picker.
const TEXT_INPUT_TYPES: Partial<Record<RegistrationStep['kind'], string>> = {
  email: 'email',
  tel: 'tel',
};

const TextStep = ({
  step,
  value,
  error,
  ids,
  fieldRef,
  onChange,
  onEnter,
}: StepFieldProps): JSX.Element => {
  const isLongText = step.kind === 'long-text';
  return (
    <TextField
      inputRef={fieldRef}
      fullWidth
      autoComplete="off"
      variant="standard"
      type={TEXT_INPUT_TYPES[step.kind] ?? 'text'}
      multiline={isLongText}
      minRows={isLongText ? 3 : undefined}
      placeholder={step.placeholder}
      value={typeof value === 'string' ? value : ''}
      onChange={(changeEvent) => onChange(changeEvent.target.value)}
      onKeyDown={isLongText ? undefined : enterAdvances(onEnter)}
      error={Boolean(error)}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: {
          'aria-labelledby': ids.question,
          'aria-describedby': ids.describedBy,
          'aria-invalid': Boolean(error) || undefined,
          'aria-required': step.required || undefined,
        },
      }}
      sx={{ mt: 3, ...ANSWER_INPUT_SX }}
    />
  );
};

const STEP_FIELDS: Record<RegistrationStep['kind'], (props: StepFieldProps) => JSX.Element> = {
  text: TextStep,
  email: TextStep,
  tel: TextStep,
  'long-text': TextStep,
  date: DateStep,
  'single-choice': SingleChoiceStep,
  'multi-choice': MultiChoiceStep,
};

/**
 * The answer for the current step, chosen by the step's answer type, with
 * its problem (if any) written underneath. Every kind shows the problem in
 * words; the choice steps used to show nothing at all.
 */
const StepField = (props: StepFieldProps): JSX.Element => {
  const Field = STEP_FIELDS[props.step.kind];
  return (
    <>
      <Field {...props} />
      <StepError id={props.ids.error} message={props.error} />
    </>
  );
};

/**
 * Registration as a sequence of single questions rather than one long form.
 * Core audience questions come first and are skippable; anything the event
 * added of its own follows, then consent.
 */
export const EventRegistrationDialog = ({
  event,
  open,
  onClose,
}: EventRegistrationDialogProps): JSX.Element => {
  const steps = useMemo(() => buildSteps(event), [event]);
  const register = useRegisterForEvent(event.id);
  const resetRegister = register.reset;

  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const idBase = useId();

  // The consent panel lives one past the last question.
  const isConsentStep = index === steps.length;
  const step = steps[index];
  const total = steps.length + 1;

  useEffect(() => {
    if (open) {
      setIndex(0);
      setValues({});
      setConsent(false);
      setTouched(false);
      resetRegister();
    }
  }, [open, resetRegister]);

  useEffect(() => {
    const timer = window.setTimeout(() => fieldRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [index]);

  const error = touched && step ? stepError(step, values[step.key]) : undefined;
  const ids = stepIdsFor(idBase, step, error);

  const goNext = (): void => {
    if (step) {
      const problem = stepError(step, values[step.key]);
      if (problem) {
        setTouched(true);
        return;
      }
    }
    setTouched(false);
    setIndex((previous) => Math.min(previous + 1, steps.length));
  };

  const goBack = (): void => {
    setTouched(false);
    setIndex((previous) => Math.max(previous - 1, 0));
  };

  const setValue = (key: string, value: AnswerValue): void => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const submit = (): void => {
    const core: Record<string, string> = {};
    const answers: EventAnswer[] = [];

    for (const entry of steps) {
      const value = values[entry.key];
      if (isBlank(value)) {
        continue;
      }
      if (entry.core && typeof value === 'string') {
        core[entry.key] = value.trim();
      } else if (!entry.core && value !== undefined) {
        answers.push({ questionId: entry.key, label: entry.question, value });
      }
    }

    register.mutate({
      ...core,
      fullName: core.fullName ?? '',
      email: core.email ?? '',
      answers,
      consent: true,
    } as EventRegistrationInput);
  };

  const succeeded = register.isSuccess;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          minHeight: '100%',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        <LinearProgress
          variant="determinate"
          value={succeeded ? 100 : ((index + 1) / total) * 100}
          sx={{ height: 4 }}
        />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ flexShrink: 0, px: { xs: 2.5, md: 5 }, py: 2 }}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: 1.2,
            }}
          >
            {succeeded ? 'REGISTERED' : `${index + 1} / ${total}`}
          </Typography>
          <IconButton aria-label="Close registration" onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 3, md: 5 },
            py: 4,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 640 }}>
            {succeeded && register.data ? (
              <SuccessPanel title={event.title} result={register.data} onClose={onClose} />
            ) : (
              <>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {event.title}
                </Typography>

                {isConsentStep ? (
                  <ConsentPanel
                    consent={consent}
                    onConsentChange={setConsent}
                    failed={register.isError}
                  />
                ) : (
                  step && (
                    <>
                      <Typography
                        id={ids.question}
                        variant="h3"
                        sx={{
                          mt: 1.5,
                          fontSize: { xs: '1.7rem', md: '2.35rem' },
                          lineHeight: 1.25,
                        }}
                      >
                        {step.question}
                      </Typography>
                      {step.hint && (
                        <Typography
                          id={`${idBase}-hint`}
                          color="text.secondary"
                          sx={{ mt: 1.5, lineHeight: 1.7 }}
                        >
                          {step.hint}
                        </Typography>
                      )}
                      <StepField
                        key={step.key}
                        step={step}
                        value={values[step.key]}
                        error={error}
                        ids={ids}
                        fieldRef={fieldRef}
                        onChange={(next) => setValue(step.key, next)}
                        onEnter={goNext}
                      />
                    </>
                  )
                )}
              </>
            )}
          </Box>
        </Box>

        {!succeeded && (
          <StepFooter
            canGoBack={index > 0}
            showSkip={!isConsentStep && Boolean(step) && !step?.required}
            isConsentStep={isConsentStep}
            canSubmit={consent}
            pending={register.isPending}
            onBack={goBack}
            onNext={goNext}
            onSubmit={submit}
          />
        )}
      </Box>
    </Dialog>
  );
};

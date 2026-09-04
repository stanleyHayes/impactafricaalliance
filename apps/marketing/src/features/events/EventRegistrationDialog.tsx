import type { Event, EventAnswer, EventRegistrationInput } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
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
import { useEffect, useMemo, useRef, useState } from 'react';

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

/** Validate the current step in isolation; empty is fine unless it is required. */
const stepError = (step: RegistrationStep, value: AnswerValue | undefined): string | undefined => {
  if (isBlank(value)) {
    return step.required ? 'This one we do need.' : undefined;
  }
  if (step.kind === 'email' && typeof value === 'string' && !EMAIL_PATTERN.test(value.trim())) {
    return 'That email address does not look right.';
  }
  return undefined;
};



interface SuccessPanelProps {
  title: string;
  alreadyRegistered: boolean;
  onClose: () => void;
}

const SuccessPanel = ({ title, alreadyRegistered, onClose }: SuccessPanelProps): JSX.Element => (
  <Stack spacing={2.5} alignItems="flex-start">
    <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 56 }} />
    <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
      {alreadyRegistered ? "You're already on the list." : "You're in."}
    </Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      We&apos;ll email the joining details for <strong>{title}</strong> before it starts. Keep an
      eye on your inbox.
    </Typography>
    <Button variant="contained" onClick={onClose} sx={{ mt: 1, fontWeight: 700 }}>
      Done
    </Button>
  </Stack>
);


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
      <Alert severity="error">
        We couldn&apos;t complete your registration. Please try again.
      </Alert>
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

interface StepFieldProps {
  step: RegistrationStep;
  value: AnswerValue | undefined;
  error: string | undefined;
  fieldRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: AnswerValue) => void;
  onEnter: () => void;
}

/** The single input for the current step, chosen by the step's answer type. */
const StepField = ({
  step,
  value,
  error,
  fieldRef,
  onChange,
  onEnter,
}: StepFieldProps): JSX.Element => {
  if (step.kind === 'single-choice') {
    return (
      <RadioGroup
        sx={{ mt: 2 }}
        value={typeof value === 'string' ? value : ''}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
      >
        {(step.options ?? []).map((option) => (
          <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
        ))}
      </RadioGroup>
    );
  }

  if (step.kind === 'multi-choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <Stack sx={{ mt: 2 }}>
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
  }

  const isLongText = step.kind === 'long-text';
  return (
    <TextField
      inputRef={fieldRef}
      fullWidth
      autoComplete="off"
      variant="standard"
      type={isLongText ? 'text' : step.kind}
      multiline={isLongText}
      minRows={isLongText ? 3 : undefined}
      placeholder={step.placeholder}
      value={typeof value === 'string' ? value : ''}
      onChange={(changeEvent) => onChange(changeEvent.target.value)}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === 'Enter' && !isLongText) {
          keyEvent.preventDefault();
          onEnter();
        }
      }}
      error={Boolean(error)}
      helperText={error}
      slotProps={{ inputLabel: { shrink: true } }}
      sx={{ mt: 3, '& .MuiInputBase-input': { fontSize: { xs: '1.35rem', md: '1.8rem' }, py: 1.5 } }}
    />
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
            sx={{ color: 'text.secondary', fontSize: '0.78rem', fontWeight: 700, letterSpacing: 1.2 }}
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
            {succeeded ? (
              <SuccessPanel
                title={event.title}
                alreadyRegistered={Boolean(register.data?.alreadyRegistered)}
                onClose={onClose}
              />
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
                        variant="h3"
                        sx={{ mt: 1.5, fontSize: { xs: '1.7rem', md: '2.35rem' }, lineHeight: 1.25 }}
                      >
                        {step.question}
                      </Typography>
                      {step.hint && (
                        <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
                          {step.hint}
                        </Typography>
                      )}
                                    <StepField
                        step={step}
                        value={values[step.key]}
                        error={error}
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

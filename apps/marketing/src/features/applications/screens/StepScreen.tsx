import { answerFor, type AnswerMap, type FormStep } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, type SubmitEvent, type KeyboardEvent } from 'react';

import { fieldInputId, isRequiredField } from '../fields/field-props';
import { QuestionField } from '../fields/QuestionField';
import type { AnswerUpdate, FocusRequest } from '../session-state';
import { EYEBROW_SX } from '../styles';

import {
  FormImage,
  PrimaryButton,
  STEP_IMAGE_SIZES,
  ScreenColumn,
  ScreenFooter,
  ScreenHeading,
  useFocusOnMount,
} from './ScreenParts';

export interface StepScreenProps {
  step: FormStep;
  formTitle: string;
  isLast: boolean;
  answers: AnswerMap;
  errors: Record<string, string>;
  focus: FocusRequest | null;
  notice: string | null;
  uploading: boolean;
  returnToReview: boolean;
  onAnswer: (fieldId: string, update: AnswerUpdate) => void;
  onNext: () => void;
  onBack: () => void;
}

const focusQuestion = (fieldId: string): void => {
  const target = document.getElementById(fieldInputId(fieldId));
  target?.focus();
  target?.scrollIntoView?.({ block: 'center' });
};

/**
 * Enter moves on from a one-line answer, as a form would submit. Never from
 * a textarea (Enter is a new line there), never while an input method is
 * still composing text (Enter confirms the characters), and never from other
 * inputs such as radio buttons, where browsers would otherwise submit the
 * form by surprise.
 */
const useEnterToAdvance = (onNext: () => void) => {
  const composing = useRef(false);
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>): void => {
    const target = event.target as HTMLElement;
    if (event.key !== 'Enter' || target.tagName !== 'INPUT') {
      return;
    }
    event.preventDefault();
    if (composing.current || event.nativeEvent.isComposing) {
      return;
    }
    if (target.dataset.enterAdvances === 'true') {
      onNext();
    }
  };
  return {
    onKeyDown,
    onCompositionStart: () => {
      composing.current = true;
    },
    // Safari ends composition just before the keydown that confirmed it, so
    // the flag is cleared a moment later rather than at once.
    onCompositionEnd: () => {
      window.setTimeout(() => {
        composing.current = false;
      }, 0);
    },
  };
};

interface ErrorSummaryProps {
  step: FormStep;
  errors: Record<string, string>;
}

/**
 * Every problem on the step, each linking to its question. Announced when it
 * appears, while focus goes to the first question that needs attention.
 */
const ErrorSummary = ({ step, errors }: ErrorSummaryProps): JSX.Element | null => {
  const problems = step.fields.filter((field) => errors[field.id]);
  if (problems.length === 0) {
    return null;
  }
  const title =
    problems.length === 1
      ? 'One answer needs attention'
      : `${problems.length} answers need attention`;
  return (
    <Alert severity="error" role="alert" sx={{ mt: 3, borderRadius: 3, alignItems: 'flex-start' }}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
        {problems.map((field) => (
          <li key={field.id}>
            <Link
              component="button"
              type="button"
              onClick={() => focusQuestion(field.id)}
              // A block, so a wrapped entry keeps its bullet on the first line.
              sx={{ display: 'block', color: 'inherit', textAlign: 'left' }}
            >
              <Box component="span" sx={{ display: 'block', fontWeight: 700 }}>
                {field.label}
              </Box>
              {errors[field.id]}
            </Link>
          </li>
        ))}
      </Box>
    </Alert>
  );
};

const continueLabel = (isLast: boolean, returnToReview: boolean, uploading: boolean): string => {
  if (uploading) {
    return 'Uploading…';
  }
  if (returnToReview) {
    return 'Return to review';
  }
  return isLast ? 'Review answers' : 'Continue';
};

/**
 * One step of the form: its title as the page heading, its description and
 * image, and the questions the applicant can see. Continue checks this step
 * before moving on; problems are listed at the top, marked on each question,
 * and focus goes to the first one.
 */
export const StepScreen = ({
  step,
  formTitle,
  isLast,
  answers,
  errors,
  focus,
  notice,
  uploading,
  returnToReview,
  onAnswer,
  onNext,
  onBack,
}: StepScreenProps): JSX.Element => {
  // A step reached because of a problem sends focus to that question instead.
  const headingRef = useFocusOnMount<HTMLHeadingElement>(focus === null);
  const headingId = `step-${step.id}-title`;
  const keyHandlers = useEnterToAdvance(onNext);
  const focusSeq = focus?.seq;
  const focusFieldId = focus?.fieldId;

  useEffect(() => {
    if (focusFieldId !== undefined) {
      focusQuestion(focusFieldId);
    }
  }, [focusFieldId, focusSeq]);

  const onSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onNext();
  };

  const hasRequired = step.fields.some(isRequiredField);

  return (
    <Box
      component="form"
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={headingId}
      sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}
      {...keyHandlers}
    >
      <ScreenColumn>
        {step.image && (
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <FormImage image={step.image} aspectRatio="16 / 9" sizes={STEP_IMAGE_SIZES} />
          </Box>
        )}
        <Typography sx={EYEBROW_SX}>{formTitle}</Typography>
        <Box sx={{ mt: 1 }}>
          <ScreenHeading ref={headingRef} id={headingId}>
            {step.title}
          </ScreenHeading>
        </Box>
        {step.description && (
          <Typography
            sx={{
              mt: 2,
              color: 'text.secondary',
              fontSize: { xs: '1.0625rem', md: '1.1875rem' },
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
            }}
          >
            {step.description}
          </Typography>
        )}
        {hasRequired && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
            Questions marked * need an answer.
          </Typography>
        )}
        {notice && (
          // Polite: the problem list below is the one that interrupts.
          <Alert severity="warning" role="status" sx={{ mt: 3, borderRadius: 3 }}>
            {notice}
          </Alert>
        )}
        <ErrorSummary step={step} errors={errors} />
        <Stack spacing={{ xs: 4, md: 5 }} sx={{ mt: { xs: 4, md: 5 } }}>
          {step.fields.map((field) => (
            <QuestionField
              key={field.id}
              field={field}
              value={answerFor(answers, field.id)}
              error={errors[field.id]}
              onChange={onAnswer}
            />
          ))}
        </Stack>
      </ScreenColumn>
      <ScreenFooter
        onBack={onBack}
        backDisabled={uploading}
        primary={
          <PrimaryButton type="submit" disabled={uploading}>
            {continueLabel(isLast, returnToReview, uploading)}
          </PrimaryButton>
        }
      />
    </Box>
  );
};

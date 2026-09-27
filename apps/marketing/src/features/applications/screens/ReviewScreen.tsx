import type { AnswerMap, FormField, FormStep } from '@iaa/shared';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { summariseAnswer } from '../answers';
import { EYEBROW_SX, QUIET_BUTTON_SX } from '../styles';
import { useDelayedFlag } from '../use-delayed-flag';

import {
  PrimaryButton,
  ScreenColumn,
  ScreenFooter,
  ScreenHeading,
  useFocusOnMount,
} from './ScreenParts';

export interface ReviewScreenProps {
  formTitle: string;
  steps: FormStep[];
  answers: AnswerMap;
  notice: string | null;
  submitting: boolean;
  /** The draft was lost; sending starts a new application (see `DraftLostBanner`). */
  asNew: boolean;
  preview: boolean;
  onEdit: (stepId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const AnswerText = ({ field, answers }: { field: FormField; answers: AnswerMap }): JSX.Element => {
  const summary = summariseAnswer(field, answers);
  if (summary.kind === 'empty') {
    return (
      <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
        Not answered
      </Box>
    );
  }
  if (summary.kind === 'list') {
    return (
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {summary.items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </Box>
    );
  }
  return <>{summary.text}</>;
};

const StepAnswers = ({
  step,
  answers,
  onEdit,
}: {
  step: FormStep;
  answers: AnswerMap;
  onEdit: (stepId: string) => void;
}): JSX.Element => {
  const headingId = `review-${step.id}`;
  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        p: { xs: 2, sm: 3 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 4,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2}>
        <Typography
          id={headingId}
          component="h2"
          sx={{
            fontSize: { xs: '1.25rem', md: '1.375rem' },
            fontWeight: 700,
            overflowWrap: 'anywhere',
          }}
        >
          {step.title}
        </Typography>
        <Button
          size="small"
          startIcon={<EditRoundedIcon fontSize="small" />}
          onClick={() => onEdit(step.id)}
          aria-label={`Edit ${step.title}`}
          sx={{ ...QUIET_BUTTON_SX, flexShrink: 0 }}
        >
          Edit
        </Button>
      </Stack>
      <Box component="dl" sx={{ m: 0, mt: 1.5 }}>
        {step.fields.map((field) => (
          <Box
            key={field.id}
            sx={{
              py: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              '&:first-of-type': { borderTop: 0, pt: 0.5 },
            }}
          >
            <Typography
              component="dt"
              sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.5 }}
            >
              {field.label}
            </Typography>
            <Typography
              component="dd"
              sx={{
                m: 0,
                mt: 0.5,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
                overflowWrap: 'anywhere',
              }}
            >
              <AnswerText field={field} answers={answers} />
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const sendLabel = (submitting: boolean, asNew: boolean): string => {
  if (submitting) {
    return 'Sending…';
  }
  return asNew ? 'Send as a new application' : 'Send application';
};

/**
 * Every answer the applicant can see, grouped by step, each group with a way
 * back to change it. Nothing is sent until they press the button here.
 */
export const ReviewScreen = ({
  formTitle,
  steps,
  answers,
  notice,
  submitting,
  asNew,
  preview,
  onEdit,
  onBack,
  onSubmit,
}: ReviewScreenProps): JSX.Element => {
  // Focus stays on the button while sending; only arrival moves it here.
  const headingRef = useFocusOnMount<HTMLHeadingElement>(true);
  const slow = useDelayedFlag(submitting);
  const answered = steps.filter((step) => step.fields.length > 0);

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
      <ScreenColumn>
        <Typography sx={EYEBROW_SX}>{formTitle}</Typography>
        <Box sx={{ mt: 1 }}>
          <ScreenHeading ref={headingRef}>Check your answers</ScreenHeading>
        </Box>
        <Typography
          sx={{
            mt: 2,
            color: 'text.secondary',
            fontSize: { xs: '1.0625rem', md: '1.1875rem' },
            lineHeight: 1.7,
          }}
        >
          Make sure everything is right before you send it. You can change any answer.
        </Typography>
        {notice && (
          <Alert severity="error" sx={{ mt: 3, borderRadius: 3 }}>
            {notice}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: { xs: 3, md: 4 } }}>
          {answered.map((step) => (
            <StepAnswers key={step.id} step={step} answers={answers} onEdit={onEdit} />
          ))}
        </Stack>
        {submitting && (
          <Typography role="status" sx={{ mt: 3, color: 'text.secondary' }}>
            {slow
              ? 'Still sending. If our server was asleep this can take up to a minute; please keep this page open.'
              : 'Sending your application…'}
          </Typography>
        )}
        {preview && (
          <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
            This is a preview, so sending shows the confirmation without saving anything.
          </Typography>
        )}
      </ScreenColumn>
      <ScreenFooter
        onBack={onBack}
        backDisabled={submitting}
        primary={
          <PrimaryButton onClick={onSubmit} disabled={submitting}>
            {sendLabel(submitting, asNew)}
          </PrimaryButton>
        }
      />
    </Box>
  );
};

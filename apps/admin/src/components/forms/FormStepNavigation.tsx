import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';

interface FormStepNavigationProps {
  steps: readonly string[];
  activeStep: number;
  maxStep?: number;
  onStepChange: (step: number) => void;
  disabled?: boolean;
}

/** Shared progress navigation for dedicated create/edit pages. */
export const FormStepNavigation = ({
  steps,
  activeStep,
  maxStep = activeStep,
  onStepChange,
  disabled = false,
}: FormStepNavigationProps): JSX.Element => (
  <Box component="nav" aria-label="Form steps" sx={{ mb: 3 }}>
    <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }} aria-live="polite">
      Step {activeStep + 1} of {steps.length} · {steps[activeStep]}
    </Typography>
    <Box sx={{ overflowX: 'auto', overflowY: 'hidden', py: 1, px: 0.5 }}>
      <Stepper
        nonLinear
        activeStep={activeStep}
        alternativeLabel
        sx={{ minWidth: steps.length * 120 }}
      >
        {steps.map((label, index) => (
          <Step key={label} completed={index < maxStep}>
            <StepButton
              onClick={() => onStepChange(index)}
              disabled={disabled || index > maxStep}
              aria-current={index === activeStep ? 'step' : undefined}
              sx={{
                // Contain MUI's expanded hit area within the horizontal scroll track.
                m: 0,
                p: 0,
                boxSizing: 'border-box',
                borderRadius: 1,
                '&.Mui-focusVisible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 3,
                },
              }}
            >
              {label}
            </StepButton>
          </Step>
        ))}
      </Stepper>
    </Box>
    <LinearProgress
      variant="determinate"
      value={((activeStep + 1) / steps.length) * 100}
      aria-label="Form progress"
      sx={{ mt: 2, height: 3, borderRadius: 2 }}
    />
  </Box>
);

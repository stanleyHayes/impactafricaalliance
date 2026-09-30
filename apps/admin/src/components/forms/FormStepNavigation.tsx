import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';

import { skinned, surfaceSx, tokenVar } from '../../theme/surfaces';
import { OptionSelect, type SelectChoice } from '../fields/OptionSelect';

interface FormStepNavigationProps {
  steps: readonly string[];
  activeStep: number;
  maxStep?: number;
  onStepChange: (step: number) => void;
  disabled?: boolean;
}

/**
 * The phone-width step list. Steps past the furthest one reached stay in the
 * list, so the reader can see what is coming, but cannot be chosen until the
 * steps before them have been checked.
 */
const stepChoices = (steps: readonly string[], maxStep: number): SelectChoice[] =>
  steps.map((label, index) => ({
    value: String(index),
    label: `${index + 1}. ${label}`,
    ...(index > maxStep
      ? { disabled: true, description: 'Opens once the steps before it are complete.' }
      : {}),
  }));

/**
 * A step's button. Classic marks the current step with MUI's selected fill
 * and rings keyboard focus in the primary. A skin marks it the way it marks
 * any selected item (Neumorphism presses it in), answers the pointer like
 * its list items, and rings focus in its own ring.
 */
const stepButtonSx = (current: boolean) =>
  skinned(
    {
      // Contain MUI's expanded hit area within the horizontal scroll track.
      m: 0,
      p: 0,
      boxSizing: 'border-box',
      borderRadius: 2,
      py: 1.5,
      bgcolor: current ? 'action.selected' : 'transparent',
      '&.Mui-focusVisible': {
        outline: '2px solid',
        outlineColor: 'primary.main',
        outlineOffset: 3,
      },
    },
    {
      bgcolor: current ? tokenVar('itemSelectedBg') : 'transparent',
      boxShadow: current ? tokenVar('itemSelectedShadow') : 'none',
      '&:hover': current
        ? {}
        : { bgcolor: tokenVar('itemHoverBg'), boxShadow: tokenVar('itemHoverShadow') },
      '&.Mui-focusVisible': {
        outline: tokenVar('focusRing'),
        outlineColor: tokenVar('focusRingColor'),
      },
    },
  );

/**
 * Shared progress navigation for dedicated create/edit pages.
 *
 * On a phone the stepper does not fit, so a "Go to step" menu stands in for
 * it. That menu is the console's own `OptionSelect` rather than the browser's
 * native select, whose system picker ignored the theme and looked different
 * on every device.
 */
export const FormStepNavigation = ({
  steps,
  activeStep,
  maxStep = activeStep,
  onStepChange,
  disabled = false,
}: FormStepNavigationProps): JSX.Element => (
  <Box
    component="nav"
    aria-label="Form steps"
    sx={{
      mb: 3,
      p: { xs: 2, md: 2.5 },
      // The skin's card (Classic: paper with a hairline).
      ...surfaceSx.card,
      borderRadius: 3,
    }}
  >
    <Typography
      variant="body2"
      sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 600 }}
      aria-live="polite"
    >
      Step {activeStep + 1} of {steps.length} · {steps[activeStep]}
    </Typography>
    <OptionSelect
      label="Go to step"
      size="small"
      options={stepChoices(steps, maxStep)}
      value={String(activeStep)}
      disabled={disabled}
      onChange={(value) => onStepChange(Number(value))}
      sx={{ display: { xs: 'block', sm: 'none' } }}
    />
    <Box
      sx={{
        display: { xs: 'none', sm: 'block' },
        overflowX: 'auto',
        overflowY: 'hidden',
        py: 1,
        px: 0.5,
      }}
    >
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
              sx={stepButtonSx(index === activeStep)}
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

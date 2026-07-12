import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Portal from '@mui/material/Portal';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';

import { usePreferences } from '../../lib/preferences';

import { TOUR_STEPS } from './tour-steps';
import { useTour } from './TourContext';

const getHorizontalAnchor = (placement?: string): 'left' | 'center' | 'right' => {
  if (placement === 'left') return 'left';
  if (placement === 'right') return 'right';
  return 'center';
};

const getHorizontalTransform = (placement?: string): 'left' | 'center' | 'right' => {
  if (placement === 'left') return 'right';
  if (placement === 'right') return 'left';
  return 'center';
};

export const Tour = (): JSX.Element | null => {
  const theme = useTheme();
  const { isOpen, close } = useTour();
  const { setPreference } = usePreferences();
  const [stepIndex, setStepIndex] = useState(0);

  const step = TOUR_STEPS[stepIndex]!;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const target = useMemo(() => {
    if (!isOpen || !step.targetId) return null;
    return document.getElementById(step.targetId);
  }, [isOpen, step]);

  // Reset to first step whenever the tour opens.
  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  // Mark tour as completed once it is closed after having started.
  useEffect(() => {
    if (!isOpen) return;
    setPreference('tourCompleted', true);
  }, [isOpen, setPreference]);

  if (!isOpen || !step) return null;

  const handleNext = (): void => {
    if (isLast) {
      close();
    } else {
      setStepIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
    }
  };

  const handleBack = (): void => setStepIndex((i) => Math.max(i - 1, 0));

  const horizontalAnchor = getHorizontalAnchor(step.placement);
  const horizontalTransform = getHorizontalTransform(step.placement);

  const popover = target ? (
    <Popover
      open
      sx={{ zIndex: 1401 }}
      anchorEl={target}
      anchorOrigin={{
        vertical: step.placement === 'top' ? 'top' : 'bottom',
        horizontal: horizontalAnchor,
      }}
      transformOrigin={{
        vertical: step.placement === 'top' ? 'bottom' : 'top',
        horizontal: horizontalTransform,
      }}
      hideBackdrop
      disableAutoFocus
      disableRestoreFocus
      disablePortal
      slotProps={{
        paper: {
          sx: {
            width: 320,
            p: 2.5,
            borderRadius: 2.5,
            border: 1,
            borderColor: 'divider',
            boxShadow: (t) => t.shadows[12],
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      <TourCard
        step={step}
        stepIndex={stepIndex}
        total={TOUR_STEPS.length}
        onBack={handleBack}
        onNext={handleNext}
        onClose={close}
        isLast={isLast}
      />
    </Popover>
  ) : (
    <Paper
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 360,
        p: 3,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        boxShadow: (t) => t.shadows[16],
        zIndex: 1401,
      }}
    >
      <TourCard
        step={step}
        stepIndex={stepIndex}
        total={TOUR_STEPS.length}
        onBack={handleBack}
        onNext={handleNext}
        onClose={close}
        isLast={isLast}
      />
    </Paper>
  );

  return (
    <Portal>
      {/* Backdrop */}
      <Box
        onClick={close}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: alpha(theme.palette.background.default, 0.6),
          zIndex: 1399,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Target highlight ring */}
      {target && (
        <Box
          sx={{
            position: 'fixed',
            left: target.getBoundingClientRect().left - 6,
            top: target.getBoundingClientRect().top - 6,
            width: target.getBoundingClientRect().width + 12,
            height: target.getBoundingClientRect().height + 12,
            borderRadius: 2,
            border: `2px solid ${theme.palette.primary.main}`,
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.25)}, 0 0 0 9999px ${alpha(
              theme.palette.background.default,
              0.45,
            )}`,
            zIndex: 1400,
            pointerEvents: 'none',
            animation: 'pulse-ring 2s infinite',
            '@keyframes pulse-ring': {
              '0%': { boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.25)}, 0 0 0 9999px ${alpha(
                theme.palette.background.default,
                0.45,
              )}` },
              '50%': { boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.15)}, 0 0 0 9999px ${alpha(
                theme.palette.background.default,
                0.45,
              )}` },
              '100%': { boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.25)}, 0 0 0 9999px ${alpha(
                theme.palette.background.default,
                0.45,
              )}` },
            },
          }}
        />
      )}

      {popover}
    </Portal>
  );
};

interface TourCardProps {
  step: (typeof TOUR_STEPS)[number];
  stepIndex: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  isLast: boolean;
}

const TourCard = ({ step, stepIndex, total, onBack, onNext, onClose, isLast }: TourCardProps): JSX.Element => (
  <Stack spacing={2}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {step.title}
      </Typography>
      <IconButton size="small" aria-label="Close tour" onClick={onClose} sx={{ mt: -0.5, mr: -0.5 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Stack>
    <Typography variant="body2" color="text.secondary">
      {step.body}
    </Typography>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {stepIndex + 1} / {total}
      </Typography>
      <Stack direction="row" spacing={1}>
        {stepIndex > 0 && (
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>
            Back
          </Button>
        )}
        <Button size="small" variant="contained" endIcon={<ArrowForwardIcon />} onClick={onNext}>
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </Stack>
    </Stack>
  </Stack>
);

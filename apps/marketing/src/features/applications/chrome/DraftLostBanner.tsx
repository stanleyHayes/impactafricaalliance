import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';

export interface DraftLostBannerProps {
  /** Files were added, and a new application needs them adding again. */
  hasFiles: boolean;
  onContinue: () => Promise<void>;
}

/**
 * Shown when the API stops recognising this application's draft. That
 * happens when it was already sent (from another device, or by an earlier try
 * whose answer never came back) or when the draft expired, and the API does
 * not say which. So the page says what it knows, keeps the answers on screen,
 * and lets the person decide whether to carry on as a new application.
 */
export const DraftLostBanner = ({ hasFiles, onContinue }: DraftLostBannerProps): JSX.Element => {
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const titleId = useId();

  const carryOn = (): void => {
    setWorking(true);
    setProblem(null);
    onContinue().then(
      () => setWorking(false),
      (error: unknown) => {
        setWorking(false);
        setProblem(error instanceof Error ? error.message : 'That did not work. Try again.');
      },
    );
  };

  return (
    <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, md: 3 } }}>
      <Alert
        severity="warning"
        aria-labelledby={titleId}
        sx={{ borderRadius: 3, alignItems: 'flex-start' }}
      >
        <AlertTitle id={titleId} sx={{ fontWeight: 700 }}>
          We can no longer save this application
        </AlertTitle>
        <Typography sx={{ lineHeight: 1.6 }}>
          It may already have been sent, from another device or by an earlier try, or it may have
          expired. If you have sent it, there is nothing more to do. Your answers are still on this
          page.
          {hasFiles && ' If you carry on, you will need to add your files again.'}
        </Typography>
        {problem && (
          <Typography role="status" sx={{ mt: 1, fontWeight: 600, lineHeight: 1.6 }}>
            {problem}
          </Typography>
        )}
        <Box sx={{ mt: 1.5 }}>
          <Button variant="outlined" color="inherit" onClick={carryOn} disabled={working}>
            {working ? 'Starting a new application…' : 'Continue as a new application'}
          </Button>
        </Box>
      </Alert>
    </Container>
  );
};

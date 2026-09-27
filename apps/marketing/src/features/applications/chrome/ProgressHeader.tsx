import { ORG } from '@iaa/shared';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Logo } from '../../../components/Logo';
import type { AutosaveStatus } from '../use-autosave';

import { AutosaveStatusLine } from './AutosaveStatusLine';

export interface ProgressHeaderProps {
  /** "Step 2 of 6" or "Review", or null on screens without progress. */
  progressLabel: string | null;
  /** 0–100. */
  progress: number;
  autosave: AutosaveStatus | null;
  onSaveForLater?: () => void;
}

/**
 * The only chrome around the form: the logo home, "Save and finish later"
 * where drafts are allowed, and where the applicant is (step, bar and save
 * state). Nothing else competes with the questions.
 *
 * The logo is a plain link, not a router link, on purpose: leaving the flow
 * then goes through the browser, which asks before discarding unsaved
 * answers (see the flow's `beforeunload` guard). A router link would skip
 * that question.
 */
export const ProgressHeader = ({
  progressLabel,
  progress,
  autosave,
  onSaveForLater,
}: ProgressHeaderProps): JSX.Element => {
  const theme = useTheme();
  return (
    <Box component="header" sx={{ bgcolor: 'background.default' }}>
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 2, sm: 3 },
          py: { xs: 1.25, md: 2 },
        }}
      >
        <Link
          href="/"
          aria-label={`${ORG.name} home`}
          sx={{
            display: 'inline-flex',
            borderRadius: 1,
            '&:focus-visible': {
              outline: '3px solid',
              outlineColor: 'primary.main',
              outlineOffset: 3,
            },
            '& img': { height: { xs: 34, md: 42 } },
          }}
        >
          <Logo variant={theme.palette.mode === 'dark' ? 'white' : 'primary'} height={42} />
        </Link>
        {onSaveForLater && (
          <Button
            variant="text"
            onClick={onSaveForLater}
            startIcon={<BookmarkBorderRoundedIcon />}
            sx={{ color: 'text.primary', px: { xs: 1.25, sm: 2 }, textAlign: 'left' }}
          >
            Save and finish later
          </Button>
        )}
      </Container>
      {progressLabel !== null && (
        <>
          <Container
            maxWidth="lg"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              columnGap: 2,
              rowGap: 0.5,
              px: { xs: 2, sm: 3 },
              pb: 1.25,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>{progressLabel}</Typography>
            {autosave && <AutosaveStatusLine status={autosave} />}
          </Container>
          <LinearProgress
            variant="determinate"
            value={progress}
            aria-label="Progress through the application"
            sx={{
              height: 4,
              '@media (prefers-reduced-motion: reduce)': {
                '& .MuiLinearProgress-bar': { transition: 'none' },
              },
            }}
          />
        </>
      )}
    </Box>
  );
};

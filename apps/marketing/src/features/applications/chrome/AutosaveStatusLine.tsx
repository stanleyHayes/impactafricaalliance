import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import CloudSyncRoundedIcon from '@mui/icons-material/CloudSyncRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { VISUALLY_HIDDEN } from '../styles';
import type { AutosaveStatus } from '../use-autosave';

// The API sleeps on a free plan. A save still waiting after this many tries
// is almost certainly a cold start, so the words change to say so.
const WAKING_AFTER_ATTEMPTS = 2;

const WAKING = 'Waking the server. Your answers are safe on this device.';

/**
 * "3:10 PM", the 12-hour clock the rest of the site reads (see
 * `formatEventTime`). Unlike a deadline it carries no zone: it reports a
 * moment ago, so the applicant's own clock is the right one.
 */
const savedTime = (at: Date): string =>
  at
    .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());

interface StatusView {
  icon: ReactNode;
  text: string;
  /** Said aloud: only problems and the recovery from one, never every save. */
  spoken: boolean;
  tone: 'quiet' | 'warning';
}

const VIEWS: {
  [Kind in AutosaveStatus['kind']]: (
    status: Extract<AutosaveStatus, { kind: Kind }>,
  ) => StatusView | null;
} = {
  idle: () => null,
  saving: ({ slow }) => ({
    icon: <CloudSyncRoundedIcon fontSize="small" />,
    text: slow ? WAKING : 'Saving…',
    spoken: false,
    tone: 'quiet',
  }),
  saved: ({ at }) => ({
    icon: <CloudDoneRoundedIcon fontSize="small" />,
    text: `Saved at ${savedTime(at)}`,
    spoken: false,
    tone: 'quiet',
  }),
  retrying: ({ attempt }) => ({
    icon: <CloudSyncRoundedIcon fontSize="small" />,
    text: attempt >= WAKING_AFTER_ATTEMPTS ? WAKING : 'Could not save, trying again…',
    spoken: true,
    tone: 'warning',
  }),
  offline: () => ({
    icon: <CloudOffRoundedIcon fontSize="small" />,
    text: 'You are offline. Your answers will save when you reconnect.',
    spoken: true,
    tone: 'warning',
  }),
  failed: () => ({
    icon: <ErrorOutlineRoundedIcon fontSize="small" />,
    text: 'Your latest change could not be saved. Check your answers, then carry on.',
    spoken: true,
    tone: 'warning',
  }),
};

export const autosaveView = (status: AutosaveStatus): StatusView | null =>
  (VIEWS[status.kind] as (status: AutosaveStatus) => StatusView | null)(status);

/**
 * Where autosave stands, in a few words. Shown quietly all the time; spoken
 * only when saving runs into trouble and when it recovers, so a screen reader
 * is not interrupted every time a letter is typed.
 */
export const AutosaveStatusLine = ({ status }: { status: AutosaveStatus }): JSX.Element | null => {
  const view = autosaveView(status);
  const [spoken, setSpoken] = useState('');
  const troubled = useRef(false);

  useEffect(() => {
    if (view?.spoken) {
      troubled.current = true;
      setSpoken(view.text);
    } else if (status.kind === 'saved' && troubled.current) {
      troubled.current = false;
      setSpoken('Saved. Your answers are up to date.');
    }
  }, [status, view?.spoken, view?.text]);

  return (
    <>
      <Box role="status" sx={VISUALLY_HIDDEN}>
        {spoken}
      </Box>
      {view && (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          data-autosave={status.kind}
          sx={{ minWidth: 0 }}
        >
          <Box
            aria-hidden="true"
            sx={{
              display: 'flex',
              color: view.tone === 'warning' ? 'warning.main' : 'text.secondary',
            }}
          >
            {view.icon}
          </Box>
          {/* Warnings keep full-contrast text; the colour is on the icon only. */}
          <Typography
            variant="body2"
            sx={{
              color: view.tone === 'warning' ? 'text.primary' : 'text.secondary',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {view.text}
          </Typography>
        </Stack>
      )}
    </>
  );
};

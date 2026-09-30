import type { ApplicationStatusChange } from '@iaa/shared';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { formatInstant } from '../../lib/forms';
import { timelineSx } from '../../theme/surfaces';
import { DetailSection } from '../detail/DetailSection';

import { applicationStatusLabel } from './ApplicationChips';

const who = (change: ApplicationStatusChange): string => {
  if (change.from === 'draft') return 'The applicant';
  return change.by?.name ?? 'A former colleague';
};

const what = (change: ApplicationStatusChange): string =>
  change.from === 'draft'
    ? 'submitted the application'
    : `moved it from ${applicationStatusLabel(change.from)} to ${applicationStatusLabel(change.to)}`;

/** Every status the application has had, newest first, with who and why. */
export const StatusHistory = ({
  history,
}: {
  history: readonly ApplicationStatusChange[];
}): JSX.Element => (
  <DetailSection title="History" icon={<HistoryRoundedIcon />}>
    <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }} aria-label="Status history">
      {[...history].reverse().map((change, index) => (
        <Box
          component="li"
          key={`${change.at}-${index}`}
          sx={{
            position: 'relative',
            pl: 3,
            pb: 2,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 6,
              top: 6,
              width: 9,
              height: 9,
              borderRadius: '50%',
              // The newest dot in the accent, older ones muted: Classic's
              // primary and `action.disabled`, the skin's dots elsewhere.
              ...(index === 0 ? timelineSx.dotActive : timelineSx.dot),
            },
            // The rail from one dot to the next, centred under the 9px dot
            // (6 + 4.5). A pixel string, because `sx` reads a bare 1 as 100%:
            // the rail then covered each entry's time and note.
            '&:not(:last-of-type)::after': {
              content: '""',
              position: 'absolute',
              left: 10,
              top: 18,
              bottom: 0,
              width: '1px',
              ...timelineSx.rail,
            },
          }}
        >
          <Typography variant="body2">
            <strong>{who(change)}</strong> {what(change)}.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <time dateTime={change.at}>{formatInstant(change.at)}</time>
          </Typography>
          {change.note && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              “{change.note}”
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  </DetailSection>
);

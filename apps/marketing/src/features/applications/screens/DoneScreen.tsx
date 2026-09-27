import type { SubmissionReceipt } from '@iaa/shared';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { formatInstant } from '../answers';

import { ScreenColumn, ScreenHeading, useFocusOnMount } from './ScreenParts';

export interface DoneScreenProps {
  receipt: SubmissionReceipt;
  /** The form's own thank-you, used when the receipt carries none. */
  successMessage?: string;
  preview: boolean;
}

const DEFAULT_SUCCESS = 'Thank you. We have your application and the team will read it carefully.';

/**
 * The confirmation: the reference to keep, the form's thank-you, and what
 * happens next. The draft is gone by now, so leaving is safe.
 */
export const DoneScreen = ({ receipt, successMessage, preview }: DoneScreenProps): JSX.Element => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>(true);
  const message = receipt.successMessage ?? successMessage ?? DEFAULT_SUCCESS;

  return (
    <ScreenColumn>
      <Stack spacing={3} alignItems="flex-start">
        <Box
          aria-hidden="true"
          sx={(theme) => ({
            display: 'grid',
            placeItems: 'center',
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.16),
            color: 'primary.dark',
          })}
        >
          <CheckRoundedIcon sx={{ fontSize: 40 }} />
        </Box>
        <ScreenHeading ref={headingRef}>Application sent</ScreenHeading>
        {preview ? (
          <Alert severity="info" sx={{ borderRadius: 3, alignSelf: 'stretch' }}>
            This is a preview, so nothing was sent. Applicants see their reference number here.
          </Alert>
        ) : (
          <Box
            sx={{
              alignSelf: 'stretch',
              p: { xs: 2, sm: 3 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 4,
              bgcolor: 'background.paper',
            }}
          >
            <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Your reference
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                fontWeight: 700,
                letterSpacing: '0.06em',
                fontVariantNumeric: 'tabular-nums',
                overflowWrap: 'anywhere',
              }}
            >
              {receipt.reference}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              Sent on {formatInstant(receipt.submittedAt)}
            </Typography>
          </Box>
        )}
        <Typography
          sx={{
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </Typography>
        <Box component="section" aria-labelledby="done-next">
          <Typography id="done-next" component="h2" sx={{ fontSize: '1.25rem', fontWeight: 700 }}>
            What happens next
          </Typography>
          <Box
            component="ul"
            sx={{ m: 0, mt: 1, pl: 2.5, lineHeight: 1.7, '& li + li': { mt: 0.75 } }}
          >
            <li>
              Keep your reference. Quote it if you get in touch with us about this application.
            </li>
            <li>
              The team reads every application and will contact you using the details you gave.
            </li>
          </Box>
        </Box>
        <Button component={RouterLink} to="/" variant="contained" size="large">
          Back to the homepage
        </Button>
      </Stack>
    </ScreenColumn>
  );
};

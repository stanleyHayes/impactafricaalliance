import type { PublicForm } from '@iaa/shared';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { formatInstant } from '../answers';

import { ScreenColumn, ScreenHeading, useFocusOnMount } from './ScreenParts';

/** Why the form is not shown. */
export type StatusKind =
  | 'not-found'
  | 'not-yet-open'
  | 'closed'
  | 'limit-reached'
  | 'error'
  | 'preview-expired'
  | 'preview-missing';

interface StatusCopy {
  icon: ReactNode;
  title: string;
  body: (form: PublicForm | undefined) => string;
  retry?: boolean;
}

const opening = (form: PublicForm | undefined): string =>
  form?.settings.opensAt
    ? `Applications open on ${formatInstant(form.settings.opensAt)}. Come back then and you can apply here.`
    : 'Applications have not opened yet. Come back soon and you can apply here.';

/** Plain words for each state, in one place. */
export const STATUS_COPY: Record<StatusKind, StatusCopy> = {
  'not-found': {
    icon: <SearchOffRoundedIcon />,
    title: 'We cannot find this form',
    body: () =>
      'The link may be mistyped, or the form may have been taken down. Check the link you were sent, or head back to our homepage.',
  },
  'not-yet-open': {
    icon: <HourglassEmptyRoundedIcon />,
    title: 'This form is not open yet',
    body: opening,
  },
  closed: {
    icon: <EventBusyRoundedIcon />,
    title: 'Applications have closed',
    body: () =>
      'This form is no longer taking applications. Thank you for your interest. Keep an eye on our site for the next opportunity.',
  },
  'limit-reached': {
    icon: <TaskAltRoundedIcon />,
    title: 'This form has all the applications it can take',
    body: () =>
      'We have reached the number of applications we can consider this time, so the form is no longer taking new ones. Thank you for your interest.',
  },
  error: {
    icon: <CloudOffRoundedIcon />,
    title: 'We could not load this form',
    body: () =>
      'Our server may be waking up, which can take up to a minute. Try again in a moment. Anything you have already saved is safe.',
    retry: true,
  },
  'preview-expired': {
    icon: <LinkOffRoundedIcon />,
    title: 'This preview link has expired',
    body: () =>
      'Preview links work for two hours. Open the form in the admin console and choose Preview again for a fresh link.',
  },
  'preview-missing': {
    icon: <LinkOffRoundedIcon />,
    title: 'This preview link is incomplete',
    body: () =>
      'Open the form in the admin console and choose Preview to get a working link. Copy the whole link, including everything after the # sign.',
  },
};

export interface StatusScreenProps {
  kind: StatusKind;
  form?: PublicForm;
  autoFocus?: boolean;
  onRetry?: () => void;
}

/** A calm full screen for everything that is not the form: a heading, what to do, and a way home. */
export const StatusScreen = ({
  kind,
  form,
  autoFocus = true,
  onRetry,
}: StatusScreenProps): JSX.Element => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>(autoFocus);
  const copy = STATUS_COPY[kind];
  return (
    <ScreenColumn>
      <Stack spacing={3} alignItems="flex-start" sx={{ py: { xs: 2, md: 6 } }}>
        <Box
          aria-hidden="true"
          sx={(theme) => ({
            display: 'grid',
            placeItems: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.text.primary, 0.06),
            color: 'text.secondary',
            '& svg': { fontSize: 32 },
          })}
        >
          {copy.icon}
        </Box>
        {form && (
          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{form.title}</Typography>
        )}
        <ScreenHeading ref={headingRef}>{copy.title}</ScreenHeading>
        <Typography sx={{ fontSize: { xs: '1.0625rem', md: '1.1875rem' }, lineHeight: 1.7 }}>
          {copy.body(form)}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
          {copy.retry && onRetry && (
            <Button variant="contained" size="large" onClick={onRetry}>
              Try again
            </Button>
          )}
          <Button
            component={RouterLink}
            to="/"
            variant={copy.retry && onRetry ? 'outlined' : 'contained'}
            size="large"
          >
            Back to the homepage
          </Button>
        </Stack>
      </Stack>
    </ScreenColumn>
  );
};

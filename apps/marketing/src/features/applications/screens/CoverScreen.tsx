import { DRAFT_RETENTION_DAYS, type PublicForm } from '@iaa/shared';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { responsiveSizes } from '../../../lib/cloudinary-image';
import { formatInstant } from '../answers';
import { EYEBROW_SX, QUIET_BUTTON_SX } from '../styles';
import { useDelayedFlag } from '../use-delayed-flag';

import {
  FormImage,
  PrimaryButton,
  ScreenColumn,
  ScreenHeading,
  useFocusOnMount,
} from './ScreenParts';

export interface CoverScreenProps {
  form: PublicForm;
  stepCount: number;
  hasDraft: boolean;
  drafts: boolean;
  beginning: boolean;
  notice: string | null;
  autoFocus: boolean;
  onBegin: () => void;
  onStartOver: () => void;
}

const COVER_IMAGE_SIZES = responsiveSizes({ xs: '100vw', md: '42vw' });

const Fact = ({ icon, children }: { icon: ReactNode; children: ReactNode }): JSX.Element => (
  <Stack component="li" direction="row" spacing={1.25} alignItems="flex-start">
    <Box aria-hidden="true" sx={{ color: 'primary.dark', display: 'flex', mt: '2px' }}>
      {icon}
    </Box>
    <Typography sx={{ lineHeight: 1.6 }}>{children}</Typography>
  </Stack>
);

/**
 * "Start again" for someone who finds another person's application in
 * progress on a shared device. Asks once, since it sets saved answers aside.
 */
const StartOver = ({ onStartOver }: { onStartOver: () => void }): JSX.Element => {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="text" onClick={() => setConfirming(true)} sx={{ color: 'text.secondary' }}>
        Start a new application instead
      </Button>
    );
  }
  return (
    <Box role="group" aria-label="Start a new application" sx={{ maxWidth: 480 }}>
      <Typography sx={{ lineHeight: 1.6 }}>
        The answers saved on this device will be set aside and you will start with a blank form.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
        <Button variant="outlined" onClick={onStartOver}>
          Start a new application
        </Button>
        <Button variant="text" onClick={() => setConfirming(false)} sx={QUIET_BUTTON_SX}>
          Keep my answers
        </Button>
      </Stack>
    </Box>
  );
};

/**
 * The cover slide: the form's own introduction, when it closes, how long it
 * is, and one clear way in. When a draft was found on this device the way in
 * picks up where the person left off.
 */
export const CoverScreen = ({
  form,
  stepCount,
  hasDraft,
  drafts,
  beginning,
  notice,
  autoFocus,
  onBegin,
  onStartOver,
}: CoverScreenProps): JSX.Element => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>(autoFocus);
  const slow = useDelayedFlag(beginning);
  const { intro, settings } = form;
  const image = intro.image ?? null;

  const text = (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Typography sx={EYEBROW_SX}>
        {intro.heading === form.title ? 'Application' : form.title}
      </Typography>
      <ScreenHeading ref={headingRef}>{intro.heading}</ScreenHeading>
      {intro.description && (
        <Typography
          sx={{
            color: 'text.secondary',
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
          }}
        >
          {intro.description}
        </Typography>
      )}
      <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {settings.closesAt && (
          <Fact icon={<EventRoundedIcon fontSize="small" />}>
            Applications close on {formatInstant(settings.closesAt)}.
          </Fact>
        )}
        <Fact icon={<FormatListNumberedRoundedIcon fontSize="small" />}>
          {stepCount === 1 ? 'One short step' : `${stepCount} short steps`}, then a chance to check
          your answers before you send them.
        </Fact>
        {drafts ? (
          <Fact icon={<SaveRoundedIcon fontSize="small" />}>
            Your answers save as you go on this device, and are kept for {DRAFT_RETENTION_DAYS} days
            after your last change.
          </Fact>
        ) : (
          // Nothing is kept until the end, so leaving part-way loses the
          // answers; better to know that before starting.
          <Fact icon={<ScheduleRoundedIcon fontSize="small" />}>
            Nothing is saved until you send your answers, so allow time to finish in one go.
          </Fact>
        )}
      </Stack>
      {hasDraft && (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          You have an application in progress. Carry on from where you stopped.
        </Alert>
      )}
      {notice && (
        // Warning rather than error: nothing here is the person's fault, and
        // the words say what to do next.
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          {notice}
        </Alert>
      )}
      <Box>
        <PrimaryButton onClick={onBegin} disabled={beginning}>
          {hasDraft ? 'Continue where you left off' : 'Begin'}
        </PrimaryButton>
      </Box>
      {beginning && (
        <Typography role="status" sx={{ color: 'text.secondary' }}>
          {slow
            ? 'Waking the server. This can take up to a minute the first time; please keep this page open.'
            : 'Getting your application ready…'}
        </Typography>
      )}
      {hasDraft && <StartOver onStartOver={onStartOver} />}
    </Stack>
  );

  if (!image) {
    return <ScreenColumn>{text}</ScreenColumn>;
  }

  return (
    <ScreenColumn wide>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 4, md: 8 },
          alignItems: 'center',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
        }}
      >
        <Box sx={{ order: { xs: 2, md: 1 } }}>{text}</Box>
        <Box sx={{ order: { xs: 1, md: 2 } }}>
          <FormImage
            image={image}
            aspectRatio={{ xs: '16 / 10', md: '4 / 5' }}
            sizes={COVER_IMAGE_SIZES}
            eager
          />
        </Box>
      </Box>
    </ScreenColumn>
  );
};

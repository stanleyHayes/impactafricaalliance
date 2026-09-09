import { CONTENT_STATUSES, EVENT_TYPES } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import TitleIcon from '@mui/icons-material/Title';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ComponentProps } from 'react';

import type { EventFormState } from '../../lib/event-form';
import { EventDateTimeField } from '../fields/EventDateTimeField';
import { MediaUploadField } from '../fields/MediaUploadField';
import { QuestionBuilder } from '../fields/QuestionBuilder';

import { EventImage } from './EventImage';

const fieldLabel = (Icon: SvgIconComponent, text: string): JSX.Element => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
    <Icon sx={{ fontSize: 17 }} />
    {text}
  </Box>
);

const TYPE_LABELS: Record<string, string> = {
  webinar: 'Webinar',
  'cohort-launch': 'Cohort launch',
  'partner-forum': 'Partner forum',
  'community-event': 'Community event',
  other: 'Other',
};

type DateField = 'startAt' | 'endAt' | 'registrationClosesAt';
interface StepProps {
  form: EventFormState;
  setField: <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => void;
}
interface ScheduleProps extends StepProps {
  timezone: string;
  dateProps: (field: DateField) => Omit<ComponentProps<typeof EventDateTimeField>, 'label'>;
}

export const EventDetailsFields = ({
  form,
  setField,
  setUploading,
}: StepProps & { setUploading: (value: boolean) => void }): JSX.Element => (
  <>
    <TextField
      label={fieldLabel(TitleIcon, 'Title')}
      required
      value={form.title}
      onChange={(e) => setField('title', e.target.value)}
    />
    <TextField
      select
      label={fieldLabel(LocalOfferOutlinedIcon, 'Type')}
      value={form.type}
      onChange={(e) => setField('type', e.target.value as EventFormState['type'])}
    >
      {EVENT_TYPES.map((type) => (
        <MenuItem key={type} value={type}>
          {TYPE_LABELS[type]}
        </MenuItem>
      ))}
    </TextField>
    <TextField
      label={fieldLabel(DescriptionOutlinedIcon, 'Description')}
      required
      multiline
      minRows={5}
      value={form.description}
      onChange={(e) => setField('description', e.target.value)}
    />
    <MediaUploadField
      label="Event artwork"
      accept="image/jpeg,image/png,image/gif,image/webp"
      preview
      value={form.image}
      onChange={(image) => setField('image', image)}
      maxSizeMB={5}
      folder="events"
      onUploadingChange={setUploading}
    />
    <Typography variant="caption" color="text.secondary">
      Shown on the website. Alliance artwork is used when no image is uploaded.
    </Typography>
  </>
);

export const EventScheduleFields = ({
  form,
  setField,
  timezone,
  dateProps,
}: ScheduleProps): JSX.Element => (
  <>
    <Typography variant="body2" color="text.secondary">
      All dates and times use {timezone}. Choose a date and use the clock to set the time.
    </Typography>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 3,
      }}
    >
      <EventDateTimeField label="Start" required {...dateProps('startAt')} />
      <EventDateTimeField
        label="End (optional)"
        {...dateProps('endAt')}
        minDateTime={form.startAt?.isValid() ? form.startAt : undefined}
        helperText="Leave blank for an open-ended event."
      />
    </Box>
    <TextField
      label={fieldLabel(LocationOnOutlinedIcon, 'Venue / location')}
      required
      value={form.location}
      onChange={(e) => setField('location', e.target.value)}
    />
    <TextField
      label={fieldLabel(PersonOutlinedIcon, 'Host / speaker (optional)')}
      value={form.host}
      onChange={(e) => setField('host', e.target.value)}
    />
    <TextField
      label={fieldLabel(PersonOutlinedIcon, 'Host title (optional)')}
      value={form.hostTitle}
      onChange={(e) => setField('hostTitle', e.target.value)}
    />
  </>
);

export const EventRegistrationFields = ({
  form,
  setField,
  timezone,
  dateProps,
}: ScheduleProps): JSX.Element => (
  <>
    <FormControlLabel
      control={
        <Switch
          checked={form.registrationEnabled}
          onChange={(_e, checked) => setField('registrationEnabled', checked)}
        />
      }
      label="Allow people to register on the website"
    />
    <TextField
      label={fieldLabel(LocalOfferOutlinedIcon, 'Admission (optional)')}
      placeholder="FREE"
      value={form.admission}
      onChange={(e) => setField('admission', e.target.value)}
    />
    <TextField
      label={fieldLabel(PersonOutlinedIcon, 'Capacity (optional)')}
      type="number"
      value={form.capacity}
      onChange={(e) => setField('capacity', e.target.value)}
      helperText="Leave blank for unlimited places."
    />
    <EventDateTimeField
      label="Registration closes (optional)"
      {...dateProps('registrationClosesAt')}
      maxDateTime={form.startAt?.isValid() ? form.startAt : undefined}
      helperText={`Defaults to the event start time. Times use ${timezone}.`}
    />
    <TextField
      label={fieldLabel(VideocamOutlinedIcon, 'Meeting link (optional)')}
      placeholder="https://meet.google.com/abc-defg-hij"
      value={form.meetingUrl}
      onChange={(e) => setField('meetingUrl', e.target.value)}
      helperText="For online sessions. Never shown on the public event page — only someone who has completed registration sees it."
    />
    <TextField
      label={fieldLabel(NotificationsOutlinedIcon, 'Remind registrants (hours before)')}
      type="number"
      value={form.reminderHoursBefore}
      onChange={(e) => setField('reminderHoursBefore', e.target.value)}
      helperText="Leave blank for no reminder. 24 sends it the day before, with the joining link."
    />
    <TextField
      label={fieldLabel(FavoriteBorderOutlinedIcon, 'Thank registrants (minutes after)')}
      type="number"
      value={form.thankYouMinutesAfter}
      onChange={(e) => setField('thankYouMinutesAfter', e.target.value)}
      helperText="Leave blank for no thank-you. Counted from the end time, or the start if none is set."
    />
    <QuestionBuilder
      label="Extra questions for this event"
      helperText="These questions and capacity settings apply when website registration is enabled."
      value={form.questions}
      onChange={(questions) => setField('questions', questions)}
    />
  </>
);

export const EventReviewFields = ({
  form,
  setField,
  timezone,
}: StepProps & { timezone: string }): JSX.Element => (
  <>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '240px 1fr' },
        gap: 3,
      }}
    >
      <EventImage src={form.image?.url} sx={{ width: '100%', height: 260, borderRadius: 2 }} />
      <Box>
        <Typography variant="overline" color="text.secondary">
          {TYPE_LABELS[form.type]}
        </Typography>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {form.title}
        </Typography>
        <Stack spacing={1.5}>
          <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon fontSize="small" />
            {form.startAt?.format('DD MMM YYYY, HH:mm')}{' '}
            {form.endAt && `— ${form.endAt.format('DD MMM YYYY, HH:mm')}`} · {timezone}
          </Typography>
          <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnOutlinedIcon fontSize="small" />
            {form.location}
          </Typography>
          {form.host && (
            <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonOutlinedIcon fontSize="small" />
              {form.host}
              {form.hostTitle && ` · ${form.hostTitle}`}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Registration {form.registrationEnabled ? 'enabled' : 'disabled'} ·{' '}
            {form.admission || 'Free'} · {form.capacity || 'Unlimited'} places
          </Typography>
          {form.registrationClosesAt && (
            <Typography variant="body2" color="text.secondary">
              Registration closes {form.registrationClosesAt.format('DD MMM YYYY, HH:mm')}
            </Typography>
          )}
          {form.meetingUrl && (
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              Joining link shared after registration · {form.meetingUrl}
            </Typography>
          )}
          {form.questions.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {form.questions.length} additional registration question
              {form.questions.length === 1 ? '' : 's'}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
    <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {form.description}
    </Typography>
    <TextField
      select
      label="Publication status"
      value={form.status}
      onChange={(e) => setField('status', e.target.value as EventFormState['status'])}
      helperText="Published events appear on the public website. Drafts are visible only to the team."
    >
      {CONTENT_STATUSES.map((status) => (
        <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
          {status}
        </MenuItem>
      ))}
    </TextField>
  </>
);

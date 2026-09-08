import type { Event } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DateTimeValidationError } from '@mui/x-date-pickers/models';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  EventDetailsFields,
  EventScheduleFields,
  EventRegistrationFields,
  EventReviewFields,
} from '../components/events/EventFormSteps';
import { FormStepNavigation } from '../components/forms/FormStepNavigation';
import { PageHeader } from '../components/PageHeader';
import { FormPageSkeleton } from '../components/PageSkeleton';
import { useSaveEvent } from '../lib/admin-hooks';
import { api } from '../lib/api-client';
import {
  EVENT_FORM_STEPS,
  emptyEventForm,
  eventToForm,
  eventPatch,
  eventStepError,
  parseEventForm,
  scheduleErrors,
  type EventFormState,
} from '../lib/event-form';

type DateField = 'startAt' | 'endAt' | 'registrationClosesAt';

const submitLabel = (saving: boolean, step: number, editing: boolean): string => {
  if (saving) return 'Saving…';
  if (step < 3) return 'Continue';
  return editing ? 'Update event' : 'Create event';
};

const EventEditorForm = ({
  event,
  initialDate,
}: {
  event?: Event;
  initialDate: string | null;
}): JSX.Element => {
  const navigate = useNavigate();
  const save = useSaveEvent();
  const [form, setForm] = useState<EventFormState>(() =>
    event ? eventToForm(event) : emptyEventForm(initialDate),
  );
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pickerErrors, setPickerErrors] = useState<
    Partial<Record<DateField, DateTimeValidationError>>
  >({});
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = uploading || save.isPending;
  const dates = scheduleErrors(form);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const setField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]): void => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError('');
  };
  const pickerError = (field: DateField, reason: DateTimeValidationError): void => {
    setPickerErrors((previous) =>
      previous[field] === reason ? previous : { ...previous, [field]: reason },
    );
  };
  const validate = (index: number): string | undefined => {
    const schemaError = eventStepError(form, index);
    if (schemaError) return schemaError;
    const fields: DateField[] = [];
    if (index === 1) fields.push('startAt', 'endAt');
    if (index === 2) fields.push('registrationClosesAt');
    return fields.some((field) => pickerErrors[field])
      ? 'Correct the highlighted date and time before continuing.'
      : undefined;
  };
  const changeStep = (next: number): void => {
    if (busy) return;
    if (next > step) {
      const issue = validate(step);
      if (issue) {
        setError(issue);
        return;
      }
    }
    setError('');
    setStep(next);
    setMaxStep((previous) => Math.max(previous, next));
  };
  const submit = (submission: FormEvent): void => {
    submission.preventDefault();
    if (busy) return;
    if (step < EVENT_FORM_STEPS.length - 1) {
      changeStep(step + 1);
      return;
    }
    for (let index = 0; index < EVENT_FORM_STEPS.length; index += 1) {
      const issue = validate(index);
      if (issue) {
        setStep(index);
        setError(issue);
        return;
      }
    }
    const parsed = parseEventForm(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Review the event details.');
      return;
    }
    save.mutate(
      { id: event?.id, body: eventPatch(parsed.data, event) },
      { onSuccess: () => navigate('/events') },
    );
  };
  const dateProps = (field: DateField) => ({
    value: form[field],
    onChange: (value: EventFormState[DateField]) => setField(field, value),
    onError: (reason: DateTimeValidationError) => pickerError(field, reason),
    error: dates[field] || (pickerErrors[field] ? 'Enter a valid date and time.' : undefined),
    disabled: busy,
  });

  return (
    <>
      <PageHeader
        icon={<CalendarTodayIcon />}
        title={event ? 'Edit event' : 'Create event'}
        description="Build the event one step at a time, then review before saving."
        action={
          <Button
            component={RouterLink}
            to="/events"
            startIcon={<ArrowBackRoundedIcon />}
            disabled={busy}
          >
            All events
          </Button>
        }
      />
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <FormStepNavigation
          steps={EVENT_FORM_STEPS}
          activeStep={step}
          maxStep={maxStep}
          onStepChange={changeStep}
          disabled={busy}
        />
        <Box
          component="form"
          noValidate
          onSubmit={submit}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography
              ref={heading}
              tabIndex={-1}
              component="h2"
              variant="h5"
              sx={{ mb: 3, outline: 'none' }}
            >
              {EVENT_FORM_STEPS[step]}
            </Typography>
            <Stack spacing={3}>
              {step === 0 && (
                <EventDetailsFields form={form} setField={setField} setUploading={setUploading} />
              )}
              {step === 1 && (
                <EventScheduleFields
                  form={form}
                  setField={setField}
                  timezone={timezone}
                  dateProps={dateProps}
                />
              )}
              {step === 2 && (
                <EventRegistrationFields
                  form={form}
                  setField={setField}
                  timezone={timezone}
                  dateProps={dateProps}
                />
              )}
              {step === 3 && (
                <EventReviewFields form={form} setField={setField} timezone={timezone} />
              )}
              {error && <Alert severity="error">{error}</Alert>}
              {save.isError && (
                <Alert severity="error">
                  {save.error.message || 'Could not save the event. Please try again.'}
                </Alert>
              )}
            </Stack>
          </Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={2}
            sx={{
              p: { xs: 2, md: 3 },
              bgcolor: 'background.default',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Button
              onClick={() => (step > 0 ? changeStep(step - 1) : navigate('/events'))}
              disabled={busy}
            >
              {step > 0 ? 'Back' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {submitLabel(save.isPending, step, Boolean(event))}
            </Button>
          </Stack>
        </Box>
      </Box>
    </>
  );
};

const EventEditor = (): JSX.Element => {
  const { eventId } = useParams();
  const [params] = useSearchParams();
  const query = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => api.get<Event>(`/admin/events/${eventId}`),
    enabled: Boolean(eventId),
  });
  // Whether this is an edit is known from the route, not the fetch, so the
  // title is right from the first frame.
  if (eventId && query.isPending)
    return (
      <>
        <PageHeader title="Edit event" icon={<CalendarTodayIcon />} />
        <FormPageSkeleton backLink steps fields={5} />
      </>
    );
  if (eventId && (query.isError || !query.data))
    return (
      <Stack spacing={2}>
        <PageHeader title="Edit event" />
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          {query.error?.message || 'This event could not be found.'}
        </Alert>
        <Button component={RouterLink} to="/events">
          Back to events
        </Button>
      </Stack>
    );
  return (
    <EventEditorForm
      key={eventId ?? `new-${params.get('date') ?? ''}`}
      event={eventId ? query.data : undefined}
      initialDate={params.get('date')}
    />
  );
};

export default EventEditor;

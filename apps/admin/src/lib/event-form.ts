import {
  eventInputSchema,
  type ContentStatus,
  type Event,
  type EventInput,
  type EventQuestion,
  type EventType,
  type EventUpdate,
  type MediaAsset,
} from '@iaa/shared';
import dayjs, { type Dayjs } from 'dayjs';

export const EVENT_FORM_STEPS = ['Details', 'Schedule', 'Registration', 'Review'] as const;

export interface EventFormState {
  image?: MediaAsset;
  title: string;
  description: string;
  type: EventType;
  status: ContentStatus;
  startAt: Dayjs | null;
  endAt: Dayjs | null;
  location: string;
  host: string;
  hostTitle: string;
  admission: string;
  registrationEnabled: boolean;
  capacity: string;
  reminderHoursBefore: string;
  thankYouMinutesAfter: string;
  registrationClosesAt: Dayjs | null;
  meetingUrl: string;
  questions: EventQuestion[];
}

export const emptyEventForm = (date?: string | null): EventFormState => {
  const selected = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? dayjs(date) : dayjs();
  const start = selected.isValid() ? selected : dayjs();
  return {
    title: '',
    description: '',
    type: 'other',
    status: 'draft',
    startAt: start.hour(9).minute(0).second(0).millisecond(0),
    endAt: null,
    location: '',
    host: '',
    hostTitle: '',
    admission: '',
    registrationEnabled: false,
    capacity: '',
    reminderHoursBefore: '',
    thankYouMinutesAfter: '',
    registrationClosesAt: null,
    meetingUrl: '',
    questions: [],
  };
};

export const eventToForm = (event: Event): EventFormState => ({
  image: event.image,
  title: event.title,
  description: event.description,
  type: event.type,
  status: event.status,
  startAt: dayjs(event.startAt),
  endAt: event.endAt ? dayjs(event.endAt) : null,
  location: event.location,
  host: event.host ?? '',
  hostTitle: event.hostTitle ?? '',
  admission: event.admission ?? '',
  registrationEnabled: event.registrationEnabled ?? false,
  capacity: event.capacity === undefined ? '' : String(event.capacity),
  reminderHoursBefore: event.reminderHoursBefore ? String(event.reminderHoursBefore) : '',
  thankYouMinutesAfter: event.thankYouMinutesAfter ? String(event.thankYouMinutesAfter) : '',
  registrationClosesAt: event.registrationClosesAt ? dayjs(event.registrationClosesAt) : null,
  meetingUrl: event.meetingUrl ?? '',
  questions: event.questions ?? [],
});

const invalidOptionalDate = (value: Dayjs | null): boolean => value !== null && !value.isValid();

export const scheduleErrors = (
  form: EventFormState,
): Partial<Record<'startAt' | 'endAt' | 'registrationClosesAt', string>> => {
  const errors: ReturnType<typeof scheduleErrors> = {};
  if (!form.startAt?.isValid()) errors.startAt = 'Choose a valid start date and time.';
  if (invalidOptionalDate(form.endAt))
    errors.endAt = 'Enter a complete end date and time, or clear it.';
  if (invalidOptionalDate(form.registrationClosesAt))
    errors.registrationClosesAt = 'Enter a complete closing date and time, or clear it.';
  if (!errors.startAt && form.startAt) {
    if (form.endAt?.isValid() && !form.endAt.isAfter(form.startAt))
      errors.endAt = 'End must be after start.';
    if (form.registrationClosesAt?.isValid() && form.registrationClosesAt.isAfter(form.startAt))
      errors.registrationClosesAt = 'Registration must close by the start of the event.';
  }
  return errors;
};

const toIso = (date: Dayjs | null): string | undefined =>
  date?.isValid() ? date.toISOString() : undefined;

export const parseEventForm = (
  form: EventFormState,
): ReturnType<typeof eventInputSchema.safeParse> =>
  eventInputSchema.safeParse({
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    status: form.status,
    image: form.image,
    startAt: toIso(form.startAt),
    endAt: toIso(form.endAt),
    location: form.location.trim(),
    host: form.host.trim() || undefined,
    hostTitle: form.hostTitle.trim() || undefined,
    admission: form.admission.trim() || undefined,
    registrationEnabled: form.registrationEnabled,
    capacity: form.capacity.trim() ? Number(form.capacity) : undefined,
    // Blank means "do not send", which is null rather than undefined so that
    // clearing the field actually turns an existing automation off.
    reminderHoursBefore: form.reminderHoursBefore.trim() ? Number(form.reminderHoursBefore) : null,
    thankYouMinutesAfter: form.thankYouMinutesAfter.trim()
      ? Number(form.thankYouMinutesAfter)
      : null,
    registrationClosesAt: toIso(form.registrationClosesAt),
    meetingUrl: form.meetingUrl.trim() || undefined,
    questions: form.questions.filter((question) => question.label.trim().length > 0),
  });

const fieldsByStep = [
  ['title', 'description', 'type', 'image'],
  ['startAt', 'endAt', 'location', 'host', 'hostTitle'],
  [
    'registrationEnabled',
    'capacity',
    'admission',
    'registrationClosesAt',
    'meetingUrl',
    'reminderHoursBefore',
    'thankYouMinutesAfter',
    'questions',
  ],
  ['status'],
];

/** Validate only the current step, while preserving the full schema on final save. */
export const eventStepError = (form: EventFormState, step: number): string | undefined => {
  const fields = fieldsByStep[step] ?? [];
  const dateError = Object.entries(scheduleErrors(form)).find(([field]) => fields.includes(field));
  if (dateError) return dateError[1];
  const parsed = parseEventForm(form);
  if (parsed.success) return undefined;
  return parsed.error.issues.find((issue) => fields.includes(String(issue.path[0])))?.message;
};

/** Omission preserves values; null explicitly removes an existing optional value. */
export const eventPatch = (data: EventInput, event?: Event | null): EventUpdate => {
  const body: EventUpdate = { ...data };
  if (event) {
    for (const key of [
      'image',
      'endAt',
      'host',
      'hostTitle',
      'admission',
      'capacity',
      'registrationClosesAt',
      'meetingUrl',
    ] as const) {
      if (body[key] === undefined && event[key] !== undefined) Object.assign(body, { [key]: null });
    }
  }
  return body;
};

import { CONTENT_STATUSES, EVENT_TYPES, eventInputSchema } from '@iaa/shared';
import type {
  ContentStatus,
  EventType,
  Event,
  EventQuestion,
  EventUpdate,
  EventInput,
  MediaAsset,
} from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import TitleIcon from '@mui/icons-material/Title';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';

import {
  DialogFooter,
  DialogHeader,
  dialogPaperSx,
  dialogSectionSx,
} from '../components/dialogs/DialogShell';
import { EmptyState } from '../components/EmptyState';
import { CalendarGrid } from '../components/events/CalendarGrid';
import { EventDetailDialog } from '../components/events/EventDetailDialog';
import { EventImage } from '../components/events/EventImage';
import { EventQrDialog } from '../components/events/EventQrDialog';
import { MediaUploadField } from '../components/fields/MediaUploadField';
import { QuestionBuilder } from '../components/fields/QuestionBuilder';
import { PageHeader } from '../components/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { useDeleteEvent, useEvents, useSaveEvent } from '../lib/admin-hooks';

const STATUS_TONE: Record<
  ContentStatus,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  draft: 'warning',
  published: 'success',
};

const TYPE_TONE: Record<
  EventType,
  'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
> = {
  webinar: 'primary',
  'cohort-launch': 'secondary',
  'partner-forum': 'info',
  'community-event': 'success',
  other: 'default',
};

const TYPE_LABEL: Record<EventType, string> = {
  webinar: 'Webinar',
  'cohort-launch': 'Cohort Launch',
  'partner-forum': 'Partner Forum',
  'community-event': 'Community Event',
  other: 'Other',
};

const toDatetimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const localToIso = (value: string): string | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const isoToDatetimeLocal = (iso?: string): string => {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return toDatetimeLocal(parsed);
};

const formatEventRange = (startIso: string, endIso?: string): string => {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  if (!end) {
    return start.toLocaleString('en-GB', options);
  }

  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    const date = start.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const startTime = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${startTime} – ${endTime}`;
  }

  return `${start.toLocaleString('en-GB', options)} – ${end.toLocaleString('en-GB', options)}`;
};

interface EventDialogProps {
  open: boolean;
  event?: Event | null;
  initialStart?: string;
  onClose: () => void;
}

const emptyForm = (): EventFormState => ({
  title: '',
  description: '',
  startAt: toDatetimeLocal(new Date(new Date().setHours(9, 0, 0, 0))),
  endAt: '',
  location: '',
  type: 'other' as EventType,
  status: 'draft' as ContentStatus,
  host: '',
  hostTitle: '',
  admission: '',
  registrationEnabled: false,
  capacity: '',
  registrationClosesAt: '',
  questions: [] as EventQuestion[],
});

interface EventFormState {
  image?: MediaAsset;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  type: EventType;
  status: ContentStatus;
  host: string;
  hostTitle: string;
  admission: string;
  registrationEnabled: boolean;
  capacity: string;
  registrationClosesAt: string;
  questions: EventQuestion[];
}

const parseEventForm = (form: EventFormState): ReturnType<typeof eventInputSchema.safeParse> => {
  return eventInputSchema.safeParse({
    title: form.title.trim(),
    description: form.description.trim(),
    startAt: localToIso(form.startAt),
    endAt: localToIso(form.endAt) || undefined,
    image: form.image,
    location: form.location.trim(),
    type: form.type,
    status: form.status,
    host: form.host.trim() || undefined,
    hostTitle: form.hostTitle.trim() || undefined,
    admission: form.admission.trim() || undefined,
    capacity: form.capacity.trim() ? Number(form.capacity) : undefined,
    registrationClosesAt: localToIso(form.registrationClosesAt) || undefined,
    registrationEnabled: form.registrationEnabled,
    questions: form.questions.filter((question) => question.label.trim().length > 0),
  });
};

const eventPatch = (data: EventInput, event?: Event | null): EventUpdate => {
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
    ] as const) {
      if (body[key] === undefined && event[key] !== undefined) Object.assign(body, { [key]: null });
    }
  }
  return body;
};

const EventDialog = ({ open, event, initialStart, onClose }: EventDialogProps): JSX.Element => {
  const save = useSaveEvent();
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const resetSave = save.reset;
  const [form, setForm] = useState<EventFormState>(emptyForm());

  useEffect(() => {
    if (!open) return;
    resetSave();
    setValidationError('');
    if (event) {
      setForm({
        image: event.image,
        title: event.title,
        description: event.description,
        startAt: isoToDatetimeLocal(event.startAt),
        endAt: isoToDatetimeLocal(event.endAt),
        location: event.location,
        type: event.type,
        status: event.status,
        host: event.host ?? '',
        hostTitle: event.hostTitle ?? '',
        admission: event.admission ?? '',
        registrationEnabled: event.registrationEnabled ?? false,
        capacity: event.capacity ? String(event.capacity) : '',
        registrationClosesAt: isoToDatetimeLocal(event.registrationClosesAt),
        questions: event.questions ?? [],
      });
    } else {
      const defaults = emptyForm();
      if (initialStart) {
        defaults.startAt = initialStart;
      }
      setForm(defaults);
    }
  }, [open, event, initialStart, resetSave]);

  const handleChange = (field: keyof EventFormState, value: string): void => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const setField = <K extends keyof EventFormState>(field: K, value: EventFormState[K]): void => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = (eventSubmit: React.FormEvent): void => {
    eventSubmit.preventDefault();
    const startAt = localToIso(form.startAt);
    if (!startAt) return;

    const endAtLocal = form.endAt.trim() ? localToIso(form.endAt.trim()) : undefined;
    const closesAtIso = form.registrationClosesAt.trim()
      ? localToIso(form.registrationClosesAt.trim())
      : undefined;
    if (uploading || save.isPending) return;
    if (endAtLocal && Date.parse(endAtLocal) <= Date.parse(startAt)) {
      setValidationError('End must be after start.');
      return;
    }
    if (closesAtIso && Date.parse(closesAtIso) > Date.parse(startAt)) {
      setValidationError('Registration must close by the start of the event.');
      return;
    }
    const parsed = parseEventForm(form);
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · '),
      );
      return;
    }
    const body = eventPatch(parsed.data, event);
    setValidationError('');

    save.mutate({ id: event?.id, body }, { onSuccess: () => onClose() });
  };

  const submitLabel = ((): string => {
    if (save.isPending) return 'Saving…';
    return event ? 'Update' : 'Create';
  })();

  return (
    <Dialog
      open={open}
      aria-label={event ? 'Edit event' : 'Create event'}
      onClose={uploading || save.isPending ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogHeader
        icon={<CalendarTodayIcon />}
        eyebrow="Events"
        title={event ? 'Edit event' : 'Create event'}
        description={
          event
            ? 'Update the details of this event.'
            : 'Schedule a new event for the community calendar.'
        }
        onClose={() => {
          if (!uploading && !save.isPending) onClose();
        }}
      />
      <Box
        component="form"
        id="event-form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <DialogContent sx={{ bgcolor: 'background.default', py: 3 }}>
          <Stack spacing={2} sx={dialogSectionSx}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ImageOutlinedIcon /> Event artwork
            </Typography>
            <MediaUploadField
              label="Event image"
              accept="image/jpeg,image/png,image/gif,image/webp"
              preview
              value={form.image}
              onChange={(image) => setField('image', image)}
              maxSizeMB={5}
              onUploadingChange={setUploading}
            />
            <Typography variant="caption" color="text.secondary">
              The uploaded image appears on the website. Without an image, Alliance artwork is
              shown.
            </Typography>
            <Divider />
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <TitleIcon sx={{ fontSize: 17 }} />
                  Title
                </Box>
              }
              required
              value={form.title}
              onChange={(eventChange) => handleChange('title', eventChange.target.value)}
            />
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <DescriptionOutlinedIcon sx={{ fontSize: 17 }} />
                  Description
                </Box>
              }
              required
              multiline
              rows={4}
              value={form.description}
              onChange={(eventChange) => handleChange('description', eventChange.target.value)}
            />
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <CalendarTodayIcon sx={{ fontSize: 17 }} />
                  Start
                </Box>
              }
              type="datetime-local"
              helperText={`Times use ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}
              required
              value={form.startAt}
              onChange={(eventChange) => handleChange('startAt', eventChange.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <CalendarTodayIcon sx={{ fontSize: 17 }} />
                  End (optional)
                </Box>
              }
              type="datetime-local"
              value={form.endAt}
              onChange={(eventChange) => handleChange('endAt', eventChange.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <LocationOnOutlinedIcon sx={{ fontSize: 17 }} />
                  Location
                </Box>
              }
              required
              value={form.location}
              onChange={(eventChange) => handleChange('location', eventChange.target.value)}
            />
            <TextField
              select
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <LocalOfferOutlinedIcon sx={{ fontSize: 17 }} />
                  Type
                </Box>
              }
              required
              value={form.type}
              onChange={(eventChange) => handleChange('type', eventChange.target.value)}
            >
              {EVENT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {TYPE_LABEL[type]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <LocalOfferOutlinedIcon sx={{ fontSize: 17 }} />
                  Status
                </Box>
              }
              required
              value={form.status}
              onChange={(eventChange) => handleChange('status', eventChange.target.value)}
            >
              {CONTENT_STATUSES.map((status) => (
                <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <PersonOutlinedIcon sx={{ fontSize: 17 }} />
                  Host / speaker (optional)
                </Box>
              }
              value={form.host}
              onChange={(eventChange) => handleChange('host', eventChange.target.value)}
            />
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <PersonOutlinedIcon sx={{ fontSize: 17 }} />
                  Host title (optional)
                </Box>
              }
              value={form.hostTitle}
              onChange={(eventChange) => handleChange('hostTitle', eventChange.target.value)}
            />
            <TextField
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  <LocalOfferOutlinedIcon sx={{ fontSize: 17 }} />
                  Admission (optional)
                </Box>
              }
              placeholder="FREE"
              value={form.admission}
              onChange={(eventChange) => handleChange('admission', eventChange.target.value)}
            />

            <Divider sx={{ pt: 1 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={form.registrationEnabled}
                  onChange={(_e, checked) => setField('registrationEnabled', checked)}
                />
              }
              label="Allow people to register on the website"
            />
            {form.registrationEnabled && (
              <>
                <TextField
                  label={
                    <Box
                      component="span"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                    >
                      <PersonOutlinedIcon sx={{ fontSize: 17 }} />
                      Capacity (optional)
                    </Box>
                  }
                  type="number"
                  value={form.capacity}
                  onChange={(eventChange) => handleChange('capacity', eventChange.target.value)}
                  helperText="Leave blank for unlimited places."
                />
                <TextField
                  label={
                    <Box
                      component="span"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                    >
                      <CalendarTodayIcon sx={{ fontSize: 17 }} />
                      Registration closes (optional)
                    </Box>
                  }
                  type="datetime-local"
                  value={form.registrationClosesAt}
                  onChange={(eventChange) =>
                    handleChange('registrationClosesAt', eventChange.target.value)
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Defaults to the event start time."
                />
                <QuestionBuilder
                  label="Extra questions for this event"
                  helperText="Everyone is asked the core audience questions. Add anything specific to this event here."
                  value={form.questions}
                  onChange={(questions) => setField('questions', questions)}
                />
              </>
            )}

            {validationError && <Alert severity="error">{validationError}</Alert>}
            {save.isError && (
              <Typography variant="body2" color="error">
                {save.error?.message ?? 'Could not save the event. Please try again.'}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogFooter>
          <Button onClick={onClose} disabled={uploading || save.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="event-form"
            variant="contained"
            disabled={save.isPending || uploading}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </Box>
    </Dialog>
  );
};

interface DeleteConfirmDialogProps {
  open: boolean;
  event: Event | null;
  onClose: () => void;
}

const DeleteConfirmDialog = ({ open, event, onClose }: DeleteConfirmDialogProps): JSX.Element => {
  const remove = useDeleteEvent();

  const handleConfirm = (): void => {
    if (!event) return;
    remove.mutate(event.id, { onSuccess: () => onClose() });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogHeader
        icon={<DeleteOutlinedIcon />}
        eyebrow="Events"
        title="Delete event?"
        tone="error"
        onClose={onClose}
      />
      <DialogContent sx={{ py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete <strong>{event?.title}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={remove.isPending}
        >
          {remove.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

interface EventCardProps {
  event: Event;
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onShowQr: (event: Event) => void;
  onDelete: (event: Event) => void;
}

const EventCard = ({ event, onView, onEdit, onDelete, onShowQr }: EventCardProps): JSX.Element => {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        transition: theme.transitions.create(['box-shadow', 'border-color', 'transform']),
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.4),
          boxShadow: `0 10px 30px -18px ${alpha(theme.palette.primary.main, 0.5)}`,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box
          component="button"
          aria-label={`View ${event.title}`}
          onClick={() => onView(event)}
          sx={{
            p: 0,
            border: 0,
            cursor: 'pointer',
            width: { xs: '100%', sm: 180 },
            height: 140,
            borderRadius: 2,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <EventImage src={event.image?.url} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            component="button"
            onClick={() => onView(event)}
            variant="h6"
            sx={{
              fontWeight: 700,
              lineHeight: 1.25,
              bgcolor: 'transparent',
              border: 0,
              p: 0,
              color: 'text.primary',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            {event.title}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}
          >
            <Chip size="small" color={TYPE_TONE[event.type]} label={TYPE_LABEL[event.type]} />
            <Chip
              size="small"
              variant="outlined"
              color={STATUS_TONE[event.status]}
              label={event.status}
              sx={{ textTransform: 'capitalize' }}
            />
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 1.5, color: 'text.secondary' }}
          >
            <CalendarTodayIcon fontSize="small" />
            <Typography variant="body2">{formatEventRange(event.startAt, event.endAt)}</Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 0.75, color: 'text.secondary' }}
          >
            <LocationOnOutlinedIcon fontSize="small" />
            <Typography variant="body2">{event.location}</Typography>
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.description}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <IconButton
            aria-label="Show QR code"
            onClick={() => onShowQr(event)}
            size="small"
            title="QR code for flyers and slides"
          >
            <QrCode2Icon />
          </IconButton>
          <IconButton aria-label="Edit event" onClick={() => onEdit(event)} size="small">
            <EditOutlinedIcon />
          </IconButton>
          <IconButton
            aria-label="Delete event"
            onClick={() => onDelete(event)}
            size="small"
            color="error"
          >
            <DeleteOutlinedIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
};

const Events = (): JSX.Element => {
  const { data, isLoading, isError, refetch } = useEvents();
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const events = useMemo(() => data?.items ?? [], [data]);
  const [view, setView] = useState<'calendar' | 'card'>('calendar');
  const [month, setMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [initialStart, setInitialStart] = useState<string | undefined>();
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [events],
  );

  const openCreate = (): void => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    setEditingEvent(null);
    setInitialStart(toDatetimeLocal(start));
    setDialogOpen(true);
  };

  const openCreateForDay = (date: Date): void => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    setEditingEvent(null);
    setInitialStart(toDatetimeLocal(start));
    setDialogOpen(true);
  };

  const openEdit = (event: Event): void => {
    setViewingEvent(null);
    setEditingEvent(event);
    setInitialStart(undefined);
    setDialogOpen(true);
  };

  const closeDialog = (): void => {
    setDialogOpen(false);
    setEditingEvent(null);
    setInitialStart(undefined);
  };

  if (isLoading) {
    return <PageSkeleton cards={4} />;
  }
  if (isError)
    return (
      <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>
        Events could not be loaded.
      </Alert>
    );

  return (
    <>
      <PageHeader
        icon={<CalendarMonthOutlinedIcon />}
        title="Events"
        description="Plan, publish, and manage upcoming events."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Create event
          </Button>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarMonthOutlinedIcon />}
          title="No events yet"
          description="Create your first event to see it on the calendar and public website."
          primaryAction={{ label: 'Create event', onClick: openCreate, icon: <AddIcon /> }}
        />
      ) : (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_event, next) => next && setView(next)}
              aria-label="Event view"
              size="small"
            >
              <ToggleButton value="calendar" aria-label="Calendar view">
                <CalendarMonthOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
                Calendar
              </ToggleButton>
              <ToggleButton value="card" aria-label="Card view">
                <FormatListBulletedIcon fontSize="small" sx={{ mr: 0.75 }} />
                Card
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary">
              {events.length} event{events.length === 1 ? '' : 's'}
            </Typography>
          </Stack>

          {view === 'calendar' ? (
            <CalendarGrid
              events={events}
              month={month}
              onMonthChange={setMonth}
              onSelectDay={openCreateForDay}
              onSelectEvent={setViewingEvent}
            />
          ) : (
            <Stack spacing={2}>
              {sortedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onView={setViewingEvent}
                  onEdit={openEdit}
                  onDelete={setDeletingEvent}
                  onShowQr={setQrEvent}
                />
              ))}
            </Stack>
          )}
        </>
      )}

      <EventDetailDialog
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={openEdit}
      />
      <EventDialog
        open={dialogOpen}
        event={editingEvent}
        initialStart={initialStart}
        onClose={closeDialog}
      />
      <DeleteConfirmDialog
        open={Boolean(deletingEvent)}
        event={deletingEvent}
        onClose={() => setDeletingEvent(null)}
      />
      <EventQrDialog event={qrEvent} open={Boolean(qrEvent)} onClose={() => setQrEvent(null)} />
    </>
  );
};

export default Events;

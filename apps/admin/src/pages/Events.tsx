import { CONTENT_STATUSES, EVENT_TYPES } from '@iaa/shared';
import type { ContentStatus, EventType, Event, EventInput, EventUpdate } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../components/EmptyState';
import { CalendarGrid } from '../components/events/CalendarGrid';
import { PageHeader } from '../components/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { useDeleteEvent, useEvents, useSaveEvent } from '../lib/admin-hooks';

const STATUS_TONE: Record<ContentStatus, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  draft: 'warning',
  published: 'success',
};

const TYPE_TONE: Record<EventType, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
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
});

interface EventFormState {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  type: EventType;
  status: ContentStatus;
}

const EventDialog = ({ open, event, initialStart, onClose }: EventDialogProps): JSX.Element => {
  const save = useSaveEvent();
  const resetSave = save.reset;
  const [form, setForm] = useState<EventFormState>(emptyForm());

  useEffect(() => {
    if (!open) return;
    resetSave();
    if (event) {
      setForm({
        title: event.title,
        description: event.description,
        startAt: isoToDatetimeLocal(event.startAt),
        endAt: isoToDatetimeLocal(event.endAt),
        location: event.location,
        type: event.type,
        status: event.status,
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

  const handleSubmit = (eventSubmit: React.FormEvent): void => {
    eventSubmit.preventDefault();
    const startAt = localToIso(form.startAt);
    if (!startAt) return;

    const endAtLocal = form.endAt.trim() ? localToIso(form.endAt.trim()) : undefined;
    const body: EventInput | EventUpdate = {
      title: form.title.trim(),
      description: form.description.trim(),
      startAt,
      location: form.location.trim(),
      type: form.type,
      status: form.status,
      ...(endAtLocal ? { endAt: endAtLocal } : {}),
    };

    save.mutate(
      { id: event?.id, body },
      { onSuccess: () => onClose() },
    );
  };

  const submitLabel = ((): string => {
    if (save.isPending) return 'Saving…';
    return event ? 'Update' : 'Create';
  })();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{event ? 'Edit event' : 'Create event'}</DialogTitle>
      <Box component="form" id="event-form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Title"
            required
            value={form.title}
            onChange={(eventChange) => handleChange('title', eventChange.target.value)}
          />
          <TextField
            label="Description"
            required
            multiline
            rows={4}
            value={form.description}
            onChange={(eventChange) => handleChange('description', eventChange.target.value)}
          />
          <TextField
            label="Start"
            type="datetime-local"
            required
            value={form.startAt}
            onChange={(eventChange) => handleChange('startAt', eventChange.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="End (optional)"
            type="datetime-local"
            value={form.endAt}
            onChange={(eventChange) => handleChange('endAt', eventChange.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Location"
            required
            value={form.location}
            onChange={(eventChange) => handleChange('location', eventChange.target.value)}
          />
          <TextField
            select
            label="Type"
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
            label="Status"
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
          {save.isError && (
            <Typography variant="body2" color="error">
              Could not save the event. Please check the fields and try again.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="event-form" variant="contained" disabled={save.isPending}>
            {submitLabel}
          </Button>
        </DialogActions>
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete event?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete <strong>{event?.title}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="error" disabled={remove.isPending}>
          {remove.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

const EventCard = ({ event, onEdit, onDelete }: EventCardProps): JSX.Element => {
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {event.title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
            <Chip size="small" color={TYPE_TONE[event.type]} label={TYPE_LABEL[event.type]} />
            <Chip
              size="small"
              variant="outlined"
              color={STATUS_TONE[event.status]}
              label={event.status}
              sx={{ textTransform: 'capitalize' }}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: 'text.secondary' }}>
            <CalendarTodayIcon fontSize="small" />
            <Typography variant="body2">{formatEventRange(event.startAt, event.endAt)}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75, color: 'text.secondary' }}>
            <LocationOnOutlinedIcon fontSize="small" />
            <Typography variant="body2">{event.location}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.6 }}>
            {event.description}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <IconButton aria-label="Edit event" onClick={() => onEdit(event)} size="small">
            <EditOutlinedIcon />
          </IconButton>
          <IconButton aria-label="Delete event" onClick={() => onDelete(event)} size="small" color="error">
            <DeleteOutlinedIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
};

const Events = (): JSX.Element => {
  const { data, isLoading } = useEvents();
  const events = useMemo(() => data?.items ?? [], [data]);
  const [view, setView] = useState<'calendar' | 'card'>('calendar');
  const [month, setMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [initialStart, setInitialStart] = useState<string | undefined>();
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

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
            />
          ) : (
            <Stack spacing={2}>
              {sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} onEdit={openEdit} onDelete={setDeletingEvent} />
              ))}
            </Stack>
          )}
        </>
      )}

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
    </>
  );
};

export default Events;

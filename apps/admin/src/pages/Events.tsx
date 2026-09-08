import type { ContentStatus, EventType, Event } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DialogFooter, DialogHeader, dialogPaperSx } from '../components/dialogs/DialogShell';
import { EmptyState } from '../components/EmptyState';
import { CalendarGrid } from '../components/events/CalendarGrid';
import { EventDetailDialog } from '../components/events/EventDetailDialog';
import { EventImage } from '../components/events/EventImage';
import { EventQrDialog } from '../components/events/EventQrDialog';
import { PageHeader } from '../components/PageHeader';
import { CalendarPageSkeleton } from '../components/PageSkeleton';
import { useDeleteEvent, useEvents } from '../lib/admin-hooks';

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
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useEvents();
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const events = useMemo(() => data?.items ?? [], [data]);
  const [view, setView] = useState<'calendar' | 'card'>('calendar');
  const [month, setMonth] = useState(new Date());
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [events],
  );

  const openCreate = (): void => {
    navigate('/events/new');
  };

  const openCreateForDay = (date: Date): void => {
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    navigate(`/events/new?date=${day}`);
  };

  const openEdit = (event: Event): void => {
    navigate(`/events/${event.id}/edit`);
  };

  if (isLoading) {
    return <CalendarPageSkeleton />;
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

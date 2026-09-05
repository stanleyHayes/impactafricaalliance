import type { Event } from '@iaa/shared';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';

import { EventImage } from './EventImage';

export const EventDetailDialog = ({
  event,
  onClose,
  onEdit,
}: {
  event: Event | null;
  onClose: () => void;
  onEdit: (event: Event) => void;
}): JSX.Element | null => {
  if (!event) return null;
  const schedule = new Date(event.startAt).toLocaleString('en-GB');
  return (
    <Dialog
      open
      aria-label={event.title}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogHeader
        icon={<CalendarTodayIcon />}
        eyebrow="Event details"
        title={event.title}
        onClose={onClose}
      />
      <DialogContent>
        <Box sx={{ height: { xs: 220, sm: 320 }, borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <EventImage src={event.image?.url} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Chip label={event.type.replaceAll('-', ' ')} />
          <Chip label={event.status} color={event.status === 'published' ? 'success' : 'warning'} />
        </Stack>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5}>
            <CalendarTodayIcon color="action" />
            <Box>
              <Typography sx={{ fontWeight: 650 }}>Date & time</Typography>
              <Typography color="text.secondary">
                {schedule}
                {event.endAt ? ` – ${new Date(event.endAt).toLocaleString('en-GB')}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <LocationOnOutlinedIcon color="action" />
            <Box>
              <Typography sx={{ fontWeight: 650 }}>Venue</Typography>
              <Typography color="text.secondary">{event.location}</Typography>
            </Box>
          </Stack>
          {event.host && (
            <Stack direction="row" spacing={1.5}>
              <PersonOutlinedIcon color="action" />
              <Box>
                <Typography sx={{ fontWeight: 650 }}>Host / speaker</Typography>
                <Typography color="text.secondary">
                  {event.host}
                  {event.hostTitle ? ` · ${event.hostTitle}` : ''}
                </Typography>
              </Box>
            </Stack>
          )}
          <Stack direction="row" spacing={1.5}>
            <LocalOfferOutlinedIcon color="action" />
            <Box>
              <Typography sx={{ fontWeight: 650 }}>Registration</Typography>
              <Typography color="text.secondary">
                {event.registrationEnabled ? 'Enabled' : 'Disabled'}
                {event.admission ? ` · ${event.admission}` : ''}
                {event.capacity ? ` · ${event.capacity} places` : ''}
              </Typography>
              {event.registrationClosesAt && (
                <Typography color="text.secondary">
                  Closes {new Date(event.registrationClosesAt).toLocaleString('en-GB')}
                </Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <DescriptionOutlinedIcon color="action" />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 650 }}>Description</Typography>
              <Typography
                color="text.secondary"
                sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}
              >
                {event.description}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(event)}>
          Edit event
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

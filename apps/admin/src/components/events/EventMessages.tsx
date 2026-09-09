import { eventMessageInputSchema, type Event, type EventMessage } from '@iaa/shared';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useEventMessages, useSendEventMessage } from '../../lib/admin-hooks';
import { formatUtcShort } from '../../lib/date';

const KIND_LABEL: Record<EventMessage['kind'], string> = {
  reminder: 'Reminder',
  'thank-you': 'Thank you',
  custom: 'Team message',
};

const SentMessage = ({ message }: { message: EventMessage }): JSX.Element => (
  <Box
    sx={{
      p: 2.5,
      borderLeft: 3,
      borderColor: message.status === 'failed' ? 'error.main' : 'divider',
      bgcolor: 'action.hover',
      borderRadius: 1,
      overflowWrap: 'anywhere',
    }}
  >
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
      <Chip size="small" label={KIND_LABEL[message.kind]} />
      <Typography variant="caption" sx={{ textTransform: 'capitalize', fontWeight: 700 }}>
        {message.status}
      </Typography>
      {message.includeMeetingLink && (
        <Chip size="small" variant="outlined" icon={<LinkRoundedIcon />} label="Link included" />
      )}
      <Chip
        size="small"
        variant="outlined"
        color={message.failedCount > 0 ? 'warning' : 'success'}
        label={
          message.failedCount > 0
            ? `${message.recipientCount} sent · ${message.failedCount} failed`
            : `${message.recipientCount} sent`
        }
      />
    </Stack>
    <Typography sx={{ mt: 1, fontWeight: 700 }}>{message.subject}</Typography>
    <Box component="details" sx={{ mt: 1 }}>
      <Typography
        component="summary"
        variant="body2"
        sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600 }}
      >
        Read message
      </Typography>
      <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
        {message.body}
      </Typography>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      {formatUtcShort(message.sentAt)}
      {message.sentBy ? ` · ${message.sentBy}` : ' · automatic'}
    </Typography>
  </Box>
);

const MessagePreview = ({
  event,
  form,
}: {
  event: Event;
  form: { subject: string; body: string; includeMeetingLink: boolean };
}): JSX.Element => (
  <Box
    component="aside"
    sx={{
      p: { xs: 2.5, sm: 3 },
      bgcolor: 'action.hover',
      minWidth: 0,
      overflowWrap: 'anywhere',
    }}
  >
    <Typography variant="overline" color="text.secondary">
      Message preview
    </Typography>
    <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>
      {form.subject || 'Your email subject'}
    </Typography>
    <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap', minHeight: 100 }}>
      {form.body || 'Your message will appear here as you write.'}
    </Typography>
    <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Typography component="p" variant="subtitle2">
        {event.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatUtcShort(event.startAt)} · {event.location}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {form.includeMeetingLink ? 'Joining link included' : 'Joining link not included'}
      </Typography>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
      Content preview. The email uses the Alliance email template.
    </Typography>
  </Box>
);

export const EventMessages = ({ event }: { event: Event }): JSX.Element => {
  const { data, isLoading, isError, refetch } = useEventMessages(event.id);
  const sendMessage = useSendEventMessage(event.id);
  const [form, setForm] = useState({ subject: '', body: '', includeMeetingLink: false });
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const [sendFailed, setSendFailed] = useState(false);

  const messages = data?.items ?? [];
  const ready = eventMessageInputSchema.safeParse({
    ...form,
    subject: form.subject.trim(),
    body: form.body.trim(),
  }).success;

  const send = (): void => {
    setSendFailed(false);
    sendMessage.mutate(form, {
      onSuccess: (result) => {
        setNotice(
          result.failedCount > 0
            ? `Sent to ${result.recipientCount}; ${result.failedCount} could not be reached.`
            : `Sent to ${result.recipientCount} ${result.recipientCount === 1 ? 'person' : 'people'}.`,
        );
        setForm({ subject: '', body: '', includeMeetingLink: false });
        setConfirming(false);
      },
      onError: (error) => {
        setSendFailed(true);
        setNotice(error.message);
        setConfirming(false);
      },
    });
  };

  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 2.5, sm: 3 },
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.055),
          borderRadius: '12px 12px 0 0',
        }}
      >
        <MailOutlineRoundedIcon
          aria-hidden
          sx={{
            position: 'absolute',
            right: 20,
            bottom: -25,
            fontSize: 150,
            opacity: 0.07,
            color: 'primary.main',
          }}
        />
        <Typography variant="overline" color="text.secondary">
          Attendee communication
        </Typography>
        <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
          Message registrants
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
          Keep everyone in the loop with joining details, event updates or a follow-up note.
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.5fr) minmax(0, 1fr)' },
          border: 1,
          borderColor: 'divider',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={2.5} sx={{ p: { xs: 2.5, sm: 3 }, minWidth: 0 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Compose an email
            </Typography>
            <Typography variant="body2" color="text.secondary">
              To all registrants for {event.title}
            </Typography>
          </Box>
          <TextField
            label="Subject"
            disabled={sendMessage.isPending}
            slotProps={{ htmlInput: { maxLength: 180 } }}
            helperText={`${form.subject.length}/180 characters · Minimum 3`}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            fullWidth
          />
          <TextField
            label="Message"
            disabled={sendMessage.isPending}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            multiline
            minRows={5}
            fullWidth
            helperText={`${form.body.length}/5000 characters · Minimum 10. Event details are added automatically.`}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.includeMeetingLink}
                onChange={(e) => setForm({ ...form, includeMeetingLink: e.target.checked })}
                disabled={!event.meetingUrl || sendMessage.isPending}
              />
            }
            label={
              event.meetingUrl
                ? 'Include the joining link'
                : 'Include the joining link — this event has none'
            }
          />
          <Box>
            <Button
              variant="contained"
              startIcon={<SendRoundedIcon />}
              disabled={!ready || sendMessage.isPending}
              onClick={() => setConfirming(true)}
            >
              {sendMessage.isPending ? 'Sending…' : 'Review message'}
            </Button>
          </Box>
        </Stack>
        <MessagePreview event={event} form={form} />
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 3, mb: 1.5 }}>
        <HistoryRoundedIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 1 }} /> Delivery
        history
      </Typography>
      {isLoading && <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2.5 }} />}
      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        >
          Message history could not be loaded.
        </Alert>
      )}
      {!isLoading && !isError && messages.length === 0 && (
        <Box sx={{ p: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="subtitle2">No messages yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manual emails and automated reminders will appear here with their delivery results.
          </Typography>
        </Box>
      )}
      <Stack spacing={1.5}>
        {messages.map((message) => (
          <SentMessage key={message.id} message={message} />
        ))}
      </Stack>

      {/*
        Email cannot be recalled, so the count is put in front of the sender
        before it goes rather than reported afterwards.
      */}
      <Dialog
        open={confirming}
        onClose={() => {
          if (!sendMessage.isPending) setConfirming(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send this to everyone registered?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This emails every person registered for {event.title}. It cannot be unsent.
          </DialogContentText>
          <Box
            sx={{ my: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, overflowWrap: 'anywhere' }}
          >
            <Typography variant="subtitle2">{form.subject}</Typography>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {form.body}
            </Typography>
          </Box>
          {form.includeMeetingLink && (
            <Alert severity="info" sx={{ mt: 2 }}>
              The joining link will be included.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={sendMessage.isPending} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={send} disabled={sendMessage.isPending}>
            Send now
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice !== ''}
        autoHideDuration={sendFailed ? null : 6000}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
  );
};

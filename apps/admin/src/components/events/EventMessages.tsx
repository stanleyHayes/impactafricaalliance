import type { Event, EventMessage } from '@iaa/shared';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useEventMessages, useSendEventMessage } from '../../lib/admin-hooks';
import { formatUtcShort } from '../../lib/date';

const KIND_LABEL: Record<EventMessage['kind'], string> = {
  reminder: 'Reminder',
  'thank-you': 'Thank you',
  custom: 'Sent by hand',
};

const SentMessage = ({ message }: { message: EventMessage }): JSX.Element => (
  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
      <Chip size="small" label={KIND_LABEL[message.kind]} />
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
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
      {message.body}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      {formatUtcShort(message.sentAt)}
      {message.sentBy ? ` · ${message.sentBy}` : ' · automatic'}
    </Typography>
  </Box>
);

export const EventMessages = ({ event }: { event: Event }): JSX.Element => {
  const { data, isLoading } = useEventMessages(event.id);
  const sendMessage = useSendEventMessage(event.id);
  const [form, setForm] = useState({ subject: '', body: '', includeMeetingLink: false });
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');

  const messages = data?.items ?? [];
  const ready = form.subject.trim().length >= 3 && form.body.trim().length >= 10;

  const send = (): void => {
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
        setNotice(error.message);
        setConfirming(false);
      },
    });
  };

  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Message registrants
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Writes to everyone who has registered. Use it before the event with joining details, or
        afterwards to follow up.
      </Typography>

      <Stack spacing={2} sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2.5 }}>
        <TextField
          label="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          fullWidth
        />
        <TextField
          label="Message"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          multiline
          minRows={5}
          fullWidth
          helperText="The event's title, time and location are added underneath automatically."
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={form.includeMeetingLink}
              onChange={(e) => setForm({ ...form, includeMeetingLink: e.target.checked })}
              disabled={!event.meetingUrl}
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
            {sendMessage.isPending ? 'Sending…' : 'Send to registrants'}
          </Button>
        </Box>
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 3, mb: 1.5 }}>
        Already sent
      </Typography>
      {isLoading && <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2.5 }} />}
      {!isLoading && messages.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nothing has been sent for this event yet.
        </Typography>
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
      <Dialog open={confirming} onClose={() => setConfirming(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send this to everyone registered?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This emails every person registered for {event.title}. It cannot be unsent.
          </DialogContentText>
          {form.includeMeetingLink && (
            <Alert severity="info" sx={{ mt: 2 }}>
              The joining link will be included.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button variant="contained" onClick={send} disabled={sendMessage.isPending}>
            Send now
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice !== ''}
        autoHideDuration={6000}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
  );
};

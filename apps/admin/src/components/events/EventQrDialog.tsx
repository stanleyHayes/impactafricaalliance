import type { Event } from '@iaa/shared';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useEventQr } from '../../lib/admin-hooks';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';

interface EventQrDialogProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

/** Shows a scannable code for an event and lets an editor save it for print. */
export const EventQrDialog = ({ event, open, onClose }: EventQrDialogProps): JSX.Element => {
  const { data, isFetching, isError, refetch } = useEventQr(open && event ? event.id : undefined);
  const qrCode = !isFetching && !isError ? data : undefined;
  const eventTitle = event?.title ?? 'event';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogHeader
        icon={<QrCode2Icon />}
        eyebrow="Events"
        title="QR code"
        description={event ? `Scan to open “${event.title}”.` : ''}
        onClose={onClose}
      />
      <DialogContent sx={{ bgcolor: 'background.default', py: 3 }}>
        <Stack spacing={2} alignItems="center">
          {isFetching && <Skeleton variant="rounded" width={240} height={240} />}
          {isError && !isFetching && (
            <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>
              Could not generate the QR code.
            </Alert>
          )}
          {qrCode && (
            <>
              <Box
                component="img"
                src={qrCode.dataUrl}
                alt={`QR code for ${eventTitle}`}
                sx={{ width: 240, height: 240, borderRadius: 2, bgcolor: '#fff' }}
              />
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', wordBreak: 'break-all', textAlign: 'center' }}
              >
                {qrCode.targetUrl}
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
        {qrCode && (
          <Button
            component="a"
            href={qrCode.dataUrl}
            download={`iaa-${slugify(eventTitle)}-qr.png`}
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
          >
            Download
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
};

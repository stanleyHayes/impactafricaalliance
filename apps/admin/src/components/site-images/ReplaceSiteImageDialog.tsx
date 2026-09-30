import type { MediaAsset } from '@iaa/shared';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent } from 'react';

import { isUndersized, recommendedSize, type SlotView } from '../../lib/site-images';
import { useSaveResource } from '../../resources/hooks';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';
import { MediaUploadField } from '../fields/MediaUploadField';
import { ImageSlotPreview } from '../media/ImageSlotPreview';

interface ReplaceSiteImageDialogProps {
  view: SlotView;
  pageLabel: string;
  onClose: () => void;
  /** Called with a sentence for the snackbar once the site shows the new picture. */
  onSaved: (message: string) => void;
}

/** The body the API is sent: an edit of the slot's record when it has one, a new record otherwise. */
export const replacementRequest = (
  view: SlotView,
  image: MediaAsset,
  alt: string,
): { id?: string; body: Record<string, unknown> } => {
  const described = view.slot.decorative ? {} : { alt: alt.trim() };
  const body = { image, isActive: true, ...described };
  return view.record ? { id: view.record.id, body } : { body: { key: view.slot.key, ...body } };
};

/** A replacement that was reset is offered again, so bringing it back is one click. */
const initialImage = ({ record }: SlotView): MediaAsset | undefined =>
  record && !record.isActive ? record.image : undefined;

/** The words of the picture being brought back or replaced carry over; otherwise blank. */
const initialAlt = ({ record }: SlotView): string => record?.alt ?? '';

/** Says when a chosen picture is smaller than the slot needs to stay sharp. */
const SizeWarning = ({
  slot,
  image,
}: {
  slot: SlotView['slot'];
  image: MediaAsset | undefined;
}): JSX.Element | null =>
  image && isUndersized(slot, image) ? (
    <Alert severity="warning" role="note" sx={{ borderRadius: 2 }}>
      This picture is {image.width} × {image.height} px, so it may look soft here.{' '}
      {recommendedSize(slot)} is best.
    </Alert>
  ) : null;

/** The description field, or why a background picture needs none. */
const AltTextInput = ({
  decorative,
  value,
  disabled,
  onChange,
}: {
  decorative: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): JSX.Element =>
  decorative ? (
    <Alert severity="info" role="note" sx={{ borderRadius: 2 }}>
      This picture sits behind text, so screen readers skip it and it needs no description.
    </Alert>
  ) : (
    <TextField
      label="Alt text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      fullWidth
      slotProps={{ htmlInput: { maxLength: 300 } }}
      helperText="What is in the picture, for people using screen readers. Leave it blank to use the description saved with the picture in the media library."
    />
  );

/**
 * Choose the picture for one place on the site: upload one, or reuse one
 * from the media library, and say what is in it.
 *
 * Two fields, so a dialog rather than a page. The preview shows the choice in
 * the shape the site crops it to before anything changes. Saving edits the
 * slot's existing record when it has one, so a slot never ends up with two.
 */
export const ReplaceSiteImageDialog = ({
  view,
  pageLabel,
  onClose,
  onSaved,
}: ReplaceSiteImageDialogProps): JSX.Element => {
  const { slot } = view;
  const save = useSaveResource('site-images');
  const [image, setImage] = useState<MediaAsset | undefined>(() => initialImage(view));
  const [alt, setAlt] = useState(() => initialAlt(view));
  const [uploading, setUploading] = useState(false);
  const busy = uploading || save.isPending;
  // The new choice, else what the site shows now, else (below) the shipped picture.
  const previewImage = image ?? view.resolved.record?.image;

  const choose = (asset: MediaAsset | undefined): void => {
    setImage(asset);
    // The library's description is a better start than nothing; the editor's own words stay.
    if (asset?.alt && !alt.trim()) setAlt(asset.alt);
  };

  const submit = (event?: FormEvent): void => {
    event?.preventDefault();
    if (!image || busy) return;
    save.mutate(replacementRequest(view, image, alt), {
      onSuccess: () => onSaved(`${slot.label} now shows your picture on the site.`),
    });
  };

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      // The branded header is not a DialogTitle, so the dialog is named here.
      slotProps={{ paper: { sx: dialogPaperSx, 'aria-label': `Replace ${slot.label}` } }}
    >
      <DialogHeader
        icon={<AddPhotoAlternateOutlinedIcon />}
        eyebrow={pageLabel}
        title={`Replace ${slot.label}`}
        description={`Best at ${recommendedSize(slot)}. Upload a picture, or choose one already in the media library.`}
        onClose={busy ? undefined : onClose}
      />
      <DialogContent dividers>
        <Stack component="form" id="replace-site-image" spacing={2.5} onSubmit={submit}>
          <MediaUploadField
            label="New picture"
            accept="image/*"
            preview
            folder="site"
            value={image}
            onChange={choose}
            onUploadingChange={setUploading}
          />
          <SizeWarning slot={slot} image={image} />
          <AltTextInput
            decorative={Boolean(slot.decorative)}
            value={alt}
            disabled={busy}
            onChange={setAlt}
          />
          <ImageSlotPreview
            title="How it will look"
            usage={slot.usage}
            aspect={slot.aspect}
            {...(previewImage ? { image: previewImage } : {})}
            fallback={slot.fallback}
            previewPath={slot.previewPath}
          />
          {save.error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {save.error.message || 'The picture could not be saved. Please try again.'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="replace-site-image"
          variant="contained"
          disabled={!image || busy}
        >
          {save.isPending ? 'Saving…' : 'Use this picture'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

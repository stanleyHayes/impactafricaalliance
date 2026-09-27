import { videoEmbedUrl, type MediaAsset, type StoryBlockData } from '@iaa/shared';
import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { MediaUploadField } from '../../fields/MediaUploadField';

import {
  BlockTextField,
  fieldError,
  ImageWithAltField,
  optionalText,
  RowsEditor,
  type BlockFieldsProps,
} from './fields';

/** One photo with a caption. */
export const ImageBlockEditor = (props: BlockFieldsProps<'image'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  return (
    <Stack spacing={2}>
      <ImageWithAltField
        label="Photo"
        value={data.image}
        onChange={(image) => onChange({ ...data, image })}
        error={fieldError(props, 'image')}
        onUploadingChange={props.onUploadingChange}
        disabled={disabled}
      />
      <BlockTextField
        label="Caption"
        value={data.caption}
        onChange={(value) => onChange({ ...data, caption: optionalText(value) })}
        error={fieldError(props, 'caption')}
        disabled={disabled}
        maxLength={300}
      />
    </Stack>
  );
};

type GalleryPhoto = StoryBlockData<'gallery'>['images'][number];

// The schema's own limit; the site lays out a gallery of up to this many.
const GALLERY_LIMIT = 24;

/** Photos laid out together, each with its own description and caption. */
export const GalleryBlockEditor = (props: BlockFieldsProps<'gallery'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  const images = data.images ?? [];
  const add = (asset: MediaAsset | undefined): void => {
    if (asset && images.length < GALLERY_LIMIT) {
      onChange({ ...data, images: [...images, { image: asset }] });
    }
  };
  return (
    <Stack spacing={2}>
      <BlockTextField
        label="Heading (optional)"
        value={data.heading}
        onChange={(value) => onChange({ ...data, heading: optionalText(value) })}
        error={fieldError(props, 'heading')}
        disabled={disabled}
        maxLength={120}
      />
      {images.length > 0 && (
        <RowsEditor<GalleryPhoto>
          rows={images}
          onChange={(rows) => onChange({ ...data, images: rows })}
          noun="Photo"
          max={GALLERY_LIMIT}
          // New photos come from the upload field below, never as empty rows.
          minRows={0}
          disabled={disabled}
          renderRow={(row, update, index) => (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <Box
                component="img"
                src={row.image.url}
                alt=""
                sx={{ width: 96, height: 72, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
              />
              <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
                <TextField
                  label="Alt text"
                  size="small"
                  value={row.image.alt ?? ''}
                  onChange={(event) => update({ image: { ...row.image, alt: event.target.value } })}
                  helperText="Describe the photo for people who cannot see it."
                  disabled={disabled}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                />
                <TextField
                  label="Caption"
                  size="small"
                  value={row.caption ?? ''}
                  onChange={(event) => update({ caption: optionalText(event.target.value) })}
                  error={Boolean(fieldError(props, `images.${index}.caption`))}
                  helperText={fieldError(props, `images.${index}.caption`)}
                  disabled={disabled}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                />
              </Stack>
            </Stack>
          )}
        />
      )}
      {images.length < GALLERY_LIMIT ? (
        <MediaUploadField
          label={images.length > 0 ? 'Add another photo' : 'Add photos'}
          accept="image/*"
          preview={false}
          onChange={add}
          onUploadingChange={props.onUploadingChange}
          folder="stories"
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          A gallery holds up to {GALLERY_LIMIT} photos. Add another gallery block for more.
        </Typography>
      )}
      {fieldError(props, 'images') && (
        <FormHelperText error>{fieldError(props, 'images')}</FormHelperText>
      )}
    </Stack>
  );
};

/** Why a video link will not play, checked as it is typed. */
export const videoProblem = (url: string | undefined): string | undefined =>
  url?.trim() && !videoEmbedUrl(url) ? 'Use a YouTube or Vimeo link.' : undefined;

/**
 * A YouTube or Vimeo video, previewed here exactly as it will be embedded:
 * through YouTube's no-cookie player or Vimeo's player, from the video's id.
 */
export const VideoBlockEditor = (props: BlockFieldsProps<'video'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  const embed = data.url ? videoEmbedUrl(data.url) : null;
  return (
    <Stack spacing={2}>
      <BlockTextField
        label="Video link"
        required
        value={data.url}
        onChange={(value) => onChange({ ...data, url: value })}
        error={videoProblem(data.url) ?? fieldError(props, 'url')}
        helperText="Paste the link from YouTube or Vimeo."
        disabled={disabled}
        maxLength={500}
      />
      {embed && (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 560,
            aspectRatio: '16 / 9',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'common.black',
          }}
        >
          <Box
            component="iframe"
            src={embed}
            title="Video preview"
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </Box>
      )}
      <BlockTextField
        label="Caption"
        value={data.caption}
        onChange={(value) => onChange({ ...data, caption: optionalText(value) })}
        error={fieldError(props, 'caption')}
        disabled={disabled}
        maxLength={300}
      />
    </Stack>
  );
};

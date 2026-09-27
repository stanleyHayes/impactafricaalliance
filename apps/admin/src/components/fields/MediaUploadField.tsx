import type { MediaAsset, MediaFolder } from '@iaa/shared';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';

import { uploadToCloudinary } from '../../lib/cloudinary';
import { downscaleImage } from '../../lib/downscale-image';
import { UPLOAD_PERMISSION_NOTE, useCanUploadFiles } from '../files/upload-permission';
import { MediaPickerDialog } from '../media/MediaPickerDialog';

interface MediaUploadFieldProps {
  label: string;
  accept: string;
  value?: MediaAsset;
  preview: boolean;
  onChange: (asset: MediaAsset | undefined) => void;
  onUploadingChange?: (uploading: boolean) => void;
  /** Max upload size in MB (defaults: 5, matching the signed upload limit). */
  maxSizeMB?: number;
  /** Which shelf of the media library uploads land on. */
  folder?: MediaFolder;
}

/** Human-readable list of accepted formats for the given accept string. */
const acceptedFormats = (accept: string): string => {
  if (accept.startsWith('image')) {
    return 'PNG, JPG, GIF or WebP';
  }
  if (accept.includes('pdf')) {
    return 'PDF document';
  }
  return 'Supported files';
};

const uploadPrompt = (uploading: boolean, hasValue: boolean): string => {
  if (uploading) {
    return 'Uploading…';
  }
  if (hasValue) {
    return 'Replace file';
  }
  return 'Click to upload or drag & drop';
};

interface DropZoneProps {
  accept: string;
  uploading: boolean;
  /** False without media:create: the zone stays in place, dimmed, and takes nothing. */
  mayUpload: boolean;
  prompt: string;
  detail: string;
  onFile: (file: File | undefined) => void;
}

/** The dashed area a file is dropped on or chosen from. */
const DropZone = ({
  accept,
  uploading,
  mayUpload,
  prompt,
  detail,
  onFile,
}: DropZoneProps): JSX.Element => {
  const theme = useTheme();
  const green = theme.palette.primary.main;
  const [dragging, setDragging] = useState(false);
  const locked = uploading || !mayUpload;
  return (
    <Box
      component="label"
      aria-disabled={!mayUpload || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        if (mayUpload) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFile(event.dataTransfer.files?.[0]);
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        textAlign: 'center',
        px: 2,
        py: 2.5,
        borderRadius: 2,
        cursor: locked ? 'default' : 'pointer',
        opacity: mayUpload ? 1 : 0.6,
        border: `1.5px dashed ${dragging ? green : theme.palette.divider}`,
        bgcolor: dragging ? alpha(green, 0.06) : 'transparent',
        transition: theme.transitions.create(['border-color', 'background-color']),
        '&:hover': mayUpload ? { borderColor: green, bgcolor: alpha(green, 0.04) } : {},
      }}
    >
      <input
        hidden
        type="file"
        accept={accept}
        disabled={locked}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {uploading ? (
        <CircularProgress size={26} color="primary" />
      ) : (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'text.primary',
            bgcolor: alpha(green, 0.1),
          }}
        >
          <CloudUploadOutlinedIcon fontSize="small" />
        </Box>
      )}
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
        {prompt}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {detail}
      </Typography>
    </Box>
  );
};

/** Polished media upload: a drag-and-drop zone with format + size guidance and a preview. */
export const MediaUploadField = ({
  label,
  accept,
  value,
  preview,
  onChange,
  maxSizeMB,
  onUploadingChange,
  folder = 'site',
}: MediaUploadFieldProps): JSX.Element => {
  const theme = useTheme();
  const green = theme.palette.primary.main;
  const isImage = accept.startsWith('image');
  const sizeLimit = maxSizeMB ?? 5;

  const uploadLock = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  // Uploading needs media:create; picking from the library does not, so
  // someone without it can still choose a picture the site already has.
  const mayUpload = useCanUploadFiles();
  const locked = uploading || !mayUpload;

  const handleFile = async (chosen: File | undefined): Promise<void> => {
    if (!chosen || uploadLock.current || !mayUpload) {
      return;
    }
    const matches = accept.split(',').some((item) => {
      const format = item.trim();
      if (format.endsWith('/*')) return chosen.type.startsWith(format.slice(0, -1));
      if (format.startsWith('.')) return chosen.name.toLowerCase().endsWith(format.toLowerCase());
      return chosen.type === format;
    });
    if (!matches) {
      setError(`Choose ${acceptedFormats(accept)}.`);
      return;
    }
    uploadLock.current = true;
    setUploading(true);
    onUploadingChange?.(true);
    setError(null);
    try {
      // Shrunk before it is measured. A photograph off a phone is routinely
      // past the cap, and the pixels beyond 2400px are never rendered — so
      // rejecting it outright turned away exactly the pictures people wanted.
      const file = await downscaleImage(chosen);
      if (file.size > sizeLimit * 1024 * 1024) {
        const size = (file.size / 1024 / 1024).toFixed(1);
        setError(
          file === chosen
            ? `That file is ${size}MB — the limit is ${sizeLimit}MB.`
            : `That file is still ${size}MB after compressing — the limit is ${sizeLimit}MB.`,
        );
        return;
      }
      onChange(await uploadToCloudinary(file, folder));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Please try again.');
    } finally {
      uploadLock.current = false;
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
        {label}
      </Typography>

      {/* Existing asset preview */}
      {value && (
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{
            p: 1.25,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.default',
          }}
        >
          {isImage && preview ? (
            <Box
              component="img"
              src={value.url}
              alt={label}
              sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1.5,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                color: 'text.primary',
                bgcolor: alpha(green, 0.1),
              }}
            >
              <DescriptionOutlinedIcon />
            </Box>
          )}
          <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Uploaded
              </Typography>
            </Stack>
            <Link
              href={value.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
            >
              View file <OpenInNewIcon sx={{ fontSize: 13 }} />
            </Link>
          </Stack>
          <Tooltip title="Remove">
            <IconButton
              size="small"
              aria-label="Remove file"
              disabled={uploading}
              onClick={() => onChange(undefined)}
              sx={{ color: 'error.main' }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}

      <DropZone
        accept={accept}
        uploading={uploading}
        mayUpload={mayUpload}
        prompt={uploadPrompt(uploading, Boolean(value))}
        detail={`${acceptedFormats(accept)} · up to ${sizeLimit}MB`}
        onFile={(file) => void handleFile(file)}
      />

      {!mayUpload && (
        // A standing note, not news: "note" rather than Alert's own "alert" role.
        <Alert severity="info" role="note" sx={{ borderRadius: 2 }}>
          {UPLOAD_PERMISSION_NOTE}
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ alignSelf: 'flex-start' }}>
        {/* Reuse comes first: uploading a second copy of a picture the site
            already has is the mistake this is here to prevent. */}
        {isImage && (
          <Button
            size="small"
            variant="text"
            disabled={uploading}
            startIcon={<CollectionsOutlinedIcon fontSize="small" />}
            onClick={() => setPicking(true)}
          >
            Choose from library
          </Button>
        )}
        {value && (
          <Button component="label" size="small" variant="text" disabled={locked}>
            Choose a different file
            <input
              hidden
              type="file"
              accept={accept}
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </Button>
        )}
      </Stack>

      {isImage && (
        <MediaPickerDialog
          open={picking}
          folder={folder}
          onClose={() => setPicking(false)}
          onSelect={(asset) => {
            setError(null);
            onChange(asset);
          }}
        />
      )}
    </Stack>
  );
};

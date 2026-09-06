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
  const [dragging, setDragging] = useState(false);
  const [picking, setPicking] = useState(false);

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file || uploadLock.current) {
      return;
    }
    const matches = accept.split(',').some((item) => {
      const format = item.trim();
      if (format.endsWith('/*')) return file.type.startsWith(format.slice(0, -1));
      if (format.startsWith('.')) return file.name.toLowerCase().endsWith(format.toLowerCase());
      return file.type === format;
    });
    if (!matches) {
      setError(`Choose ${acceptedFormats(accept)}.`);
      return;
    }
    if (file.size > sizeLimit * 1024 * 1024) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${sizeLimit}MB.`,
      );
      return;
    }
    uploadLock.current = true;
    setUploading(true);
    onUploadingChange?.(true);
    setError(null);
    try {
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

      {/* Dropzone */}
      <Box
        component="label"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files?.[0]);
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
          cursor: uploading ? 'default' : 'pointer',
          border: `1.5px dashed ${dragging ? green : theme.palette.divider}`,
          bgcolor: dragging ? alpha(green, 0.06) : 'transparent',
          transition: theme.transitions.create(['border-color', 'background-color']),
          '&:hover': { borderColor: green, bgcolor: alpha(green, 0.04) },
        }}
      >
        <input
          hidden
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
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
          {uploadPrompt(uploading, Boolean(value))}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {acceptedFormats(accept)} · up to {sizeLimit}MB
        </Typography>
      </Box>

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
          <Button component="label" size="small" variant="text" disabled={uploading}>
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

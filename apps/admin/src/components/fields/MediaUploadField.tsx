import type { MediaAsset } from '@iaa/shared';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
import { useState } from 'react';

import { uploadToCloudinary } from '../../lib/cloudinary';

interface MediaUploadFieldProps {
  label: string;
  accept: string;
  value?: MediaAsset;
  preview: boolean;
  onChange: (asset: MediaAsset) => void;
  /** Max upload size in MB (defaults: 10 for images, 25 for documents). */
  maxSizeMB?: number;
}

/** Human-readable list of accepted formats for the given accept string. */
const acceptedFormats = (accept: string): string => {
  if (accept.startsWith('image')) {
    return 'PNG, JPG, GIF, SVG or WebP';
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
}: MediaUploadFieldProps): JSX.Element => {
  const theme = useTheme();
  const green = theme.palette.primary.main;
  const isImage = accept.startsWith('image');
  const sizeLimit = maxSizeMB ?? (isImage ? 10 : 25);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) {
      return;
    }
    if (file.size > sizeLimit * 1024 * 1024) {
      setError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${sizeLimit}MB.`,
      );
      return;
    }
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadToCloudinary(file));
    } catch {
      setError('Upload failed. Check the Cloudinary configuration and try again.');
    } finally {
      setUploading(false);
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
                color: 'primary.main',
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
              onClick={() => onChange(undefined as unknown as MediaAsset)}
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
          onChange={(event) => void handleFile(event.target.files?.[0])}
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
              color: 'primary.main',
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

      {value && (
        <Button
          component="label"
          size="small"
          variant="text"
          disabled={uploading}
          sx={{ alignSelf: 'flex-start' }}
        >
          Choose a different file
          <input
            hidden
            type="file"
            accept={accept}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </Button>
      )}
    </Stack>
  );
};

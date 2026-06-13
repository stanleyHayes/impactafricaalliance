import type { MediaAsset } from '@iaa/shared';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { uploadToCloudinary } from '../../lib/cloudinary';

interface MediaUploadFieldProps {
  label: string;
  accept: string;
  value?: MediaAsset;
  preview: boolean;
  onChange: (asset: MediaAsset) => void;
}

/** Uploads an image or document to Cloudinary and stores the resulting asset. */
export const MediaUploadField = ({
  label,
  accept,
  value,
  preview,
  onChange,
}: MediaUploadFieldProps): JSX.Element => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadToCloudinary(file));
    } catch {
      setError('Upload failed. Check Cloudinary configuration and try again.');
    } finally {
      setUploading(false);
    }
  };

  let buttonLabel = 'Upload';
  if (uploading) {
    buttonLabel = 'Uploading…';
  } else if (value) {
    buttonLabel = 'Replace';
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {value && preview && (
        <Box
          component="img"
          src={value.url}
          alt={label}
          sx={{ maxHeight: 120, borderRadius: 1, alignSelf: 'flex-start' }}
        />
      )}
      {value && !preview && (
        <Link href={value.url} target="_blank" rel="noopener noreferrer">
          View uploaded file
        </Link>
      )}
      <Button
        component="label"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        disabled={uploading}
        sx={{ alignSelf: 'flex-start' }}
      >
        {buttonLabel}
        <input
          hidden
          type="file"
          accept={accept}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
};

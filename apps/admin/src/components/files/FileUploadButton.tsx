import type { FileAttachmentInput, MediaFolder } from '@iaa/shared';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useRef, useState, type ChangeEvent } from 'react';

import { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, uploadToCloudinary } from '../../lib/cloudinary';

export interface FileUploadButtonProps {
  /**
   * Receives the uploaded file, named after the file the colleague picked.
   * Return the save's promise and the button stays locked until the record
   * has it; a rejection is shown as the upload's error.
   */
  onAdd: (input: FileAttachmentInput) => Promise<unknown> | void;
  /** Told when an upload starts and ends, so a form can refuse to save half-way through one. */
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  label?: string;
  /** The media library shelf. Only used for naming; these uploads stay out of the library. */
  folder?: MediaFolder;
}

// The name field on an attachment holds 200 characters.
const NAME_LIMIT = 200;

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message ? cause.message : 'Upload failed. Please try again.';

/**
 * Uploads one document for a task or a project: PDFs, office files, text and
 * images, up to 10 MB.
 *
 * Uses the document signing profile and stays out of the media library, which
 * is for pictures that appear on the site. Locked while a file is on its way,
 * so a second pick cannot race the first.
 */
export const FileUploadButton = ({
  onAdd,
  onUploadingChange,
  disabled = false,
  label = 'Upload document',
  folder = 'documents',
}: FileUploadButtonProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUploading = (uploading: boolean): void => {
    setBusy(uploading);
    onUploadingChange?.(uploading);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    // Cleared at once so picking the same file again after a failure still fires a change.
    event.target.value = '';
    if (!file || busy) return;
    setError(null);
    setUploading(true);
    try {
      const asset = await uploadToCloudinary(file, folder, {
        register: false,
        profile: 'document',
      });
      const name = file.name.trim().slice(0, NAME_LIMIT) || 'Document';
      await onAdd({ name, file: asset });
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={DOCUMENT_ACCEPT}
        onChange={(event) => void handleFile(event)}
        data-testid="file-upload-input"
      />
      <Button
        variant="outlined"
        startIcon={
          busy ? <CircularProgress size={16} color="inherit" /> : <UploadFileRoundedIcon />
        }
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
      >
        {busy ? 'Uploading…' : label}
      </Button>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.75 }}>
        PDF, Word, Excel, PowerPoint, CSV, text or an image, up to{' '}
        {Math.round(DOCUMENT_MAX_BYTES / 1024 / 1024)} MB.
      </Typography>
      {error && (
        <Typography variant="body2" color="error" role="alert" sx={{ mt: 0.75 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

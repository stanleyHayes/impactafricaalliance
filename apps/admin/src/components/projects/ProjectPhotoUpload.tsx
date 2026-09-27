import type { MediaAsset } from '@iaa/shared';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRef, useState, type DragEvent } from 'react';

import { uploadToCloudinary } from '../../lib/cloudinary';
import { downscaleImage } from '../../lib/downscale-image';
import { UPLOAD_PERMISSION_NOTE, useCanUploadFiles } from '../files/upload-permission';

/** The image profile's limit; bigger photos are shrunk first and only refused if still too big. */
const MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface Progress {
  done: number;
  total: number;
}

export interface ProjectPhotoUploadProps {
  /** Saves one uploaded photo to the project. Awaited before the next upload starts. */
  onUploaded: (image: MediaAsset) => Promise<unknown>;
  /** How many more photos the project can hold. */
  remaining: number;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

const problemWith = (file: File): string | null =>
  PHOTO_TYPES.includes(file.type) ? null : `${file.name} is not a JPG, PNG, WebP or GIF photo.`;

/**
 * Adds photos to a project's evidence, several at a time.
 *
 * Evidence stays with its project: uploads are not added to the media
 * library (`register: false`, plan D7), so a hundred site-visit photos do not
 * bury the pictures the website uses. Each photo is saved to the project as
 * soon as it is uploaded, so a failure part way loses only the ones after it.
 */
export const ProjectPhotoUpload = ({
  onUploaded,
  remaining,
  disabled = false,
  onUploadingChange,
}: ProjectPhotoUploadProps): JSX.Element => {
  const input = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const uploading = progress !== null;
  // Editing the project does not imply media:create, which signing needs.
  const mayUpload = useCanUploadFiles();
  const locked = disabled || uploading || remaining <= 0 || !mayUpload;

  const uploadAll = async (files: File[]): Promise<void> => {
    if (locked || files.length === 0) return;
    const accepted = files.slice(0, remaining);
    const found: string[] =
      files.length > remaining
        ? [
            `Only ${remaining} more ${remaining === 1 ? 'photo fits' : 'photos fit'}; the rest were left out.`,
          ]
        : [];
    setProgress({ done: 0, total: accepted.length });
    onUploadingChange?.(true);
    for (const [index, chosen] of accepted.entries()) {
      const wrongType = problemWith(chosen);
      if (wrongType) {
        found.push(wrongType);
      } else {
        try {
          const file = await downscaleImage(chosen);
          if (file.size > MAX_BYTES)
            throw new Error(`${chosen.name} is still over 5 MB after shrinking.`);
          await onUploaded(await uploadToCloudinary(file, 'projects', { register: false }));
        } catch (cause) {
          found.push(
            cause instanceof Error
              ? `${chosen.name}: ${cause.message}`
              : `${chosen.name} could not be added.`,
          );
        }
      }
      setProgress({ done: index + 1, total: accepted.length });
    }
    setProblems(found);
    setProgress(null);
    onUploadingChange?.(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    void uploadAll(Array.from(event.dataTransfer.files));
  };

  return (
    <Stack spacing={1.5}>
      <Box
        onDragOver={(event) => {
          event.preventDefault();
          if (!locked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={{
          p: { xs: 2.5, md: 3 },
          border: 2,
          borderStyle: 'dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          borderRadius: 3,
          textAlign: 'center',
          bgcolor: (theme) => (dragging ? alpha(theme.palette.primary.main, 0.06) : 'transparent'),
        }}
      >
        <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 36, color: 'text.secondary' }} aria-hidden />
        <Typography sx={{ fontWeight: 650, mt: 1 }}>Add photos of the work</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drop them here or choose them. JPG, PNG, WebP or GIF; large photos are shrunk before
          upload. They stay with this project and are not added to the media library.
        </Typography>
        <Button
          variant="outlined"
          onClick={() => input.current?.click()}
          disabled={locked}
          startIcon={<AddPhotoAlternateOutlinedIcon />}
        >
          {uploading ? 'Uploading…' : 'Choose photos'}
        </Button>
        <input
          ref={input}
          type="file"
          hidden
          multiple
          accept={PHOTO_TYPES.join(',')}
          aria-label="Choose photos to add"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            // Cleared so choosing the same photo again after a failure still fires.
            event.target.value = '';
            void uploadAll(files);
          }}
        />
        {remaining <= 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            This project holds as many photos as it can. Remove one to add another.
          </Typography>
        )}
      </Box>
      {!mayUpload && (
        <Alert severity="info" role="note">
          {UPLOAD_PERMISSION_NOTE}
        </Alert>
      )}
      {progress && (
        <Box role="status" aria-live="polite">
          <Typography variant="body2" sx={{ mb: 0.75 }}>
            Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(progress.done / progress.total) * 100}
            aria-label="Upload progress"
          />
        </Box>
      )}
      {problems.length > 0 && (
        <Alert severity="warning" onClose={() => setProblems([])}>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </Box>
        </Alert>
      )}
    </Stack>
  );
};

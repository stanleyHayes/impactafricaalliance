import {
  acceptedFormatsFor,
  isAcceptedFilename,
  maxFileBytesFor,
  maxFilesFor,
  type AnswerValue,
  type FileAnswer,
  type FormField,
} from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { fileRulesText, formatBytes } from '../answers';
import { uploadFailureMessage } from '../errors';
import { QUIET_BUTTON_SX, VISUALLY_HIDDEN } from '../styles';
import { UploadCancelledError, type UploadHandle } from '../upload';
import { useUploadContext } from '../upload-context';

import { joinIds, type FieldProps } from './field-props';
import { FieldError } from './QuestionFrame';

interface PendingUpload {
  key: string;
  file: File;
  progress: number;
  status: 'uploading' | 'failed';
  message?: string;
}

const fileList = (value: AnswerValue | undefined): FileAnswer[] =>
  Array.isArray(value)
    ? (value as unknown[]).filter(
        (item): item is FileAnswer =>
          typeof item === 'object' && item !== null && 'publicId' in item,
      )
    : [];

interface PickResult {
  accepted: File[];
  problem: string | null;
}

/**
 * The picked files this question can take, and why any were turned away.
 * Checked here, before anything is signed or sent, against the same rules
 * the API applies.
 */
export const checkPickedFiles = (field: FormField, picked: File[], room: number): PickResult => {
  const maxMb = maxFileBytesFor(field) / (1024 * 1024);
  const problems: string[] = [];
  const accepted: File[] = [];
  for (const file of picked) {
    if (!isAcceptedFilename(field, file.name)) {
      problems.push(`"${file.name}" is not a type this question accepts.`);
    } else if (file.size > maxFileBytesFor(field)) {
      problems.push(`"${file.name}" is larger than ${maxMb} MB.`);
    } else if (accepted.length >= room) {
      problems.push(
        room === 0 && accepted.length === 0
          ? 'Remove a file before adding another.'
          : `"${file.name}" was not added: this question takes ${maxFilesFor(field)} at most.`,
      );
    } else {
      accepted.push(file);
    }
  }
  return { accepted, problem: problems.length > 0 ? problems.join(' ') : null };
};

interface FileRowProps {
  name: string;
  detail: ReactNode;
  state: 'done' | 'uploading' | 'failed';
  progress?: number;
  actions: ReactNode;
}

const ROW_ICONS = {
  done: <CheckCircleRoundedIcon aria-hidden="true" sx={{ color: 'primary.dark' }} />,
  uploading: <UploadFileRoundedIcon aria-hidden="true" sx={{ color: 'text.secondary' }} />,
  failed: <ErrorRoundedIcon aria-hidden="true" sx={{ color: 'error.main' }} />,
} as const;

const FileRow = ({ name, detail, state, progress, actions }: FileRowProps): JSX.Element => (
  <Box
    component="li"
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 1.5,
      p: 1.5,
      border: '1.5px solid',
      borderColor: state === 'failed' ? 'error.main' : 'divider',
      borderRadius: 3,
      bgcolor: 'background.paper',
    }}
  >
    {ROW_ICONS[state]}
    <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>
      <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{name}</Typography>
      <Typography
        variant="body2"
        sx={{ color: state === 'failed' ? 'error.main' : 'text.secondary' }}
      >
        {detail}
      </Typography>
      {state === 'uploading' && (
        <LinearProgress
          variant="determinate"
          value={Math.round((progress ?? 0) * 100)}
          aria-label={`Uploading ${name}`}
          sx={{
            mt: 1,
            height: 6,
            borderRadius: 3,
            '@media (prefers-reduced-motion: reduce)': {
              '& .MuiLinearProgress-bar': { transition: 'none' },
            },
          }}
        />
      )}
    </Box>
    <Stack direction="row" spacing={0.5}>
      {actions}
    </Stack>
  </Box>
);

let uploadCounter = 0;
const nextUploadKey = (): string => {
  uploadCounter += 1;
  return `upload-${uploadCounter}`;
};

/**
 * A file question. What it accepts is stated before anyone picks a file.
 * Each file is signed by the API, then sent straight to Cloudinary with real
 * progress; a failed upload can be retried or removed, and Continue waits
 * while any upload is running.
 */
export const FileAnswerField = ({
  field,
  value,
  error,
  ids,
  onChange,
}: FieldProps): JSX.Element => {
  const { uploadFile, setUploadBusy, preview } = useUploadContext();
  const files = fileList(value);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [pickProblem, setPickProblem] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const handles = useRef(new Map<string, UploadHandle>());
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = uploads.some((upload) => upload.status === 'uploading');
  const maxFiles = maxFilesFor(field);
  const room = Math.max(0, maxFiles - files.length - uploads.length);
  const rulesId = `${ids.input}-rules`;
  const pickProblemId = `${ids.input}-pick`;
  // The question's focus target (for a failed Continue or a server refusal)
  // is the add button; once the question is full that button goes, so the
  // first file's own action takes the id and focus still lands somewhere
  // the person can act.
  const firstActionId = (index: number): string | undefined =>
    room === 0 && index === 0 ? ids.input : undefined;

  useEffect(() => {
    setUploadBusy(field.id, busy);
  }, [busy, field.id, setUploadBusy]);

  // Leaving the question stops its uploads and releases Continue.
  useEffect(() => {
    const running = handles.current;
    return () => {
      running.forEach((handle) => handle.abort());
      setUploadBusy(field.id, false);
    };
  }, [field.id, setUploadBusy]);

  const patchUpload = (key: string, changes: Partial<PendingUpload>): void =>
    setUploads((list) => list.map((item) => (item.key === key ? { ...item, ...changes } : item)));

  const dropUpload = (key: string): void =>
    setUploads((list) => list.filter((item) => item.key !== key));

  const start = (file: File, key: string = nextUploadKey()): void => {
    setUploads((list) => [
      ...list.filter((item) => item.key !== key),
      { key, file, progress: 0, status: 'uploading' },
    ]);
    const handle = uploadFile(field, file, (progress) => patchUpload(key, { progress }));
    handles.current.set(key, handle);
    handle.promise.then(
      (answer) => {
        handles.current.delete(key);
        dropUpload(key);
        onChange((previous) => [...fileList(previous), answer]);
        setAnnouncement(`${file.name} uploaded.`);
      },
      (failure: unknown) => {
        handles.current.delete(key);
        if (failure instanceof UploadCancelledError) {
          dropUpload(key);
          setAnnouncement(`${file.name} was not uploaded.`);
          return;
        }
        const message = uploadFailureMessage(failure);
        patchUpload(key, { status: 'failed', message });
        setAnnouncement(`${file.name} did not upload. ${message}`);
      },
    );
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>): void => {
    const picked = Array.from(event.target.files ?? []);
    // Cleared so the same file can be picked again after a failure.
    event.target.value = '';
    const { accepted, problem } = checkPickedFiles(field, picked, room);
    setPickProblem(problem);
    accepted.forEach((file) => start(file));
  };

  const removeFile = (publicId: string, name: string): void => {
    onChange((previous) => fileList(previous).filter((file) => file.publicId !== publicId));
    setAnnouncement(`${name} removed.`);
  };

  const accept = acceptedFormatsFor(field)
    .map((format) => `.${format}`)
    .join(',');

  return (
    <Stack spacing={1.5}>
      <Typography id={rulesId} sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
        {fileRulesText(field)}
        {preview && ' In a preview, files stay on your device.'}
      </Typography>

      {(files.length > 0 || uploads.length > 0) && (
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {files.map((file, index) => (
            <FileRow
              key={file.publicId}
              name={file.name}
              state="done"
              detail={
                file.bytes === undefined ? 'Uploaded' : `Uploaded, ${formatBytes(file.bytes)}`
              }
              actions={
                <Button
                  id={firstActionId(index)}
                  size="small"
                  sx={QUIET_BUTTON_SX}
                  onClick={() => removeFile(file.publicId, file.name)}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </Button>
              }
            />
          ))}
          {uploads.map((upload, index) => (
            <FileRow
              key={upload.key}
              name={upload.file.name}
              state={upload.status}
              progress={upload.progress}
              detail={
                upload.status === 'uploading'
                  ? `Uploading, ${Math.round(upload.progress * 100)}%`
                  : upload.message
              }
              actions={
                upload.status === 'uploading' ? (
                  <Button
                    id={firstActionId(files.length + index)}
                    size="small"
                    sx={QUIET_BUTTON_SX}
                    onClick={() => handles.current.get(upload.key)?.abort()}
                    aria-label={`Cancel uploading ${upload.file.name}`}
                  >
                    Cancel
                  </Button>
                ) : (
                  <>
                    <Button
                      id={firstActionId(files.length + index)}
                      size="small"
                      sx={QUIET_BUTTON_SX}
                      onClick={() => start(upload.file, upload.key)}
                      aria-label={`Retry uploading ${upload.file.name}`}
                    >
                      Retry
                    </Button>
                    <Button
                      size="small"
                      sx={QUIET_BUTTON_SX}
                      onClick={() => dropUpload(upload.key)}
                      aria-label={`Remove ${upload.file.name}`}
                    >
                      Remove
                    </Button>
                  </>
                )
              }
            />
          ))}
        </Stack>
      )}

      {room > 0 && (
        <Box>
          <Button
            id={ids.input}
            variant="outlined"
            size="large"
            startIcon={<UploadFileRoundedIcon />}
            onClick={() => inputRef.current?.click()}
            aria-describedby={joinIds(ids.describedBy, rulesId, pickProblem && pickProblemId)}
            aria-invalid={Boolean(error) || undefined}
            sx={{ minHeight: 52 }}
          >
            {files.length > 0 || uploads.length > 0 ? 'Add another file' : 'Choose a file'}
          </Button>
        </Box>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={onPick}
        data-testid={`${ids.input}-picker`}
      />
      {pickProblem && <FieldError id={pickProblemId} message={pickProblem} />}
      <Box role="status" sx={VISUALLY_HIDDEN}>
        {announcement}
      </Box>
    </Stack>
  );
};

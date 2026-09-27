import {
  formatBytes,
  type FileAttachment,
  type FileAttachmentInput,
  type MediaFolder,
} from '@iaa/shared';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { ActionIcon } from '../data/ActionIcon';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

import { FileUploadButton } from './FileUploadButton';

const FORMAT_ICONS: Record<string, JSX.Element> = {
  pdf: <PictureAsPdfOutlinedIcon />,
  doc: <ArticleOutlinedIcon />,
  docx: <ArticleOutlinedIcon />,
  txt: <ArticleOutlinedIcon />,
  xls: <TableChartOutlinedIcon />,
  xlsx: <TableChartOutlinedIcon />,
  csv: <TableChartOutlinedIcon />,
  ppt: <SlideshowOutlinedIcon />,
  pptx: <SlideshowOutlinedIcon />,
  jpg: <ImageOutlinedIcon />,
  jpeg: <ImageOutlinedIcon />,
  png: <ImageOutlinedIcon />,
  gif: <ImageOutlinedIcon />,
  webp: <ImageOutlinedIcon />,
};

// The stored format when there is one, otherwise the extension of the name.
const formatOf = (item: FileAttachment): string => {
  const source = item.file.format ?? item.file.originalFilename ?? item.name;
  const dot = source.lastIndexOf('.');
  return (dot === -1 ? source : source.slice(dot + 1)).toLowerCase();
};

const addedOn = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const describeFile = (item: FileAttachment): string => {
  const format = formatOf(item);
  const parts = [
    FORMAT_ICONS[format] ? format.toUpperCase() : null,
    item.file.bytes ? formatBytes(item.file.bytes) : null,
    `Added by ${item.addedBy?.name ?? 'a former colleague'} on ${addedOn(item.addedAt)}`,
  ];
  return parts.filter(Boolean).join(' · ');
};

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message ? cause.message : 'The document could not be removed.';

export interface FileAttachmentListProps {
  items: readonly FileAttachment[];
  /** Whether this person may add and remove documents. Without it the list is read-only. */
  canEdit: boolean;
  /** Saves a newly uploaded document to the record. Return the promise to keep the upload locked until it lands. */
  onAdd: (input: FileAttachmentInput) => Promise<unknown> | void;
  /** Removes a document from the record. Return the promise so the confirmation can show progress and errors. */
  onRemove: (id: string) => Promise<unknown> | void;
  /** Locks adding and removing, for instance while the record itself is saving. */
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  /** Most documents the record holds; uploading stops at the limit. */
  max?: number;
  folder?: MediaFolder;
  /** What to say when there are none, such as "No documents attached to this task yet." */
  emptyText?: string;
}

/**
 * Documents attached to a task or a project: what each is, how big, who added
 * it and when, with a link to open it and, for those allowed, a way to add and
 * remove them.
 *
 * Removing asks first and names the document, because the list is often the
 * only place anyone would notice it had gone.
 */
export const FileAttachmentList = ({
  items,
  canEdit,
  onAdd,
  onRemove,
  disabled = false,
  onUploadingChange,
  max,
  folder,
  emptyText = 'No documents yet.',
}: FileAttachmentListProps): JSX.Element => {
  const [removing, setRemoving] = useState<FileAttachment | null>(null);
  const [pending, setPending] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const atLimit = max !== undefined && items.length >= max;

  const closeConfirm = (): void => {
    setRemoving(null);
    setRemoveError(null);
  };

  const confirmRemove = async (): Promise<void> => {
    if (!removing) return;
    setPending(true);
    setRemoveError(null);
    try {
      await onRemove(removing.id);
      setRemoving(null);
    } catch (cause) {
      setRemoveError(messageOf(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <Stack spacing={2}>
      {items.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ p: 2, border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2.5 }}
        >
          {emptyText}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
          {items.map((item) => (
            <Box
              component="li"
              key={item.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '40px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 1.5,
                p: 1.25,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2.5,
                bgcolor: 'background.paper',
              }}
            >
              <Box
                aria-hidden
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  color: 'text.secondary',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                }}
              >
                {FORMAT_ICONS[formatOf(item)] ?? <InsertDriveFileOutlinedIcon />}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Link
                  href={item.file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ display: 'block', fontWeight: 650, color: 'text.primary' }}
                  noWrap
                >
                  {item.name}
                </Link>
                <Typography variant="caption" color="text.secondary" component="p" noWrap>
                  {describeFile(item)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title={`Open ${item.name}`}>
                  <IconButton
                    size="small"
                    component="a"
                    href={item.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${item.name}`}
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {canEdit && (
                  <ActionIcon
                    label={`Remove ${item.name}`}
                    color="error"
                    disabled={disabled}
                    onClick={() => setRemoving(item)}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </ActionIcon>
                )}
              </Stack>
            </Box>
          ))}
        </Box>
      )}

      {canEdit && (
        <Box>
          <FileUploadButton
            onAdd={onAdd}
            onUploadingChange={onUploadingChange}
            disabled={disabled || atLimit}
            folder={folder}
          />
          {atLimit && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This holds the most documents it can ({max}). Remove one to add another.
            </Typography>
          )}
        </Box>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Remove this document?"
        description={
          <>
            <strong>{removing?.name}</strong> will be taken off this list. This cannot be undone.
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        tone="error"
        pending={pending}
        error={removeError}
        onConfirm={() => void confirmRemove()}
        onClose={closeConfirm}
      />
    </Stack>
  );
};

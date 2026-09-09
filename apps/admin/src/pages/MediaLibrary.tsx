import {
  MEDIA_FOLDERS,
  MEDIA_FOLDER_LABELS,
  formatBytes,
  mediaSearchText,
  type MediaFolder,
  type MediaItem,
} from '@iaa/shared';
import CollectionsIcon from '@mui/icons-material/Collections';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { RequirePermission } from '../auth/RequirePermission';
import { useCan } from '../auth/useCan';
import { RecordActions } from '../components/data/RecordActions';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../components/dialogs/DialogShell';
import { MediaUploadField } from '../components/fields/MediaUploadField';
import { PageHeader } from '../components/PageHeader';
import { MediaLibrarySkeleton } from '../components/PageSkeleton';
import { useDeleteMediaItem, useMediaLibrary, useSaveMediaItem } from '../lib/media-library';

const splitTags = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
];

/** Edit what an image is called and how it is found, or remove it. */
const DetailsDialog = ({
  item,
  onClose,
  onNotice,
}: {
  item: MediaItem;
  onClose: () => void;
  onNotice: (message: string) => void;
}): JSX.Element => {
  const can = useCan();
  const save = useSaveMediaItem();
  const remove = useDeleteMediaItem();
  const [altText, setAltText] = useState(item.altText ?? '');
  const [folder, setFolder] = useState<MediaFolder>(item.folder);
  const [tags, setTags] = useState(item.tags.join(', '));
  const [confirming, setConfirming] = useState(false);
  const busy = save.isPending || remove.isPending;
  const fieldsDisabled = !can('update', 'media-library') || busy;

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogHeader
        icon={<CollectionsIcon />}
        eyebrow={MEDIA_FOLDER_LABELS[item.folder]}
        title={item.filename}
        description="Describe the picture so it can be found again, and read aloud correctly."
        onClose={busy ? undefined : onClose}
      />
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            component="img"
            src={item.url}
            alt={item.altText ?? ''}
            sx={{
              width: '100%',
              maxHeight: 320,
              objectFit: 'contain',
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          />
          <Stack direction="row" spacing={2} sx={{ color: 'text.secondary' }}>
            <Typography variant="caption">
              {item.width && item.height ? `${item.width} × ${item.height}` : 'Size unknown'}
            </Typography>
            {item.bytes ? (
              <Typography variant="caption">{formatBytes(item.bytes)}</Typography>
            ) : null}
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
            >
              Open original <OpenInNewIcon sx={{ fontSize: 13 }} />
            </Link>
          </Stack>

          <TextField
            disabled={fieldsDisabled}
            label="Description (alt text)"
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            helperText="What is in the picture. Read aloud to people using a screen reader."
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            disabled={fieldsDisabled}
            select
            label="Shelf"
            value={folder}
            onChange={(event) => setFolder(event.target.value as MediaFolder)}
            fullWidth
          >
            {MEDIA_FOLDERS.map((value) => (
              <MenuItem key={value} value={value}>
                {MEDIA_FOLDER_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            disabled={fieldsDisabled}
            label="Tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            helperText="Comma separated. Tags are searched alongside the file name."
            fullWidth
          />

          {confirming ? (
            <Alert
              severity="warning"
              action={
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setConfirming(false)} disabled={busy}>
                    Keep
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() =>
                      remove.mutate(item.id, {
                        onSuccess: () => {
                          onNotice('Removed from the library.');
                          onClose();
                        },
                        onError: () => onNotice('That image could not be removed.'),
                      })
                    }
                  >
                    Remove
                  </Button>
                </Stack>
              }
            >
              This only removes the catalogue entry. Anywhere already using this picture keeps it.
            </Alert>
          ) : null}
          {save.isError && <Alert severity="error">Those details could not be saved.</Alert>}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <RequirePermission resource="media-library" action="delete">
          <Button
            color="error"
            startIcon={<DeleteOutlineIcon />}
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        </RequirePermission>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <RequirePermission resource="media-library" action="update">
          <Button
            variant="contained"
            disabled={busy}
            onClick={() =>
              save.mutate(
                {
                  id: item.id,
                  body: { altText: altText.trim(), folder, tags: splitTags(tags) },
                },
                {
                  onSuccess: () => {
                    onNotice('Details saved.');
                    onClose();
                  },
                },
              )
            }
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </RequirePermission>
      </DialogFooter>
    </Dialog>
  );
};

/**
 * Everything uploaded through the dashboard, in one place.
 *
 * The library is filled as a side effect of ordinary work — every image field
 * registers its upload here — so it needs no separate discipline to stay
 * useful. Uploading from this page is for photography you want available
 * before you have decided where it goes.
 */
const MediaLibraryPage = (): JSX.Element => {
  const { data, isLoading, isError, refetch } = useMediaLibrary();
  const [query, setQuery] = useState('');
  const [shelf, setShelf] = useState('all');
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [notice, setNotice] = useState('');

  const all = useMemo(() => data?.items ?? [], [data]);
  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all.filter((item) => {
      const onShelf = shelf === 'all' || item.folder === shelf;
      return onShelf && (!needle || mediaSearchText(item).includes(needle));
    });
  }, [all, query, shelf]);

  const header = (
    <PageHeader
      icon={<CollectionsIcon />}
      title="Media library"
      description="Every image uploaded from the dashboard, ready to reuse anywhere."
    />
  );

  if (isLoading) {
    return (
      <Box>
        {header}
        <MediaLibrarySkeleton />
      </Box>
    );
  }

  return (
    <Box>
      {header}

      {isError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button onClick={() => void refetch()}>Retry</Button>}
        >
          The media library could not be loaded.
        </Alert>
      )}

      <Box
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <RequirePermission resource="media" action="create">
          <MediaUploadField
            label="Add to the library"
            accept="image/*"
            preview
            folder={shelf === 'all' ? 'site' : (shelf as MediaFolder)}
            value={undefined}
            onChange={() => {
              void refetch();
              setNotice('Added to the library.');
            }}
          />
        </RequirePermission>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems="center"
      >
        <TextField
          size="small"
          fullWidth
          value={query}
          placeholder="Search by file name, description or tag"
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {items.length} of {all.length}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
        {['all', ...MEDIA_FOLDERS].map((value) => (
          <Chip
            key={value}
            size="small"
            clickable
            label={value === 'all' ? 'All' : MEDIA_FOLDER_LABELS[value as MediaFolder]}
            color={shelf === value ? 'primary' : 'default'}
            variant={shelf === value ? 'filled' : 'outlined'}
            onClick={() => setShelf(value)}
          />
        ))}
      </Stack>

      {items.length === 0 ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 8, color: 'text.secondary' }}>
          <CollectionsIcon sx={{ fontSize: 46 }} />
          <Typography sx={{ fontWeight: 700 }}>
            {all.length ? 'Nothing matches that search.' : 'No images yet.'}
          </Typography>
          <Typography variant="body2">
            {all.length
              ? 'Try another word, or a different shelf.'
              : 'Upload one above, or add an image anywhere in the dashboard — it will appear here.'}
          </Typography>
        </Stack>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {items.map((item) => (
            <Box
              key={item.id}
              component="article"
              sx={{
                p: 0,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                // A native button does not inherit the page's colour — the
                // browser applies its own `buttontext`, which is black — so
                // every Typography inside rendered black on the dark card.
                color: 'text.primary',
                cursor: 'pointer',
                textAlign: 'left',
                transition: (theme) => theme.transitions.create(['border-color', 'transform']),
                '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
              }}
            >
              <Box sx={{ aspectRatio: '4 / 3', bgcolor: 'action.hover' }}>
                <Box
                  component="img"
                  src={item.url}
                  alt={item.altText ?? ''}
                  loading="lazy"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </Box>
              <Box sx={{ p: 1.25, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.filename}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.altText ? item.altText.slice(0, 40) : MEDIA_FOLDER_LABELS[item.folder]}
                </Typography>
                <RecordActions
                  record={item as unknown as Record<string, unknown>}
                  resource="media-library"
                  queryKey="resource"
                  endpoint="/admin/media-library"
                  onView={() => setEditing(item)}
                  onEdit={() => setEditing(item)}
                  deletable
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {editing && (
        <DetailsDialog item={editing} onClose={() => setEditing(null)} onNotice={setNotice} />
      )}
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3000}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
  );
};

export default MediaLibraryPage;

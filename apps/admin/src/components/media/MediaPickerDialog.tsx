import {
  MEDIA_FOLDERS,
  MEDIA_FOLDER_LABELS,
  formatBytes,
  mediaSearchText,
  type MediaAsset,
  type MediaItem,
} from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { useMediaLibrary } from '../../lib/media-library';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';

/** The library entry, reduced to what a content field actually stores. */
export const assetFromMediaItem = (item: MediaItem): MediaAsset => ({
  url: item.url,
  publicId: item.publicId,
  ...(item.width ? { width: item.width } : {}),
  ...(item.height ? { height: item.height } : {}),
  ...(item.altText ? { alt: item.altText } : {}),
});

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  /** Pre-selects a shelf, since most fields belong to one. */
  folder?: string;
}

/**
 * Choose a picture that has already been uploaded.
 *
 * Without this, using the same photograph in two places meant uploading it
 * twice — two Cloudinary copies of one image, and no way to tell later that
 * they were the same picture.
 */
export const MediaPickerDialog = ({
  open,
  onClose,
  onSelect,
  folder,
}: MediaPickerDialogProps): JSX.Element => {
  // Only fetch once the dialog is actually opened; most sessions never open it.
  const { data, isLoading, isError, refetch } = useMediaLibrary(open);
  const [query, setQuery] = useState('');
  const [shelf, setShelf] = useState<string>(folder ?? 'all');

  const items = useMemo(() => {
    const all = data?.items ?? [];
    const needle = query.trim().toLowerCase();
    return all.filter((item) => {
      const onShelf = shelf === 'all' || item.folder === shelf;
      return onShelf && (!needle || mediaSearchText(item).includes(needle));
    });
  }, [data, query, shelf]);

  const choose = (item: MediaItem): void => {
    onSelect(assetFromMediaItem(item));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogHeader
        icon={<CollectionsOutlinedIcon />}
        eyebrow="Reuse an image"
        title="Media library"
        description="Pick a picture you have already uploaded."
        onClose={onClose}
      />
      <DialogContent dividers>
        <Stack spacing={2}>
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
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {['all', ...MEDIA_FOLDERS].map((value) => (
              <Chip
                key={value}
                size="small"
                clickable
                label={value === 'all' ? 'All' : MEDIA_FOLDER_LABELS[value as never]}
                color={shelf === value ? 'primary' : 'default'}
                variant={shelf === value ? 'filled' : 'outlined'}
                onClick={() => setShelf(value)}
              />
            ))}
          </Stack>

          {isLoading && (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {isError && (
            <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>
              The media library could not be loaded.
            </Alert>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <Stack alignItems="center" spacing={1} sx={{ py: 6, color: 'text.secondary' }}>
              <CollectionsOutlinedIcon sx={{ fontSize: 40 }} />
              <Typography sx={{ fontWeight: 700 }}>
                {data?.items?.length ? 'Nothing matches that search.' : 'The library is empty.'}
              </Typography>
              <Typography variant="body2">
                {data?.items?.length
                  ? 'Try another word, or a different shelf.'
                  : 'Every image you upload from the dashboard appears here for reuse.'}
              </Typography>
            </Stack>
          )}

          {items.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: 1.5,
              }}
            >
              {items.map((item) => (
                <Box
                  key={item.id}
                  component="button"
                  type="button"
                  onClick={() => choose(item)}
                  sx={{
                    p: 0,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: (theme) => theme.transitions.create(['border-color', 'transform']),
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      '& .pick': { opacity: 1 },
                    },
                  }}
                >
                  <Box sx={{ position: 'relative', aspectRatio: '4 / 3', bgcolor: 'action.hover' }}>
                    <Box
                      component="img"
                      src={item.url}
                      alt={item.altText ?? ''}
                      loading="lazy"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <Box
                      className="pick"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        opacity: 0,
                        transition: 'opacity .2s',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.25),
                        color: 'common.white',
                      }}
                    >
                      <CheckCircleRoundedIcon />
                    </Box>
                  </Box>
                  <Box sx={{ p: 1, minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 700,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.width && item.height ? `${item.width}×${item.height}` : item.folder}
                      {item.bytes ? ` · ${formatBytes(item.bytes)}` : ''}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
      </DialogFooter>
    </Dialog>
  );
};

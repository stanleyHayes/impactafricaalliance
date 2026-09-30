import { SITE_IMAGE_SLOTS, siteImageDependants, type SiteImage } from '@iaa/shared';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMemo, useState } from 'react';

import { useCan } from '../auth/useCan';
import { DetailSection } from '../components/detail/DetailSection';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { OptionSelect } from '../components/fields/OptionSelect';
import { PageHeader } from '../components/PageHeader';
import { ElsewhereImages } from '../components/site-images/ElsewhereImages';
import { ReplaceSiteImageDialog } from '../components/site-images/ReplaceSiteImageDialog';
import { SiteImageAltDialog } from '../components/site-images/SiteImageAltDialog';
import {
  SiteImageSlotCard,
  type SlotPermissions,
} from '../components/site-images/SiteImageSlotCard';
import { SLOT_GRID_SX, SiteImagesSkeleton } from '../components/site-images/SiteImagesSkeleton';
import { pageGuides } from '../lib/page-guides';
import {
  buildSiteImageBoard,
  countReplaced,
  filterBoard,
  publicSiteUrl,
  type BoardFilters,
  type PageSettingHero,
  type SlotGroup,
  type SlotView,
  type StatusFilter,
} from '../lib/site-images';
import { useResourceList, useSaveResource } from '../resources/hooks';

const NO_FILTERS: BoardFilters = { query: '', status: 'all', page: 'all' };

const pageLabelOf = (board: readonly SlotGroup[], view: SlotView): string =>
  board.find((group) => group.page.key === view.slot.page)?.page.label ?? 'Site images';

/** "3 pictures · 1 replaced", the line under each page's heading. */
const groupSummary = (group: SlotGroup): string => {
  const replaced = group.slots.filter((view) => view.status === 'replaced').length;
  const count = `${group.slots.length} ${group.slots.length === 1 ? 'picture' : 'pictures'}`;
  return replaced ? `${count} · ${replaced} replaced` : `${count} · all default`;
};

interface ToolbarProps {
  board: readonly SlotGroup[];
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}

/** Search, a page to jump to, and whether to show only what has been replaced. */
const Toolbar = ({ board, filters, onChange }: ToolbarProps): JSX.Element => {
  const replaced = countReplaced(board);
  const statuses: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: `All (${SITE_IMAGE_SLOTS.length})` },
    { value: 'replaced', label: `Replaced (${replaced})` },
    { value: 'original', label: `Default (${SITE_IMAGE_SLOTS.length - replaced})` },
  ];
  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField
          size="small"
          fullWidth
          value={filters.query}
          placeholder="Search pages and pictures"
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          slotProps={{
            htmlInput: { 'aria-label': 'Search site images' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <OptionSelect
          size="small"
          label="Page"
          value={filters.page}
          onChange={(page) => onChange({ ...filters, page })}
          sx={{ minWidth: { md: 240 } }}
          options={[
            { value: 'all', label: 'All pages' },
            ...board.map((group) => ({
              value: group.page.key,
              label: group.page.label,
              description: groupSummary(group),
            })),
          ]}
        />
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" aria-label="Show">
        {statuses.map((status) => (
          <Chip
            key={status.value}
            size="small"
            clickable
            label={status.label}
            color={filters.status === status.value ? 'primary' : 'default'}
            variant={filters.status === status.value ? 'filled' : 'outlined'}
            aria-pressed={filters.status === status.value}
            onClick={() => onChange({ ...filters, status: status.value })}
          />
        ))}
      </Stack>
    </Stack>
  );
};

interface ResetSlotDialogProps {
  /** The slot to reset; the dialog is closed while this is null. */
  view: SlotView | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * Asks before a slot goes back to its default, naming it and anything that
 * shares it. Resetting switches the upload off rather than deleting it, so
 * it needs no more permission than replacing did, and can be undone.
 */
const ResetSlotDialog = ({ view, onClose, onDone }: ResetSlotDialogProps): JSX.Element => {
  const reset = useSaveResource('site-images');
  const label = view?.slot.label ?? 'this picture';
  const shared = view ? siteImageDependants(view.slot.key).length > 0 : false;
  const close = (): void => {
    reset.reset();
    onClose();
  };
  const confirm = (): void => {
    if (!view?.record) return;
    reset.mutate(
      { id: view.record.id, body: { isActive: false } },
      {
        onSuccess: () => {
          reset.reset();
          onDone(`${label} is back to its default picture.`);
        },
      },
    );
  };
  return (
    <ConfirmDialog
      open={view !== null}
      eyebrow="Site images"
      icon={<RestartAltRoundedIcon />}
      title={`Reset ${label} to default?`}
      description={
        <>
          The site goes back to the picture it shipped with for <strong>{label}</strong>
          {shared ? ', and so do the banners that share it' : ''}. Your upload stays in the media
          library, so you can choose it again later.
        </>
      }
      confirmLabel="Reset to default"
      pendingLabel="Resetting…"
      pending={reset.isPending}
      error={reset.error ? reset.error.message : null}
      onConfirm={confirm}
      onClose={close}
    />
  );
};

/**
 * Every picture the public site shows in a fixed place, page by page, with
 * what it shows now and a way to change it.
 *
 * This replaced a list of uploads, which showed only the slots somebody had
 * already filled: the other twenty-odd places, still on the pictures the site
 * shipped with, were invisible, so nobody could tell they were replaceable.
 * The slot catalogue is shared with the site, so every place it draws is
 * listed here beside the picture it falls back to.
 */
const SiteImagesPage = (): JSX.Element => {
  const can = useCan();
  const list = useResourceList('site-images');
  const pageSettings = useResourceList('page-settings', { enabled: can('read', 'page-settings') });
  const [filters, setFilters] = useState<BoardFilters>(NO_FILTERS);
  const [replacing, setReplacing] = useState<SlotView | null>(null);
  const [describing, setDescribing] = useState<SlotView | null>(null);
  const [resetting, setResetting] = useState<SlotView | null>(null);
  const [notice, setNotice] = useState('');

  const board = useMemo(
    () =>
      buildSiteImageBoard(
        (list.data?.items ?? []) as unknown as SiteImage[],
        (pageSettings.data?.items ?? []) as PageSettingHero[],
      ),
    [list.data, pageSettings.data],
  );
  const visible = filterBoard(board, filters);
  const permissions: SlotPermissions = {
    create: can('create', 'site-images'),
    update: can('update', 'site-images'),
  };

  const saved = (message: string): void => {
    setReplacing(null);
    setDescribing(null);
    setNotice(message);
  };

  const header = (
    <PageHeader
      icon={<WallpaperIcon />}
      title="Site images"
      description="Every banner and picture the public site shows in a fixed place, page by page. Replace one and visitors see it on their next visit; reset it and the default comes back."
      count={SITE_IMAGE_SLOTS.length}
      help={pageGuides['site-images']}
    />
  );

  if (list.isLoading) {
    return (
      <Box>
        {header}
        <SiteImagesSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      {header}

      {!permissions.create && !permissions.update && (
        // A standing note, not news: "note" rather than Alert's own "alert" role.
        <Alert severity="info" role="note" sx={{ mb: 3, borderRadius: 2 }}>
          You can see every picture here. Replacing one needs Site images access, which an
          administrator can grant under Users.
        </Alert>
      )}

      {list.isError ? (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={<Button onClick={() => void list.refetch()}>Retry</Button>}
        >
          The site images could not be loaded, so it is not clear which pictures have been replaced.{' '}
          {list.error.message}
        </Alert>
      ) : (
        <>
          <Toolbar board={board} filters={filters} onChange={setFilters} />
          {visible.length === 0 ? (
            <EmptyState
              icon={<WallpaperIcon />}
              title="No pictures match"
              description="Try another word, or show every page and every picture."
              primaryAction={{
                label: 'Clear filters',
                onClick: () => setFilters(NO_FILTERS),
                icon: <FilterAltOffOutlinedIcon />,
                variant: 'outlined',
              }}
            />
          ) : (
            <Stack spacing={3}>
              {visible.map((group) => (
                <DetailSection
                  key={group.page.key}
                  id={`page-${group.page.key}`}
                  title={group.page.label}
                  icon={<WallpaperIcon />}
                  description={groupSummary(
                    board.find((entry) => entry.page.key === group.page.key) ?? group,
                  )}
                  action={
                    <Link
                      href={publicSiteUrl(group.page.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                    >
                      Open page <OpenInNewIcon sx={{ fontSize: 15 }} />
                    </Link>
                  }
                >
                  <Box sx={SLOT_GRID_SX}>
                    {group.slots.map((view) => (
                      <SiteImageSlotCard
                        key={view.slot.key}
                        view={view}
                        can={permissions}
                        onReplace={setReplacing}
                        onEditAlt={setDescribing}
                        onReset={setResetting}
                      />
                    ))}
                  </Box>
                </DetailSection>
              ))}
            </Stack>
          )}
        </>
      )}

      <Box sx={{ mt: 3 }}>
        <ElsewhereImages />
      </Box>

      {replacing && (
        <ReplaceSiteImageDialog
          view={replacing}
          pageLabel={pageLabelOf(board, replacing)}
          onClose={() => setReplacing(null)}
          onSaved={saved}
        />
      )}
      {describing?.record && (
        <SiteImageAltDialog
          view={{ ...describing, record: describing.record }}
          pageLabel={pageLabelOf(board, describing)}
          onClose={() => setDescribing(null)}
          onSaved={saved}
        />
      )}
      <ResetSlotDialog
        view={resetting}
        onClose={() => setResetting(null)}
        onDone={(message) => {
          setResetting(null);
          setNotice(message);
        }}
      />
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
  );
};

export default SiteImagesPage;

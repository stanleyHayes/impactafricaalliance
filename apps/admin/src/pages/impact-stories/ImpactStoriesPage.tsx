import type { ImpactStoryListItem, ImpactStoryView, Paginated, ProjectRef } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useHasPermission } from '../../auth/useCan';
import {
  OutOfRangePage,
  ServerPagination,
  usePageParam,
} from '../../components/data/ServerPagination';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { OptionSelect } from '../../components/fields/OptionSelect';
import { ProjectPicker } from '../../components/impact-stories/ProjectPicker';
import { updatedLabel } from '../../components/impact-stories/story-format';
import { StoryStatusChip } from '../../components/impact-stories/StoryStatusChip';
import { useStoryPreview } from '../../components/impact-stories/useStoryPreview';
import {
  storyErrorText,
  useStoryStatusFlow,
} from '../../components/impact-stories/useStoryStatusFlow';
import { PageHeader } from '../../components/PageHeader';
import {
  storyStatusActions,
  useDeleteImpactStory,
  useImpactStories,
} from '../../lib/impact-stories';
import { pageGuides } from '../../lib/page-guides';
import { PROGRAMME_OPTIONS, withAnyOption } from '../../lib/select-options';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { VISUALLY_HIDDEN } from '../../lib/visually-hidden';
import { skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

export interface ImpactStoriesPageProps {
  /**
   * Which tab the address opened: `/impact-stories` is Drafts and
   * `/impact-stories/published` is Published. The route passes it, so the
   * tab is part of the address and survives a reload.
   */
  view?: 'drafts' | 'published';
}

/**
 * The "all programmes" row of the filter. A real value rather than '', as on
 * the projects list, because a select showing an empty value keeps its label
 * inside the field, on top of the "All programmes" text; the address still
 * holds nothing for it.
 */
const ANY_PROGRAMME = 'any';

const PROGRAMME_FILTER = withAnyOption(
  PROGRAMME_OPTIONS,
  'All programmes',
  'Stories from every programme area.',
).map((option) => (option.value === '' ? { ...option, value: ANY_PROGRAMME } : option));

/** The filters held in the address, so a filtered list can be shared and reloaded. */
const useStoryFilters = (): {
  q: string;
  programme: string;
  projectId: string;
  includeArchived: boolean;
  set: (key: 'q' | 'programme' | 'project' | 'archived', value: string) => void;
  clear: () => void;
} => {
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string): void =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        // A new filter starts from the first page of its results.
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  return {
    q: params.get('q') ?? '',
    programme: params.get('programme') ?? '',
    projectId: params.get('project') ?? '',
    includeArchived: params.get('archived') === '1',
    set,
    clear: () => setParams(new URLSearchParams(), { replace: true }),
  };
};

const apiView = (view: 'drafts' | 'published', includeArchived: boolean): ImpactStoryView => {
  if (view === 'drafts') return 'drafts';
  return includeArchived ? 'published-and-archived' : 'published';
};

/**
 * A loading card's outline. Classic draws only the border; the other skins
 * draw their whole card, so the grid does not change material when the
 * stories arrive.
 */
const CARD_SKELETON_SX = skinned(
  { border: 1, borderColor: 'divider', borderRadius: 3, overflow: 'hidden' },
  surfaceSx.card,
);

/**
 * Where a story without a cover shows its picture. Classic greys it with the
 * hover tint; the other skins sink it into the card as a well.
 */
const NO_COVER_SX = skinned(
  { bgcolor: 'action.hover' },
  { bgcolor: tokenVar('surfaceInsetBg'), boxShadow: tokenVar('surfaceInsetShadow') },
);

const CardSkeleton = (): JSX.Element => (
  <Box sx={CARD_SKELETON_SX}>
    <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
    <Box sx={{ p: 2 }}>
      <Skeleton variant="rounded" width={86} height={22} sx={{ borderRadius: 99, mb: 1.5 }} />
      <Skeleton width="80%" sx={{ fontSize: '1.1rem' }} />
      <Skeleton width="95%" />
      <Skeleton width="60%" />
      <Skeleton width="40%" sx={{ mt: 1.5, fontSize: '0.8rem' }} />
    </Box>
  </Box>
);

const GRID_SX = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
} as const;

/** Edit, preview, status moves and delete for one story, as the role allows. */
const StoryCardMenu = ({ story }: { story: ImpactStoryListItem }): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canUpdate = useHasPermission('update', 'impact-stories');
  const canDelete = useHasPermission('delete', 'impact-stories');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuId = useId();
  const flow = useStoryStatusFlow(story);
  const preview = useStoryPreview();
  const remove = useDeleteImpactStory();
  // A live story is changed by administrators only; others unpublish first.
  const mayEdit = canUpdate && (story.status !== 'published' || isAdmin);
  const actions = canUpdate ? storyStatusActions(story.status, { isAdmin }) : [];
  const mayDelete = canDelete && !story.publishedAt;
  const close = (): void => setAnchor(null);

  return (
    <>
      <IconButton
        aria-label={`Actions for ${story.title}`}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        size="small"
      >
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {mayEdit && (
          <MenuItem
            onClick={() => {
              close();
              void navigate(`/impact-stories/${story.id}/edit`);
            }}
          >
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          disabled={preview.pending}
          onClick={() => {
            close();
            preview.open(story.id);
          }}
        >
          <ListItemIcon>
            <OpenInNewRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview on the website</ListItemText>
        </MenuItem>
        {actions.length > 0 && <Divider />}
        {actions.map((action) => (
          <MenuItem
            key={action.to}
            disabled={flow.pending}
            onClick={() => {
              close();
              flow.request(action);
            }}
          >
            <ListItemIcon>
              <SyncAltRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
        {mayDelete && <Divider />}
        {mayDelete && (
          <MenuItem
            onClick={() => {
              close();
              setConfirmDelete(true);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
      {flow.dialog}
      <ConfirmDialog
        open={confirmDelete}
        eyebrow="Impact story"
        title="Delete this draft?"
        description={
          <>
            <strong>{story.title}</strong> will be deleted with all its blocks. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        tone="error"
        pending={remove.isPending}
        error={remove.error ? storyErrorText(remove.error) : null}
        onConfirm={() => remove.mutate(story.id, { onSuccess: () => setConfirmDelete(false) })}
        onClose={() => {
          if (remove.isPending) return;
          setConfirmDelete(false);
          remove.reset();
        }}
      />
      <Snackbar
        open={Boolean(flow.error ?? preview.error)}
        autoHideDuration={8000}
        onClose={() => {
          flow.clearError();
          preview.clearError();
        }}
      >
        <Alert
          severity="error"
          onClose={() => {
            flow.clearError();
            preview.clearError();
          }}
        >
          {flow.error ?? preview.error}
        </Alert>
      </Snackbar>
    </>
  );
};

const StoryCard = ({ story }: { story: ImpactStoryListItem }): JSX.Element => {
  const canUpdate = useHasPermission('update', 'impact-stories');
  return (
    <Box
      component="article"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        borderRadius: 3,
        overflow: 'hidden',
        // The skin's card: in Classic, paper with a divider border.
        ...surfaceSx.card,
      }}
    >
      {story.cover ? (
        <Box
          component="img"
          src={story.cover.url}
          alt=""
          loading="lazy"
          sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Box
          aria-hidden
          sx={[
            {
              display: 'grid',
              placeItems: 'center',
              aspectRatio: '16 / 9',
              color: 'text.secondary',
            },
            NO_COVER_SX,
          ]}
        >
          <ImageOutlinedIcon />
        </Box>
      )}
      <Stack spacing={1} sx={{ p: 2, flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <StoryStatusChip status={story.status} />
          <StoryCardMenu story={story} />
        </Stack>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
          {canUpdate ? (
            <Link component={RouterLink} to={`/impact-stories/${story.id}/edit`} color="inherit">
              {story.title}
            </Link>
          ) : (
            story.title
          )}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story.excerpt}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {story.project && (
          <Typography variant="caption" color="text.secondary" noWrap>
            Project: {story.project.title}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {updatedLabel(story.updatedAt)}
          {story.updatedBy ? ` by ${story.updatedBy.name}` : ''}
        </Typography>
      </Stack>
    </Box>
  );
};

const emptyCopy = (
  view: 'drafts' | 'published',
  filtered: boolean,
): { title: string; description: string } => {
  if (filtered) {
    return {
      title: 'No stories match',
      description:
        'Nothing in this tab matches the search and filters. Try other words, or clear the filters.',
    };
  }
  return view === 'drafts'
    ? {
        title: 'No drafts',
        description:
          'Stories being written and stories waiting for review appear here. Start one with New story, or from a project’s Impact tab.',
      }
    : {
        title: 'Nothing published yet',
        description: 'Stories appear here once an administrator publishes them on the website.',
      };
};

/** The chosen project, named from the loaded stories after a reload leaves only its id. */
const selectedProjectFor = (
  chosen: ProjectRef | null,
  projectId: string,
  items: readonly ImpactStoryListItem[],
): ProjectRef | null => {
  if (chosen) return chosen;
  if (!projectId) return null;
  const named = items.find((story) => story.project?.id === projectId)?.project;
  return named ?? { id: projectId, title: 'Selected project', slug: '' };
};

interface StoriesResultsProps {
  stories: UseQueryResult<Paginated<ImpactStoryListItem>>;
  view: 'drafts' | 'published';
  filtered: boolean;
  onClearFilters: () => void;
}

/** The grid, or what stands in for it: a skeleton, an error with Retry, or an empty state. */
const StoriesResults = ({
  stories,
  view,
  filtered,
  onClearFilters,
}: StoriesResultsProps): JSX.Element | null => {
  const navigate = useNavigate();
  const canCreate = useHasPermission('create', 'impact-stories');
  if (stories.isPending) {
    return (
      <Box sx={GRID_SX} role="status" aria-label="Loading stories">
        {Array.from({ length: 6 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </Box>
    );
  }
  if (stories.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void stories.refetch()}>
            Retry
          </Button>
        }
      >
        {stories.error.message || 'The stories could not be loaded.'}
      </Alert>
    );
  }
  const items = stories.data.items;
  // Past the last page: publishing or deleting the last story on it moves it away.
  if (items.length === 0 && stories.data.total > 0) {
    return (
      <OutOfRangePage total={stories.data.total} noun="story" plural="stories" compact={false} />
    );
  }
  if (items.length === 0) {
    const empty = emptyCopy(view, filtered);
    const newStory = canCreate
      ? {
          label: 'New story',
          icon: <AddRoundedIcon />,
          onClick: () => {
            void navigate('/impact-stories/new');
          },
        }
      : undefined;
    return (
      <EmptyState
        icon={<AutoStoriesOutlinedIcon />}
        title={empty.title}
        description={empty.description}
        primaryAction={filtered ? { label: 'Clear filters', onClick: onClearFilters } : newStory}
      />
    );
  }
  return (
    <Box sx={GRID_SX} aria-busy={stories.isFetching}>
      {items.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </Box>
  );
};

/** One tab of the dashboard, with its filters held in the address. */
const StoriesTab = ({ view }: { view: 'drafts' | 'published' }): JSX.Element => {
  const canCreate = useHasPermission('create', 'impact-stories');
  // The project filter searches projects, which needs their permission too.
  const canReadProjects = useHasPermission('read', 'projects');
  const filters = useStoryFilters();
  const page = usePageParam();
  const heading = useRef<HTMLHeadingElement>(null);
  const [search, setSearch] = useState(filters.q);
  const [project, setProject] = useState<ProjectRef | null>(null);
  const debounced = useDebouncedValue(search, 350);
  const { set: setFilter } = filters;
  // The search last written to the address. Only a new settled search is
  // written: comparing with the address instead would put a search back for
  // a moment after "Clear filters", while the debounce still held it.
  const applied = useRef(debounced);

  useEffect(() => {
    if (applied.current === debounced) return;
    applied.current = debounced;
    setFilter('q', debounced.trim());
  }, [debounced, setFilter]);

  const stories = useImpactStories({
    view: apiView(view, filters.includeArchived),
    q: filters.q,
    programme: filters.programme,
    projectId: filters.projectId,
    page,
  });

  return (
    <>
      <PageHeader
        title="Impact stories"
        description="Long-form accounts of what the work achieved, published on the website's Impact pages."
        icon={<HistoryEduIcon />}
        count={stories.data?.total}
        help={pageGuides['impact-stories']}
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              component={RouterLink}
              to="/impact-stories/new"
            >
              New story
            </Button>
          ) : undefined
        }
      />
      <Tabs
        value={view}
        aria-label="Story lists"
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="drafts" label="Drafts" component={RouterLink} to="/impact-stories" />
        <Tab
          value="published"
          label="Published"
          component={RouterLink}
          to="/impact-stories/published"
        />
      </Tabs>
      <Box
        role="search"
        sx={{
          display: 'grid',
          gap: 1.5,
          mb: 2.5,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '2fr 1fr 1.4fr' },
          alignItems: 'start',
        }}
      >
        <TextField
          label="Search stories"
          placeholder="Title or excerpt"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
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
        <OptionSelect
          label="Programme"
          size="small"
          options={PROGRAMME_FILTER}
          value={filters.programme || ANY_PROGRAMME}
          onChange={(value) => filters.set('programme', value === ANY_PROGRAMME ? '' : value)}
        />
        {canReadProjects && (
          <ProjectPicker
            size="small"
            helperText={null}
            value={selectedProjectFor(project, filters.projectId, stories.data?.items ?? [])}
            onChange={(next) => {
              setProject(next);
              filters.set('project', next?.id ?? '');
            }}
          />
        )}
      </Box>
      {view === 'published' && (
        <FormControlLabel
          sx={{ mb: 2 }}
          control={
            <Switch
              checked={filters.includeArchived}
              onChange={(event) => filters.set('archived', event.target.checked ? '1' : '')}
            />
          }
          label="Include archived stories"
        />
      )}
      <Typography ref={heading} tabIndex={-1} component="h2" sx={VISUALLY_HIDDEN}>
        {view === 'drafts' ? 'Drafts' : 'Published stories'}
      </Typography>
      <StoriesResults
        stories={stories}
        view={view}
        filtered={Boolean(filters.q || filters.programme || filters.projectId)}
        onClearFilters={() => {
          setSearch('');
          setProject(null);
          filters.clear();
        }}
      />
      <ServerPagination
        totalPages={stories.data?.totalPages ?? 1}
        focusRef={heading}
        ariaLabel="Story pages"
      />
    </>
  );
};

/**
 * The impact stories dashboard: Drafts (being written or in review) and
 * Published, searched and paged by the API.
 */
const ImpactStoriesPage = ({ view = 'drafts' }: ImpactStoriesPageProps): JSX.Element => (
  // Keyed by tab, so switching tabs starts from that tab's own address (its
  // links carry no filters) rather than keeping the other tab's search box.
  <StoriesTab key={view} view={view} />
);

export default ImpactStoriesPage;

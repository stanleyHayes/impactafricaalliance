import { brandColors, type Paginated, type PublicImpactStoryListItem } from '@iaa/shared';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import EastIcon from '@mui/icons-material/East';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Seo } from '../components/Seo';
import {
  STORIES_PAGE_SIZE,
  useImpactStories,
  useImpactStoryFacets,
  type ImpactStoryFilters,
} from '../features/impact-stories/api';
import { ImpactStoryCard } from '../features/impact-stories/ImpactStoryCard';
import { programmeLabel } from '../features/impact-stories/story-utils';
import { StoryWatermark, WATERMARK_HOST_SX } from '../features/impact-stories/StoryWatermark';

const GRID_SX = {
  display: 'grid',
  gap: 3,
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(2, minmax(0, 1fr))',
  },
  m: 0,
  p: 0,
  listStyle: 'none',
} as const;

const CardSkeleton = (): JSX.Element => (
  <Card variant="outlined" aria-hidden>
    <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 10', height: 'auto' }} />
    <Box sx={{ p: 3 }}>
      <Skeleton width="45%" />
      <Skeleton height={34} sx={{ mt: 1 }} />
      <Skeleton />
      <Skeleton width="80%" />
    </Box>
  </Card>
);

const Message = ({ title, children }: { title: string; children: ReactNode }): JSX.Element => (
  <Box
    sx={{
      width: '100%',
      boxSizing: 'border-box',
      px: { xs: 3, md: 5 },
      py: 7,
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      bgcolor: 'background.paper',
      textAlign: 'center',
    }}
  >
    <Box
      aria-hidden
      sx={{
        display: 'grid',
        width: 64,
        height: 64,
        mx: 'auto',
        mb: 2,
        placeItems: 'center',
        borderRadius: '50%',
        bgcolor: 'action.hover',
        color: 'text.primary',
      }}
    >
      <AutoStoriesRoundedIcon />
    </Box>
    <Typography variant="h5" component="h2">
      {title}
    </Typography>
    <Box sx={{ mt: 1.5, color: 'text.secondary' }}>{children}</Box>
  </Box>
);

/** Distinct values, in the order stories first carry them. */
const distinct = (values: (string | undefined)[]): string[] => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

/**
 * A row of chips for one filter. Shown only when stories carry at least one
 * value, so a visitor is never offered a filter that leads nowhere.
 */
const FilterChips = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}): JSX.Element | null => {
  if (options.length === 0) return null;
  return (
    <Stack
      direction="row"
      role="group"
      aria-label={label}
      useFlexGap
      flexWrap="wrap"
      gap={1}
      alignItems="center"
    >
      <Typography variant="body2" sx={{ fontWeight: 700, mr: 0.5 }}>
        {label}
      </Typography>
      {[{ value: '', label: 'All' }, ...options].map((option) => {
        const selected = option.value === value;
        return (
          <Chip
            key={option.value || 'all'}
            label={option.label}
            clickable
            aria-pressed={selected}
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            onClick={() => onChange(option.value)}
            sx={{ fontWeight: 700 }}
          />
        );
      })}
    </Stack>
  );
};

/** One page of cards, fetched on its own so earlier pages stay put as more load. */
const StoryPageCards = ({
  filters,
  page,
}: {
  filters: ImpactStoryFilters;
  page: number;
}): JSX.Element => {
  const { data } = useImpactStories(filters, page);
  const items: PublicImpactStoryListItem[] = data?.items ?? [];
  return (
    <>
      {items.map((story) => (
        <Box component="li" key={story.id} sx={{ display: 'flex', minWidth: 0 }}>
          <ImpactStoryCard story={story} />
        </Box>
      ))}
    </>
  );
};

/** What stands in for the grid when no story is published, or none matches the filters. */
const NoStories = ({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}): JSX.Element =>
  filtered ? (
    <Message title="No stories match">
      <Typography>No published story has that programme or country yet.</Typography>
      <Button variant="outlined" onClick={onClear} sx={{ mt: 2.5 }}>
        Show all stories
      </Button>
    </Message>
  ) : (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' },
        overflow: 'hidden',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          bgcolor: brandColors.mint,
          color: brandColors.deepForest,
          p: { xs: 3, md: 5 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 4,
          ...WATERMARK_HOST_SX,
        }}
      >
        <StoryWatermark variant="africa" color={brandColors.deepForest} opacity={0.1} size={260} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="overline" sx={{ letterSpacing: 2, fontWeight: 700 }}>
            The story continues
          </Typography>
          <AutoStoriesRoundedIcon sx={{ fontSize: 30 }} />
        </Stack>
        <Typography
          sx={{
            maxWidth: 340,
            fontSize: { xs: '2.4rem', md: '3.6rem' },
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.045em',
            textWrap: 'balance',
          }}
        >
          People.
          <br />
          Progress.
          <br />
          Possibility.
        </Typography>
        <Typography variant="body2" sx={{ maxWidth: 300 }}>
          From our programmes, in the words of the people who shape them.
        </Typography>
      </Box>
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: { xs: 3, sm: 4, md: 6 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.5 }}>
          More to share soon
        </Typography>
        <Typography
          component="h3"
          sx={{
            mt: 2,
            maxWidth: 430,
            fontSize: { xs: '1.8rem', md: '2.5rem' },
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.035em',
          }}
        >
          Stories are on their way
        </Typography>
        <Typography sx={{ mt: 2, maxWidth: 450, color: 'text.secondary', lineHeight: 1.8 }}>
          Stories appear here once they are published. Until then, explore the programmes,
          partnerships and progress behind our work.
        </Typography>
        <Button
          component={RouterLink}
          to="/impact"
          variant="contained"
          endIcon={<EastIcon />}
          sx={{ mt: 3.5 }}
        >
          See our impact
        </Button>
      </Box>
    </Box>
  );

/**
 * Whether the page just asked for is still on its way, and whether there is
 * another after it. The last page shown keeps its previous answer on screen
 * while the next loads, so "loading" is told by the page number it carries.
 */
const pagingState = (
  last: Paginated<PublicImpactStoryListItem> | undefined,
  fetching: boolean,
  pages: number,
): { loadingMore: boolean; more: boolean } => ({
  loadingMore: fetching && last?.page !== pages,
  more: (last?.page ?? 1) < (last?.totalPages ?? 1),
});

/** The grid, paged by "Load more", with its loading, empty and error states. */
const StoryList = ({
  filters,
  onClear,
}: {
  filters: ImpactStoryFilters;
  onClear: () => void;
}): JSX.Element => {
  const [pages, setPages] = useState(1);
  const first = useImpactStories(filters, 1);
  const last = useImpactStories(filters, pages);
  const filtered = Boolean(filters.programme || filters.country);

  if (first.isPending) {
    return (
      <Box sx={GRID_SX} role="status" aria-label="Loading stories">
        {Array.from({ length: 3 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </Box>
    );
  }
  if (first.isError) {
    return (
      <Message title="The stories could not be loaded">
        <Typography>Please try again in a moment.</Typography>
        <Button variant="outlined" onClick={() => void first.refetch()} sx={{ mt: 2.5 }}>
          Try again
        </Button>
      </Message>
    );
  }
  if (first.data.total === 0) {
    return <NoStories filtered={filtered} onClear={onClear} />;
  }

  const total = first.data.total;
  const { loadingMore, more } = pagingState(last.data, last.isFetching, pages);
  // A later page that failed has no answer to page from, so it gets its own retry.
  const failedMore = pages > 1 && last.isError && !loadingMore;
  const shown = Math.min(total, (failedMore ? pages - 1 : pages) * STORIES_PAGE_SIZE);

  return (
    <Stack spacing={4} alignItems="center">
      <Box component="ul" sx={{ ...GRID_SX, width: '100%' }} aria-busy={loadingMore}>
        {Array.from({ length: pages }, (_, index) => (
          <StoryPageCards key={index + 1} filters={filters} page={index + 1} />
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary" role="status" aria-live="polite">
        Showing {shown} of {total} {total === 1 ? 'story' : 'stories'}
      </Typography>
      {failedMore && (
        <Stack spacing={1.5} alignItems="center" role="alert">
          <Typography color="text.secondary">More stories could not be loaded.</Typography>
          <Button variant="outlined" size="large" onClick={() => void last.refetch()}>
            Try again
          </Button>
        </Stack>
      )}
      {!failedMore && (more || loadingMore) && (
        <Button
          variant="outlined"
          size="large"
          onClick={() => setPages((count) => count + 1)}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading…' : 'Load more stories'}
        </Button>
      )}
    </Stack>
  );
};

/**
 * A programme from the address, or '' for one the site does not know: the API
 * refuses unknown programmes, and an old or mistyped link should show every
 * story rather than an error.
 */
const knownProgramme = (value: string | null): string =>
  value && programmeLabel(value) ? value : '';

/** Published impact stories (`/impact/stories`), newest first. */
const ImpactStories = (): JSX.Element => {
  const [params, setParams] = useSearchParams();
  const filters: ImpactStoryFilters = {
    programme: knownProgramme(params.get('programme')),
    country: params.get('country')?.trim().slice(0, 80) ?? '',
  };
  const facets = useImpactStoryFacets();
  const options = useMemo(() => {
    const stories = facets.data?.items ?? [];
    return {
      programmes: distinct(stories.map((story) => story.programme)).map((key) => ({
        value: key,
        label: programmeLabel(key) ?? key,
      })),
      countries: distinct(stories.map((story) => story.country)).map((country) => ({
        value: country,
        label: country,
      })),
    };
  }, [facets.data]);

  const setFilter = (key: 'programme' | 'country', value: string): void =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  return (
    <>
      <Seo
        title="Impact stories"
        description="Stories from Impact Africa Alliance projects: the people, the work and what changed."
      />
      <PageHero
        eyebrow="Our impact"
        title="Impact stories"
        subtitle="The people behind the numbers, and what the work changed for them."
        slot="impact-stories-hero"
      />
      <Box component="section" aria-labelledby="latest-stories-title" sx={{ py: { xs: 5, md: 8 } }}>
        <Container>
          <Stack spacing={{ xs: 4, md: 5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' },
                gap: { xs: 2, md: 6 },
                alignItems: 'start',
              }}
            >
              <Typography
                id="latest-stories-title"
                component="h2"
                sx={{
                  fontSize: { xs: '1.8rem', md: '2.3rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.035em',
                }}
              >
                Stories from the work
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 620, lineHeight: 1.8 }}>
                Every story here is written with the people it is about, from projects we run with
                partners across the continent. Read how a programme started, what it achieved and
                who made it happen.
              </Typography>
            </Box>
            {(options.programmes.length > 0 || options.countries.length > 0) && (
              <Stack spacing={1.5}>
                <FilterChips
                  label="Programme"
                  options={options.programmes}
                  value={filters.programme ?? ''}
                  onChange={(value) => setFilter('programme', value)}
                />
                <FilterChips
                  label="Country"
                  options={options.countries}
                  value={filters.country ?? ''}
                  onChange={(value) => setFilter('country', value)}
                />
              </Stack>
            )}
            <StoryList
              key={`${filters.programme ?? ''}|${filters.country ?? ''}`}
              filters={filters}
              onClear={() => setParams(new URLSearchParams(), { replace: true })}
            />
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default ImpactStories;

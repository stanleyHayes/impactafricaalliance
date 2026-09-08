import { brandColors, type AnalyticsBucket, type AnalyticsSummary } from '@iaa/shared';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import InsightsIcon from '@mui/icons-material/Insights';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { DonutChart } from '../components/charts/DonutChart';
import { TrafficTrend, HourlyActivity } from '../components/charts/TrafficCharts';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { useAnalyticsSummary } from '../lib/admin-hooks';

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

const number = new Intl.NumberFormat('en-GB');

const StatTile = ({
  label,
  value,
  caption,
  icon,
  featured = false,
}: {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  featured?: boolean;
}) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      borderRadius: 3,
      position: 'relative',
      overflow: 'hidden',
      bgcolor: featured ? 'primary.main' : 'background.paper',
      color: featured ? 'primary.contrastText' : 'text.primary',
    }}
  >
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        right: -15,
        bottom: -20,
        opacity: 0.06,
        '& svg': { fontSize: 120 },
      }}
    >
      {icon}
    </Box>
    <CardContent sx={{ p: 2.75, position: 'relative' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{ display: 'grid', placeItems: 'center', '& svg': { fontSize: 21 }, opacity: 0.8 }}
        >
          {icon}
        </Box>
      </Stack>
      <Typography
        sx={{
          my: 1.25,
          fontSize: '2.5rem',
          lineHeight: 1.1,
          fontWeight: 750,
          letterSpacing: '-0.045em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', opacity: 0.75 }}>{caption}</Typography>
    </CardContent>
  </Card>
);

/** A ranked list with a bar behind each row, so proportions read at a glance. */
const RankedList = ({
  title,
  subtitle,
  buckets,
  empty,
  icon,
  totalViews,
}: {
  title: string;
  subtitle: string;
  buckets: AnalyticsBucket[];
  empty: string;
  icon: JSX.Element;
  totalViews: number;
}): JSX.Element => {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 2.75 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
        {buckets.length === 0 ? (
          <EmptyState
            compact
            icon={icon}
            title="Nothing recorded for this breakdown yet"
            description={empty}
          />
        ) : (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
              Views · Share of all page views
            </Typography>
            {buckets.map((bucket, index) => (
              <Box
                key={bucket.key}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '24px minmax(0, 1fr)',
                  gap: 1.5,
                  py: 0.75,
                }}
              >
                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', pt: 0.4 }}>
                  {String(index + 1).padStart(2, '0')}
                </Typography>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography
                      title={bucket.label}
                      variant="body2"
                      noWrap
                      sx={{ fontWeight: 600, minWidth: 0 }}
                    >
                      {bucket.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ flexShrink: 0, pl: 1 }}
                    >
                      {number.format(bucket.count)}{' '}
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          minWidth: 55,
                          textAlign: 'right',
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                        }}
                      >
                        {totalViews > 0 ? Math.round((bucket.count / totalViews) * 100) : 0}%
                      </Box>
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 99,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${totalViews > 0 ? Math.min(100, (bucket.count / totalViews) * 100) : 0}%`,
                        bgcolor: 'primary.main',
                        borderRadius: 99,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

const AnalyticsBody = ({ data }: { data: AnalyticsSummary }): JSX.Element => {
  const perDay = data.days > 0 ? Math.round(data.totalViews / data.days) : 0;
  const busiest = [...data.byHour].sort((a, b) => b.count - a.count)[0];

  return (
    <Stack spacing={3}>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            icon={<VisibilityOutlinedIcon />}
            featured
            label="Page views"
            value={number.format(data.totalViews)}
            caption={`About ${number.format(perDay)} a day`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            icon={<PeopleOutlineRoundedIcon />}
            label="Visitors"
            value={number.format(data.totalVisitors)}
            caption="Counted once a day each"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            icon={<PublicRoundedIcon />}
            label="Countries"
            value={number.format(data.countryCount)}
            caption={
              data.byCountry[0] ? `Most from ${data.byCountry[0].label}` : 'No locations yet'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            icon={<ScheduleRoundedIcon />}
            label="Busiest hour"
            value={busiest && busiest.count > 0 ? busiest.label : '—'}
            caption="UTC, across the window"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={12}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Visits over time
              </Typography>
              <Typography variant="caption" color="text.secondary">
                See how readership changes across the reporting period
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TrafficTrend daily={data.daily} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Time of day
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Find the hours when your audience is most active
              </Typography>
              <Box sx={{ mt: 2 }}>
                <HourlyActivity hours={data.byHour} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <RankedList
            icon={<PublicRoundedIcon />}
            totalViews={data.totalViews}
            title="Countries"
            subtitle="Top 12 countries by page views · shares use all views, including those without a location"
            buckets={data.byCountry}
            empty="Traffic is being recorded, but no country information is available for these visits yet."
          />
        </Grid>
        <Grid size={12}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.75 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Device share
              </Typography>
              <Typography variant="caption" color="text.secondary">
                How your audience reads · share of recorded devices
              </Typography>
              <Box sx={{ mt: 3, maxWidth: 620, mx: 'auto' }}>
                {data.byDevice.length ? (
                  <DonutChart
                    showPercentages
                    responsive
                    size={190}
                    thickness={24}
                    centerLabel="page views"
                    data={data.byDevice.map((bucket, index) => ({
                      label: bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1),
                      value: bucket.count,
                      color:
                        (
                          {
                            desktop: brandColors.mint,
                            mobile: brandColors.gold,
                            tablet: '#82b6ef',
                          } as Record<string, string>
                        )[bucket.key] ?? ['#b49be4', '#82b6ef'][index % 2]!,
                    }))}
                  />
                ) : (
                  <EmptyState
                    compact
                    icon={<DevicesRoundedIcon />}
                    title="No device information yet"
                    description="Device shares will appear when visits include device information."
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <RankedList
            icon={<ArticleOutlinedIcon />}
            totalViews={data.totalViews}
            title="Most read pages"
            subtitle="By page views"
            buckets={data.topPages}
            empty="No visits recorded yet."
          />
        </Grid>
        <Grid size={12}>
          <RankedList
            icon={<LinkRoundedIcon />}
            totalViews={data.totalViews}
            title="Where they came from"
            subtitle="Referring sites, excluding our own pages"
            buckets={data.topReferrers}
            empty="No external referring sites were recorded in this period. Visits may be direct, or the source may not have been shared."
          />
        </Grid>
      </Grid>
    </Stack>
  );
};

const AnalyticsSkeleton = (): JSX.Element => (
  <Stack spacing={3}>
    <Grid container spacing={2.5}>
      {Array.from({ length: 4 }, (_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <Skeleton variant="rounded" height={126} sx={{ borderRadius: 3 }} />
        </Grid>
      ))}
    </Grid>
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <Skeleton variant="rounded" height={340} />
      </Grid>
      <Grid size={12}>
        <Skeleton variant="rounded" height={340} />
      </Grid>
    </Grid>
    <Grid container spacing={2.5}>
      {Array.from({ length: 4 }, (_, index) => (
        <Grid key={index} size={12}>
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
        </Grid>
      ))}
    </Grid>
  </Stack>
);

/**
 * Three outcomes, told apart before rendering: we could not ask, we asked and
 * nobody has visited yet, or there are figures to show. The middle one is not
 * an error, and saying so is the difference between a new site and a broken one.
 */
const AnalyticsContent = ({
  data,
  isError,
  retry,
}: {
  data?: AnalyticsSummary;
  isError: boolean;
  retry: () => void;
}): JSX.Element => {
  if (isError || !data) {
    return (
      <Box>
        <EmptyState
          icon={<InsightsIcon />}
          title="Traffic could not be loaded"
          description="We could not retrieve traffic for this reporting period. Try loading it again."
        />
        <Button onClick={retry}>Try again</Button>
      </Box>
    );
  }
  if (data.totalViews === 0) {
    return (
      <EmptyState
        icon={<InsightsIcon />}
        title="No visits recorded yet"
        description="Views are counted from the moment this went live. Come back once the site has had some traffic."
      />
    );
  }
  return <AnalyticsBody data={data} />;
};

const Analytics = (): JSX.Element => {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, isError, isFetching, refetch } = useAnalyticsSummary(days);

  return (
    <>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          variant="overline"
          sx={{ fontSize: '0.65rem', letterSpacing: 1.8, color: 'text.secondary' }}
        >
          Audience & engagement
        </Typography>
        <PageHeader
          icon={<InsightsIcon />}
          title="Website traffic"
          description="Who is reading the site, from where, and when."
          action={
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <ToggleButtonGroup
                value={days}
                exclusive
                size="small"
                onChange={(_event, next: number | null) => next && setDays(next)}
                aria-label="Reporting window"
              >
                {WINDOWS.map((window) => (
                  <ToggleButton key={window.days} value={window.days}>
                    {window.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Button
                aria-label="Refresh analytics"
                onClick={() => void refetch()}
                disabled={isFetching}
                startIcon={<RefreshRoundedIcon />}
              >
                Refresh
              </Button>
            </Stack>
          }
        />
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          Last {days} days · All times in UTC · Visitors are counted once per day
        </Typography>
      </Box>
      {isLoading && !data ? (
        <AnalyticsSkeleton />
      ) : (
        <AnalyticsContent data={data} isError={isError} retry={() => void refetch()} />
      )}
    </>
  );
};

export default Analytics;

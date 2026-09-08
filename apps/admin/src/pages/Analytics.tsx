import { brandColors, type AnalyticsBucket, type AnalyticsSummary } from '@iaa/shared';
import InsightsIcon from '@mui/icons-material/Insights';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { BarChart } from '../components/charts/BarChart';
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

const StatTile = ({ label, value, caption }: { label: string; value: string; caption: string }) => (
  <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
    <CardContent sx={{ p: 2.75 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {caption}
      </Typography>
    </CardContent>
  </Card>
);

/** A ranked list with a bar behind each row, so proportions read at a glance. */
const RankedList = ({
  title,
  subtitle,
  buckets,
  empty,
}: {
  title: string;
  subtitle: string;
  buckets: AnalyticsBucket[];
  empty: string;
}): JSX.Element => {
  const top = buckets[0]?.count ?? 0;
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: 2.75 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
        {buckets.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {empty}
          </Typography>
        ) : (
          <Stack spacing={1.25} sx={{ mt: 2 }}>
            {buckets.map((bucket) => (
              <Box key={bucket.key}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
                    {bucket.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, pl: 1 }}>
                    {number.format(bucket.count)}
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
                      width: `${top > 0 ? Math.round((bucket.count / top) * 100) : 0}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 99,
                    }}
                  />
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
            label="Page views"
            value={number.format(data.totalViews)}
            caption={`About ${number.format(perDay)} a day`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Visitors"
            value={number.format(data.totalVisitors)}
            caption="Counted once a day each"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Countries"
            value={number.format(data.countryCount)}
            caption={data.byCountry[0] ? `Most from ${data.byCountry[0].label}` : 'No locations yet'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile
            label="Busiest hour"
            value={busiest && busiest.count > 0 ? busiest.label : '—'}
            caption="UTC, across the window"
          />
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.75 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Visits over time
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Page views per day
          </Typography>
          <Box sx={{ mt: 2 }}>
            <BarChart
              height={220}
              color={brandColors.forestGreen}
              data={data.daily.map((day) => ({ label: day.date, value: day.views }))}
              formatLabel={(label) => label.slice(5)}
              formatValue={(value) => number.format(value)}
            />
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.75 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Time of day
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Page views by hour, UTC — useful for deciding when to post
          </Typography>
          <Box sx={{ mt: 2 }}>
            <BarChart
              height={180}
              color={brandColors.gold}
              data={data.byHour.map((hour) => ({ label: hour.label, value: hour.count }))}
              formatLabel={(label) => label.slice(0, 2)}
              formatValue={(value) => number.format(value)}
            />
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <RankedList
            title="Countries"
            subtitle="Where people are reading from"
            buckets={data.byCountry}
            empty="No locations recorded yet."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RankedList
            title="Devices"
            subtitle="What they are reading on"
            buckets={data.byDevice.map((bucket) => ({
              ...bucket,
              label: bucket.label.charAt(0).toUpperCase() + bucket.label.slice(1),
            }))}
            empty="No visits recorded yet."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RankedList
            title="Most read pages"
            subtitle="By page views"
            buckets={data.topPages}
            empty="No visits recorded yet."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RankedList
            title="Where they came from"
            subtitle="Referring sites, excluding our own pages"
            buckets={data.topReferrers}
            empty="Everyone arrived directly or from a link with no referrer."
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
    <Skeleton variant="rounded" height={306} sx={{ borderRadius: 3 }} />
    <Skeleton variant="rounded" height={266} sx={{ borderRadius: 3 }} />
    <Grid container spacing={2.5}>
      {Array.from({ length: 4 }, (_, index) => (
        <Grid key={index} size={{ xs: 12, md: 6 }}>
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
}: {
  data?: AnalyticsSummary;
  isError: boolean;
}): JSX.Element => {
  if (isError || !data) {
    return (
      <EmptyState
        icon={<InsightsIcon />}
        title="Traffic could not be loaded"
        description="The figures are recorded as people visit the site. If this is a fresh deployment there may be nothing to show yet."
      />
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
  const { data, isLoading, isError } = useAnalyticsSummary(days);

  return (
    <>
      <PageHeader
        icon={<InsightsIcon />}
        title="Website traffic"
        description="Who is reading the site, from where, and when."
        action={
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
        }
      />
      {isLoading && !data ? (
        <AnalyticsSkeleton />
      ) : (
        <AnalyticsContent data={data} isError={isError} />
      )}
    </>
  );
};

export default Analytics;

import { brandColors, type ImpactStat, formatStatValue } from '@iaa/shared';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { useImpactStats } from '../lib/content-hooks';
import { getImpactMetricLayout } from '../lib/impact-metric-layout';
import { getStatIcon } from '../lib/stat-icons';

import { AnimatedCounter } from './AnimatedCounter';
import { SectionReveal } from './SectionReveal';

interface ImpactMetricProps {
  stat: ImpactStat;
  featured?: boolean;
  featuredTall?: boolean;
  wide?: boolean;
}

const METRIC_STYLES = {
  featured: {
    minHeight: 156,
    padding: { xs: 3, md: 3.5 },
    borderColor: alpha(brandColors.gold, 0.42),
    borderRadius: 5,
    backgroundColor: brandColors.deepForest,
    backgroundImage: `linear-gradient(145deg, ${alpha(brandColors.gold, 0.12)}, transparent 65%)`,
    decoration: {
      position: 'absolute',
      right: -110,
      bottom: -150,
      width: 330,
      height: 330,
      border: `1px solid ${alpha(brandColors.gold, 0.2)}`,
      borderRadius: '50%',
      boxShadow: `0 0 0 38px ${alpha(brandColors.gold, 0.035)}, 0 0 0 76px ${alpha(brandColors.gold, 0.025)}`,
      content: '""',
    },
    hoverBorderColor: alpha(brandColors.gold, 0.7),
    iconBoxSize: 58,
    iconBorderColor: alpha(brandColors.gold, 0.42),
    iconBorderRadius: 2.5,
    iconBackground: alpha(brandColors.gold, 0.12),
    iconColor: 'secondary.light',
    iconSize: 29,
    counterColor: 'secondary.light',
    labelMaxWidth: 310,
    labelMarginTop: 1.5,
    labelColor: 'common.white',
    labelSize: { xs: '1rem', md: '1.15rem' },
    labelWeight: 650,
  },
  supporting: {
    minHeight: { xs: 124, md: 140 },
    padding: { xs: 2.5, md: 3 },
    borderColor: 'divider',
    borderRadius: 3,
    backgroundColor: 'background.paper',
    backgroundImage: 'none',
    decoration: undefined,
    hoverBorderColor: 'text.secondary',
    iconBoxSize: 46,
    iconBorderColor: 'divider',
    iconBorderRadius: 2,
    iconBackground: 'action.hover',
    iconColor: 'text.primary',
    iconSize: 23,
    counterColor: 'text.primary',
    labelMaxWidth: '100%',
    labelMarginTop: 1,
    labelColor: 'text.secondary',
    labelSize: '0.88rem',
    labelWeight: 550,
  },
} as const;

const getMetricCounterSize = (stat: ImpactStat, featured: boolean): 'display' | 'standard' => {
  // Sized off the rendered (compact) string, not the raw digits, or a
  // billion would still reserve room for thirteen characters.
  const valueLength = formatStatValue(stat.value, stat.suffix).length;
  return featured && valueLength <= 8 ? 'display' : 'standard';
};

const ImpactMetric = ({
  stat,
  featured = false,
  featuredTall = false,
  wide = false,
}: ImpactMetricProps): JSX.Element => {
  const Icon = getStatIcon(stat.key, stat.label);
  const styles = METRIC_STYLES[featured ? 'featured' : 'supporting'];
  const splitContent = wide && !featured;

  return (
    <Box
      component="article"
      aria-label={stat.label}
      sx={{
        position: 'relative',
        display: 'grid',
        minHeight: styles.minHeight,
        height: '100%',
        minWidth: 0,
        gridTemplateColumns: {
          xs: 'auto minmax(0, 1fr)',
          md: featuredTall ? 'minmax(0, 1fr)' : 'auto minmax(0, 1fr)',
        },
        alignItems: 'center',
        alignContent: 'center',
        gap: { xs: 2.5, md: 3 },
        overflow: 'hidden',
        p: styles.padding,
        border: 1,
        borderColor: styles.borderColor,
        borderRadius: styles.borderRadius,
        bgcolor: styles.backgroundColor,
        backgroundImage: styles.backgroundImage,
        backdropFilter: 'blur(8px)',
        transition: 'transform 220ms ease, border-color 220ms ease, background-color 220ms ease',
        '&::after': styles.decoration,
        '&:hover': {
          borderColor: styles.hoverBorderColor,
          transform: 'translateY(-4px)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <Icon
        data-impact-watermark
        aria-hidden="true"
        focusable="false"
        sx={{
          position: 'absolute',
          right: -14,
          bottom: -22,
          fontSize: styles.iconBoxSize * 3.6,
          color: styles.counterColor,
          opacity: featured ? 0.08 : 0.045,
          transform: 'rotate(-12deg)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          width: styles.iconBoxSize,
          height: styles.iconBoxSize,
          flexShrink: 0,
          placeItems: 'center',
          border: 1,
          borderColor: styles.iconBorderColor,
          borderRadius: styles.iconBorderRadius,
          bgcolor: styles.iconBackground,
          color: styles.iconColor,
        }}
      >
        <Icon sx={{ fontSize: styles.iconSize }} aria-hidden />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minWidth: 0,
          display: 'grid',
          gridTemplateColumns: {
            md: splitContent ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          },
          alignItems: 'center',
          columnGap: 3,
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            gridColumn: { md: splitContent ? 2 : 1 },
            textAlign: { md: splitContent ? 'right' : 'left' },
          }}
        >
          <AnimatedCounter
            value={stat.value}
            suffix={stat.suffix}
            color={styles.counterColor}
            size={getMetricCounterSize(stat, featured)}
          />
        </Box>
        <Typography
          sx={{
            maxWidth: styles.labelMaxWidth,
            mt: { xs: styles.labelMarginTop, md: splitContent ? 0 : styles.labelMarginTop },
            gridColumn: { md: 1 },
            gridRow: { md: splitContent ? 1 : 'auto' },
            color: styles.labelColor,
            fontSize: splitContent ? { xs: '0.88rem', md: '1.05rem' } : styles.labelSize,
            fontWeight: styles.labelWeight,
            lineHeight: 1.45,
            overflowWrap: 'anywhere',
          }}
        >
          {stat.label}
        </Typography>
      </Box>
    </Box>
  );
};

export const ImpactMetricsGrid = ({
  stats,
  loading = false,
}: {
  stats: ImpactStat[];
  loading?: boolean;
}): JSX.Element => (
  <Box
    data-impact-metrics
    role={loading ? 'status' : undefined}
    aria-label={loading ? 'Loading impact figures' : undefined}
    aria-busy={loading}
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(12, minmax(0, 1fr))' },
      gap: 2.5,
      alignItems: 'stretch',
    }}
  >
    {(loading && stats.length === 0
      ? Array.from<ImpactStat | undefined>({ length: 3 })
      : stats
    ).map((stat, index, items) => {
      const layout = getImpactMetricLayout(items.length, index);
      return (
        <Box
          key={stat?.id ?? `metric-skeleton-${index}`}
          sx={{
            minWidth: 0,
            gridColumn: { sm: `span ${layout.sm}`, md: `span ${layout.md}` },
            gridRow: { md: `span ${layout.mdRowSpan}` },
          }}
        >
          {loading || !stat ? (
            <Skeleton
              variant="rounded"
              height="100%"
              sx={{ minHeight: index === 0 ? 156 : { xs: 124, md: 140 }, borderRadius: 3 }}
            />
          ) : (
            <SectionReveal delay={Math.min(index * 0.04, 0.2)} fillHeight>
              <ImpactMetric
                stat={stat}
                featured={index === 0}
                featuredTall={layout.mdRowSpan === 2}
                wide={layout.md > 4}
              />
            </SectionReveal>
          )}
        </Box>
      );
    })}
  </Box>
);

/** One source and presentation for CMS-managed figures wherever they appear on the site. */
export const ImpactMetrics = (): JSX.Element => {
  const { data, isLoading, isError, isFetching, refetch } = useImpactStats();
  const stats = (data?.items ?? []).filter((stat) => stat.isActive);

  if (isLoading) return <ImpactMetricsGrid stats={stats} loading />;
  if (isError || stats.length === 0) {
    return (
      <Box
        role={isError ? 'alert' : 'status'}
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          p: 2.5,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <InsightsRoundedIcon aria-hidden sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
          {isError ? 'Impact figures are unavailable right now.' : 'Impact updates are on the way.'}
        </Typography>
        {isError && (
          <Button
            type="button"
            size="small"
            disabled={isFetching}
            onClick={() => void refetch()}
            sx={{ color: 'text.primary' }}
          >
            Retry
          </Button>
        )}
      </Box>
    );
  }

  return <ImpactMetricsGrid stats={stats} />;
};

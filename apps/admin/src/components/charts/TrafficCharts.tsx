import type { AnalyticsBucket, AnalyticsDay } from '@iaa/shared';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';

const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export const TrafficTrend = ({ daily }: { daily: AnalyticsDay[] }): JSX.Element => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const chartWidth = compact ? 360 : 780;
  const plotEnd = chartWidth - 36;
  const [metric, setMetric] = useState<'views' | 'visitors'>('views');
  const maximum = Math.max(1, ...daily.map((day) => day[metric]));
  const ceiling = Math.ceil(maximum / 4) * 4;
  const points = daily.map((day, index) => ({
    x: 44 + (index / Math.max(1, daily.length - 1)) * (plotEnd - 44),
    y: 220 - (day[metric] / ceiling) * 190,
    day,
  }));
  const line = points.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const ticks = [...new Set([0, Math.floor((daily.length - 1) / 2), daily.length - 1])].filter(
    (index) => index >= 0,
  );
  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="caption" color="text.secondary">
          Daily totals · zero-traffic days included
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={metric}
          onChange={(_, value: 'views' | 'visitors' | null) => value && setMetric(value)}
          aria-label="Trend metric"
        >
          <ToggleButton value="views">Page views</ToggleButton>
          <ToggleButton value="visitors">Visitors</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box
        component="svg"
        role="img"
        aria-label={`Daily ${metric} trend. Exact values are available below.`}
        viewBox={`0 0 ${chartWidth} 255`}
        sx={{ width: '100%', height: { xs: 210, sm: 280 }, overflow: 'visible' }}
      >
        {[0, 1, 2, 3, 4].map((tick) => (
          <g key={tick}>
            <line
              x1="44"
              x2={plotEnd}
              y1={220 - tick * 47.5}
              y2={220 - tick * 47.5}
              stroke={theme.palette.divider}
              strokeDasharray="3 5"
            />
            <text
              x="32"
              y={224 - tick * 47.5}
              textAnchor="end"
              fill={theme.palette.text.secondary}
              fontSize="12"
            >
              {(ceiling * tick) / 4}
            </text>
          </g>
        ))}
        {line && (
          <path
            d={`${line} L ${points[points.length - 1]?.x} 220 L 44 220 Z`}
            fill={alpha(theme.palette.primary.main, 0.1)}
          />
        )}
        <path
          d={line}
          fill="none"
          stroke={theme.palette.primary.main}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {points
          .filter(({ day }) => day[metric] > 0)
          .map(({ x, y, day }) => (
            <circle key={day.date} cx={x} cy={y} r="4" fill={theme.palette.primary.main}>
              <title>
                {dateLabel(day.date)}: {day[metric]} {metric}
              </title>
            </circle>
          ))}
        {ticks.map((index) => (
          <text
            key={index}
            x={points[index]?.x}
            y="248"
            textAnchor={index === 0 ? 'start' : 'middle'}
            fill={theme.palette.text.secondary}
            fontSize="13"
          >
            {dateLabel(daily[index]!.date)}
          </text>
        ))}
      </Box>
      <Box
        component="details"
        sx={{
          mt: 1,
          fontSize: '0.75rem',
          color: 'text.secondary',
          '& summary': { cursor: 'pointer' },
        }}
      >
        <summary>Explore daily values</summary>
        <Box sx={{ maxHeight: 220, overflow: 'auto', mt: 1 }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              textAlign: 'left',
              '& td, & th': { p: 1, borderBottom: 1, borderColor: 'divider' },
            }}
          >
            <thead>
              <tr>
                <th>Date</th>
                <th>Page views</th>
                <th>Visitors</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((day) => (
                <tr key={day.date}>
                  <td>{dateLabel(day.date)}</td>
                  <td>{day.views}</td>
                  <td>{day.visitors}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export const HourlyActivity = ({ hours }: { hours: AnalyticsBucket[] }): JSX.Element => {
  const peak = Math.max(1, ...hours.map((hour) => hour.count));
  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(6, 1fr)', sm: 'repeat(12, 1fr)' },
          gap: 1,
          my: 2.5,
        }}
      >
        {hours.map((hour) => (
          <Tooltip key={hour.key} title={`${hour.label} UTC · ${hour.count} page views`} arrow>
            <Box
              tabIndex={0}
              aria-label={`${hour.label} UTC: ${hour.count} page views`}
              sx={{
                borderRadius: 2,
                p: { xs: 0.75, sm: 1.25 },
                textAlign: 'center',
                border: 1,
                borderColor: 'divider',
                color: hour.count / peak > 0.5 ? 'primary.contrastText' : 'text.primary',
                bgcolor: (theme) =>
                  alpha(
                    theme.palette.primary.main,
                    hour.count > 0 ? 0.16 + (hour.count / peak) * 0.65 : 0.035,
                  ),
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <Typography sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                {hour.label.slice(0, 2)}
              </Typography>
              <Typography sx={{ fontWeight: 750, fontSize: '0.95rem', mt: 0.5 }}>
                {hour.count}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" justifyContent="space-between" gap={2}>
        <Typography variant="caption" color="text.secondary">
          Hours in UTC · totals across the selected period
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Brighter = more views
        </Typography>
      </Stack>
    </Box>
  );
};

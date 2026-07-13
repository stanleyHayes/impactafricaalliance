import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  emptyMessage?: string;
}

/**
 * Lightweight dependency-free donut chart (SVG) with a MUI legend.
 * Empty data renders a neutral ring so the layout never collapses.
 */
export const DonutChart = ({
  data,
  size = 168,
  thickness = 22,
  centerValue,
  centerLabel,
  emptyMessage = 'No data yet',
}: DonutChartProps): JSX.Element => {
  const theme = useTheme();
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = data
    .filter((datum) => datum.value > 0)
    .map((datum) => {
      const length = (datum.value / total) * circumference;
      const segment = { ...datum, length, offset };
      offset += length;
      return segment;
    });

  return (
    <Stack direction="row" spacing={2.5} alignItems="center" sx={{ width: '100%' }}>
      <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <Box component="svg" viewBox={`0 0 ${size} ${size}`} sx={{ width: size, height: size }}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={alpha(theme.palette.text.secondary, 0.14)}
            strokeWidth={thickness}
          />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(segment.length - 3, 0)} ${circumference - Math.max(segment.length - 3, 0)}`}
              strokeDashoffset={-segment.offset}
              transform={`rotate(-90 ${center} ${center})`}
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          ))}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {total > 0 ? (centerValue ?? String(total)) : '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {total > 0 ? centerLabel : emptyMessage}
          </Typography>
        </Box>
      </Box>
      <Stack spacing={1} sx={{ minWidth: 0, flexGrow: 1 }}>
        {data.map((datum) => (
          <Stack key={datum.label} direction="row" spacing={1} alignItems="center">
            <Box
              aria-hidden
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: datum.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {datum.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              {datum.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

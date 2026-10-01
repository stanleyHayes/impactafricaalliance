import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';

import { skinned, tokenVar } from '../../theme/surfaces';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional pre-formatted value shown above the bar (defaults to the raw number). */
  displayValue?: string;
}

interface BarChartProps {
  data: BarDatum[];
  color: string;
  height?: number;
  /** Shorten x-axis labels (e.g. `2026-07` → `Jul`). */
  formatLabel?: (label: string) => string;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  /** Limit axis labels for dense reporting windows. */
  maxLabels?: number;
  /**
   * Draw at the width the chart is given instead of scaling a 600-wide drawing
   * to fit, so a narrow chart keeps its height and readable labels rather than
   * shrinking into a band of empty space.
   */
  fluid?: boolean;
}

const VIEWBOX_WIDTH = 600;
const PADDING_X = 8;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 24;

/** The rendered width of a fluid chart, kept current as it resizes; 0 until measured. */
const useMeasuredWidth = (fluid: boolean) => {
  const [width, setWidth] = useState(0);
  // A ref callback rather than an effect: the chart only draws its SVG once
  // there is data, and this attaches whenever that happens. It measures during
  // the commit, so the first frame is already drawn at the right width.
  const ref = useCallback(
    (svg: SVGSVGElement | null) => {
      if (!fluid || !svg) {
        return undefined;
      }
      setWidth(Math.round(svg.getBoundingClientRect().width));
      if (typeof ResizeObserver === 'undefined') {
        return undefined;
      }
      const observer = new ResizeObserver(([entry]) => {
        if (entry) setWidth(Math.round(entry.contentRect.width));
      });
      observer.observe(svg);
      return () => observer.disconnect();
    },
    [fluid],
  );
  return { ref, width };
};

/**
 * Lightweight dependency-free vertical bar chart (SVG). Scales to its
 * container width; bars keep rounded tops and inline value labels.
 */
export const BarChart = ({
  data,
  color,
  height = 200,
  formatLabel = (label) => label,
  formatValue = (value) => String(value),
  emptyMessage = 'No data yet',
  maxLabels = Number.POSITIVE_INFINITY,
  fluid = false,
}: BarChartProps): JSX.Element => {
  const theme = useTheme();
  const measured = useMeasuredWidth(fluid);
  const labelColor = theme.palette.text.secondary;
  const hasData = data.some((datum) => datum.value > 0);

  if (!hasData) {
    return (
      <Box
        // The empty chart area keeps its dashed outline; a skin sinks it into
        // the panel as one of its wells.
        sx={skinned(
          {
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
          },
          { bgcolor: tokenVar('surfaceInsetBg'), boxShadow: tokenVar('surfaceInsetShadow') },
        )}
      >
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  const viewBoxWidth = fluid && measured.width > 0 ? measured.width : VIEWBOX_WIDTH;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const baselineY = PADDING_TOP + chartHeight;
  const slotWidth = (viewBoxWidth - PADDING_X * 2) / data.length;
  const barWidth = Math.min(64, slotWidth * 0.58);
  const maxValue = Math.max(...data.map((datum) => datum.value), 1);

  return (
    <Box
      component="svg"
      ref={measured.ref}
      viewBox={`0 0 ${viewBoxWidth} ${height}`}
      role="img"
      aria-label="Bar chart"
      sx={{ width: '100%', height, display: 'block' }}
    >
      {/* faint horizontal guides */}
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={PADDING_X}
          x2={viewBoxWidth - PADDING_X}
          y1={baselineY - chartHeight * ratio}
          y2={baselineY - chartHeight * ratio}
          stroke={alpha(labelColor, 0.16)}
          strokeWidth={1}
          strokeDasharray="4 6"
        />
      ))}
      <line
        x1={PADDING_X}
        x2={viewBoxWidth - PADDING_X}
        y1={baselineY}
        y2={baselineY}
        stroke={alpha(labelColor, 0.35)}
        strokeWidth={1}
      />
      {data.map((datum, index) => {
        const barHeight = Math.max(datum.value > 0 ? 4 : 0, (datum.value / maxValue) * chartHeight);
        const x = PADDING_X + slotWidth * index + (slotWidth - barWidth) / 2;
        const y = baselineY - barHeight;
        return (
          <g key={datum.label}>
            <title>{`${datum.label}: ${formatValue(datum.value)}`}</title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={5}
              fill={color}
              opacity={0.92}
            />
            {datum.value > 0 && data.length <= maxLabels * 2 && (
              <text
                x={x + barWidth / 2}
                y={y - 7}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={labelColor}
              >
                {datum.displayValue ?? formatValue(datum.value)}
              </text>
            )}
            <text
              x={PADDING_X + slotWidth * index + slotWidth / 2}
              y={height - 7}
              textAnchor="middle"
              fontSize={12}
              fill={labelColor}
            >
              {index % Math.max(1, Math.ceil(data.length / maxLabels)) === 0
                ? formatLabel(datum.label)
                : ''}
            </text>
          </g>
        );
      })}
    </Box>
  );
};

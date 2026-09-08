import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DonutChart } from './DonutChart';
import { HourlyActivity, TrafficTrend } from './TrafficCharts';

describe('traffic visualizations', () => {
  it('switches the daily metric and retains exact zero-day values', () => {
    render(
      <TrafficTrend
        daily={[
          { date: '2026-09-07', views: 0, visitors: 0 },
          { date: '2026-09-08', views: 32, visitors: 6 },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: /Daily views trend/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visitors' }));
    expect(screen.getByRole('img', { name: /Daily visitors trend/ })).toBeInTheDocument();
    expect(screen.getByText('8 Sept: 6 visitors')).toBeInTheDocument();
    expect(screen.getAllByRole('row', { hidden: true })).toHaveLength(3);
  });

  it('shows exact hourly counts including inactive hours', () => {
    render(
      <HourlyActivity
        hours={Array.from({ length: 24 }, (_, hour) => ({
          key: String(hour),
          label: `${String(hour).padStart(2, '0')}:00`,
          count: hour === 12 ? 32 : 0,
        }))}
      />,
    );
    expect(screen.getByLabelText('12:00 UTC: 32 page views')).toHaveAttribute('tabindex', '0');
    expect(screen.getByLabelText('00:00 UTC: 0 page views')).toBeInTheDocument();
    expect(screen.getByLabelText('23:00 UTC: 0 page views')).toBeInTheDocument();
  });

  it('calculates device proportions and handles a zero total', () => {
    const { rerender } = render(
      <DonutChart
        showPercentages
        data={[
          { label: 'Desktop', value: 3, color: '#00aa88' },
          { label: 'Mobile', value: 1, color: '#ffcc00' },
        ]}
      />,
    );
    expect(screen.getByText('3 · 75%')).toBeInTheDocument();
    expect(screen.getByText('1 · 25%')).toBeInTheDocument();
    rerender(
      <DonutChart showPercentages data={[{ label: 'Desktop', value: 0, color: '#00aa88' }]} />,
    );
    expect(screen.getByText('0 · 0%')).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});

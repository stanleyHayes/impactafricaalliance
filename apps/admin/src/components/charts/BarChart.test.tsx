import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BarChart } from './BarChart';

const data = [
  { label: '2026-09', value: 0 },
  { label: '2026-10', value: 100, displayValue: 'GH₵100' },
];

describe('BarChart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps its 600-wide drawing by default, scaled to fit', () => {
    render(<BarChart data={data} color="#f5b800" height={178} />);
    expect(screen.getByRole('img', { name: 'Bar chart' })).toHaveAttribute(
      'viewBox',
      '0 0 600 178',
    );
  });

  it('draws a fluid chart at the width it is given, labels at full size', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320,
    } as DOMRect);
    render(<BarChart data={data} color="#f5b800" height={178} fluid />);
    expect(screen.getByRole('img', { name: 'Bar chart' })).toHaveAttribute(
      'viewBox',
      '0 0 320 178',
    );
    expect(screen.getByText('GH₵100')).toBeInTheDocument();
  });
});

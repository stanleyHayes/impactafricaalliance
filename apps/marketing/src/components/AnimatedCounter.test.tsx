import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';

import { AnimatedCounter } from './AnimatedCounter';

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

describe('AnimatedCounter', () => {
  it('renders the final value immediately when reduced motion is preferred', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    renderWithProviders(<AnimatedCounter value={1000} suffix="+" />);

    expect(screen.getByText('1,000+')).toBeInTheDocument();
  });
});

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './use-debounced-value';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('starts with the value it was given', () => {
    const { result } = renderHook(() => useDebouncedValue('first', 300));
    expect(result.current).toBe('first');
  });

  it('waits until typing stops before passing on the latest value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'm' },
    });

    rerender({ value: 'me' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'men' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // 400 ms have passed in all, but never 300 without a change.
    expect(result.current).toBe('m');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('men');
  });
});

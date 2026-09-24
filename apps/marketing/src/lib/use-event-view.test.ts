import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEventView } from './use-event-view';

const key = 'iaa:marketing:events:view';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  });
});
afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('event view preference', () => {
  it('restores the selected view after remount and allows changing it again', () => {
    const first = renderHook(useEventView);
    expect(first.result.current[0]).toBe('card');
    act(() => first.result.current[1]('calendar'));
    first.unmount();
    const second = renderHook(useEventView);
    expect(second.result.current[0]).toBe('calendar');
    act(() => second.result.current[1]('card'));
    expect(window.localStorage.getItem(key)).toBe('card');
  });
  it('ignores invalid saved values', () => {
    window.localStorage.setItem(key, 'invalid');
    expect(renderHook(useEventView).result.current[0]).toBe('card');
  });
  it('still switches views when storage is blocked', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const hook = renderHook(useEventView);
    act(() => hook.result.current[1]('calendar'));
    expect(hook.result.current[0]).toBe('calendar');
  });
});

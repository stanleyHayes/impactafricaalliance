import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cssUrl, useBackgroundFallback, useImageFallback } from './image-fallback';

const UPLOAD = 'https://res.cloudinary.com/demo/image/upload/v1/site/gone.jpg';
const SHARED = 'https://res.cloudinary.com/demo/image/upload/v1/site/shared.jpg';
const SHIPPED = '/images/community.webp';

/**
 * A stand-in for the browser's image loader: every address it is asked for
 * is recorded, and `fail` reports one of them as unloadable.
 */
const stubImages = (): { requested: () => string[]; fail: (src: string) => void } => {
  const probes: FakeImage[] = [];
  class FakeImage {
    onerror: (() => void) | null = null;
    src = '';
    constructor() {
      probes.push(this);
    }
  }
  vi.stubGlobal('Image', FakeImage);
  return {
    requested: () => probes.map((probe) => probe.src),
    fail: (src) => {
      act(() => {
        probes.filter((probe) => probe.src === src).forEach((probe) => probe.onerror?.());
      });
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('an image with fallbacks', () => {
  it('draws the first choice until the browser says it cannot load it', () => {
    const { result } = renderHook(() => useImageFallback([UPLOAD, SHARED, SHIPPED]));
    expect(result.current.src).toBe(UPLOAD);
    act(() => result.current.onError());
    expect(result.current.src).toBe(SHARED);
    act(() => result.current.onError());
    expect(result.current.src).toBe(SHIPPED);
  });

  it('never skips the shipped file, the last thing it has to draw', () => {
    const { result } = renderHook(() => useImageFallback([UPLOAD, SHIPPED]));
    act(() => result.current.onError());
    act(() => result.current.onError());
    expect(result.current.src).toBe(SHIPPED);
    expect(result.current.isLast).toBe(true);
  });

  it('skips blanks and repeats, and tries a new upload afresh', () => {
    const { result, rerender } = renderHook(({ list }) => useImageFallback(list), {
      initialProps: { list: [undefined, UPLOAD, UPLOAD, SHIPPED] as (string | undefined)[] },
    });
    act(() => result.current.onError());
    expect(result.current.src).toBe(SHIPPED);
    rerender({ list: [SHARED, SHIPPED] });
    expect(result.current.src).toBe(SHARED);
  });
});

describe('a background with fallbacks', () => {
  it('checks an upload and moves past it when it will not load', () => {
    const images = stubImages();
    const { result } = renderHook(() => useBackgroundFallback([UPLOAD, SHARED, SHIPPED]));
    expect(result.current).toBe(UPLOAD);
    images.fail(UPLOAD);
    expect(result.current).toBe(SHARED);
    images.fail(SHARED);
    expect(result.current).toBe(SHIPPED);
  });

  it('never checks the shipped file, so an unchanged page does exactly what it did', () => {
    const images = stubImages();
    const { result } = renderHook(() => useBackgroundFallback([undefined, SHIPPED]));
    expect(result.current).toBe(SHIPPED);
    expect(images.requested()).toEqual([]);
  });
});

describe('a CSS url', () => {
  it('quotes an address so brackets and quotes cannot end it early', () => {
    expect(cssUrl('/images/hero.webp')).toBe('url("/images/hero.webp")');
    expect(cssUrl('https://a.test/x).jpg";color:red')).toBe(
      'url("https://a.test/x).jpg\\";color:red")',
    );
    expect(cssUrl('https://a.test/a\\b\n.jpg')).toBe('url("https://a.test/a\\\\b.jpg")');
  });
});

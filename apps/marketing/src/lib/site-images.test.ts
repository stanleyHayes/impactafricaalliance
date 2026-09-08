import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSiteImages } from './content-hooks';
import { useShowcaseImageMap } from './site-images';

vi.mock('./content-hooks', () => ({ useSiteImages: vi.fn() }));

describe('showcase CMS images', () => {
  const record = {
    key: 'home-showcase-lead',
    isActive: true,
    image: { url: 'https://example.com/editor-upload.webp', alt: 'Media description' },
    alt: 'Editor description',
  };
  function resolve(items: unknown[]) {
    vi.mocked(useSiteImages).mockReturnValue({ data: { items } } as ReturnType<typeof useSiteImages>);
    return renderHook(() => useShowcaseImageMap()).result.current('home-showcase-lead', 'Generated scene');
  }
  it('uses the active CMS image and its description', () => {
    expect(resolve([record])).toEqual({ src: record.image.url, alt: 'Editor description' });
  });
  it('uses media alt text when the slot description is blank', () => {
    expect(resolve([{ ...record, alt: ' ' }]).alt).toBe('Media description');
  });
  it('restores the generated fallback when a slot is absent or inactive', () => {
    for (const items of [[], [{ ...record, isActive: false }]]) {
      expect(resolve(items)).toEqual({ src: '/images/home-showcase-lead-v2.webp', alt: 'Generated scene' });
    }
  });
});

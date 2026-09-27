import { describe, expect, it } from 'vitest';

import { theme } from '../theme/theme';

import {
  IMAGE_BREAKPOINTS,
  RESPONSIVE_WIDTHS,
  cloudinaryUrl,
  responsiveSizes,
  responsiveSrcSet,
} from './cloudinary-image';

const upload = 'https://res.cloudinary.com/iaa/image/upload/v1712345678/iaa/stories/harvest.jpg';
const at = (transformation: string): string =>
  `https://res.cloudinary.com/iaa/image/upload/${transformation}/v1712345678/iaa/stories/harvest.jpg`;

describe('cloudinaryUrl', () => {
  it('asks for an automatic format and quality by default', () => {
    expect(cloudinaryUrl(upload)).toBe(at('f_auto,q_auto'));
  });

  it('adds a width that never enlarges the upload', () => {
    expect(cloudinaryUrl(upload, { width: 800 })).toBe(at('f_auto,q_auto,c_limit,w_800'));
  });

  it('uses the crop the caller asks for', () => {
    expect(cloudinaryUrl(upload, { width: 640, crop: 'fill' })).toBe(
      at('f_auto,q_auto,c_fill,w_640'),
    );
  });

  it('rounds the width and ignores one that cannot be used', () => {
    expect(cloudinaryUrl(upload, { width: 799.6 })).toBe(at('f_auto,q_auto,c_limit,w_800'));
    expect(cloudinaryUrl(upload, { width: 0 })).toBe(at('f_auto,q_auto'));
    expect(cloudinaryUrl(upload, { width: Number.NaN })).toBe(at('f_auto,q_auto'));
  });

  it('can leave the format and quality as uploaded', () => {
    expect(cloudinaryUrl(upload, { width: 480, format: false, quality: false })).toBe(
      at('c_limit,w_480'),
    );
    expect(cloudinaryUrl(upload, { format: false, quality: false })).toBe(upload);
  });

  it('leaves images on other hosts untouched', () => {
    for (const url of [
      'https://images.example.com/image/upload/v1/photo.jpg',
      '/images/home-showcase-lead-v2.webp',
      'https://res.cloudinary.com.evil.example/iaa/image/upload/v1/photo.jpg',
      'not a url',
      '',
    ]) {
      expect(cloudinaryUrl(url, { width: 800 })).toBe(url);
    }
  });

  it('leaves Cloudinary URLs that are not public image uploads untouched', () => {
    for (const url of [
      'https://res.cloudinary.com/iaa/raw/upload/v1/iaa/report.pdf',
      'https://res.cloudinary.com/iaa/image/authenticated/s--abc123--/v1/iaa/cv.jpg',
      'https://res.cloudinary.com/iaa/video/upload/v1/iaa/clip.mp4',
    ]) {
      expect(cloudinaryUrl(url, { width: 800 })).toBe(url);
    }
  });

  it('leaves signed URLs alone, because a new transformation would break the signature', () => {
    const signed = 'https://res.cloudinary.com/iaa/image/upload/s--Xy1Z2abc--/v1/iaa/photo.jpg';
    expect(cloudinaryUrl(signed, { width: 800 })).toBe(signed);
    expect(responsiveSrcSet(signed)).toBeUndefined();
  });

  it('replaces its own earlier transformation instead of stacking another', () => {
    const once = cloudinaryUrl(upload, { width: 480 });
    expect(cloudinaryUrl(once, { width: 1080 })).toBe(at('f_auto,q_auto,c_limit,w_1080'));
    expect(cloudinaryUrl(cloudinaryUrl(upload))).toBe(at('f_auto,q_auto'));
  });

  it('keeps a transformation it did not write and applies its own on top', () => {
    const cropped = at('c_fill,g_auto,w_1200,h_630');
    expect(cloudinaryUrl(cropped, { width: 600 })).toBe(
      at('f_auto,q_auto,c_limit,w_600/c_fill,g_auto,w_1200,h_630'),
    );
  });

  it('handles an upload URL without a version segment', () => {
    expect(cloudinaryUrl('https://res.cloudinary.com/iaa/image/upload/sample.jpg')).toBe(
      'https://res.cloudinary.com/iaa/image/upload/f_auto,q_auto/sample.jpg',
    );
  });
});

describe('responsiveSrcSet', () => {
  it('lists every default width, smallest first', () => {
    expect(responsiveSrcSet(upload)).toBe(
      RESPONSIVE_WIDTHS.map((width) => `${at(`f_auto,q_auto,c_limit,w_${width}`)} ${width}w`).join(
        ', ',
      ),
    );
  });

  it('sorts, rounds and de-duplicates the widths it is given, dropping unusable ones', () => {
    expect(responsiveSrcSet(upload, [960, 320.4, 320, 0, -5, Number.NaN])).toBe(
      `${at('f_auto,q_auto,c_limit,w_320')} 320w, ${at('f_auto,q_auto,c_limit,w_960')} 960w`,
    );
  });

  it('gives no srcset for an image Cloudinary cannot resize', () => {
    expect(responsiveSrcSet('https://images.example.com/photo.jpg')).toBeUndefined();
    expect(responsiveSrcSet(upload, [])).toBeUndefined();
  });
});

describe('responsiveSizes', () => {
  it('lists larger breakpoints first and ends with the phone width', () => {
    expect(responsiveSizes({ xs: '100vw', md: '50vw', lg: '600px' })).toBe(
      '(min-width: 1200px) 600px, (min-width: 900px) 50vw, 100vw',
    );
  });

  it('falls back to the full viewport width on phones', () => {
    expect(responsiveSizes({ sm: '50vw', xl: '33vw' })).toBe(
      '(min-width: 1536px) 33vw, (min-width: 600px) 50vw, 100vw',
    );
    expect(responsiveSizes({})).toBe('100vw');
  });

  it('uses the same breakpoints as the marketing theme', () => {
    expect(IMAGE_BREAKPOINTS).toEqual(theme.breakpoints.values);
  });
});

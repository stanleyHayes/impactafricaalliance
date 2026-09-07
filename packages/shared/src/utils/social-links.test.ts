import { describe, expect, it } from 'vitest';

import { taggedLinkFor, taggedLinksFor, toCampaignSlug, withUtm } from './social-links.js';
import { DESTINATION_FRAMES, variantFor, variantsFor } from './social-media-variants.js';

const url = 'https://www.impactafricaalliance.org/news/stem-2027';

describe('campaign tagging', () => {
  it('tags a plain URL', () => {
    const tagged = withUtm(url, { source: 'linkedin', medium: 'social', campaign: 'stem-2027' });
    expect(tagged).toContain('utm_source=linkedin');
    expect(tagged).toContain('utm_medium=social');
    expect(tagged).toContain('utm_campaign=stem-2027');
  });

  it('keeps a query the URL already had', () => {
    const tagged = withUtm(`${url}?ref=newsletter`, {
      source: 'x',
      medium: 'social',
      campaign: 'c',
    });
    expect(tagged).toContain('ref=newsletter');
    expect(tagged).toContain('utm_source=x');
  });

  it('does not overwrite a tag somebody set deliberately', () => {
    const tagged = withUtm(`${url}?utm_source=partner`, {
      source: 'facebook',
      medium: 'social',
      campaign: 'c',
    });
    expect(tagged).toContain('utm_source=partner');
    expect(tagged).not.toContain('utm_source=facebook');
  });

  it('keeps the fragment at the end where it belongs', () => {
    const tagged = withUtm(`${url}#team`, { source: 'x', medium: 'social', campaign: 'c' });
    expect(tagged.endsWith('#team')).toBe(true);
    expect(tagged).toContain('utm_source=x');
  });

  it('leaves something that is not a link alone', () => {
    expect(withUtm('not a url', { source: 'x', medium: 'social', campaign: 'c' })).toBe('not a url');
  });

  it('separates each network rather than lumping them together', () => {
    const links = taggedLinksFor(url, 'stem-2027', ['facebook', 'linkedin']);
    expect(links.facebook).toContain('utm_source=facebook');
    expect(links.linkedin).toContain('utm_source=linkedin');
    expect(links.facebook).not.toEqual(links.linkedin);
  });

  it('names a campaign after the headline', () => {
    expect(toCampaignSlug('Ghana STEM Network: applications open!')).toBe(
      'ghana-stem-network-applications-open',
    );
    expect(toCampaignSlug('!!!')).toBe('update');
  });

  it('is applied per destination', () => {
    expect(taggedLinkFor(url, 'instagram', 'c')).toContain('utm_source=instagram');
  });
});

describe('image variants', () => {
  const cloudinary =
    'https://res.cloudinary.com/demo/image/upload/v123/iaa/site/impact-banner.webp';

  it('crops to each network frame', () => {
    expect(variantFor(cloudinary, 'facebook')).toContain('c_fill,g_auto,w_1200,h_630');
    expect(variantFor(cloudinary, 'instagram')).toContain('w_1080,h_1080');
  });

  it('lets Cloudinary choose the crop so faces survive it', () => {
    expect(variantFor(cloudinary, 'x')).toContain('g_auto');
  });

  it('keeps the rest of the URL intact', () => {
    expect(variantFor(cloudinary, 'facebook')).toContain('v123/iaa/site/impact-banner.webp');
  });

  it('leaves an image hosted elsewhere alone', () => {
    const external = 'https://example.test/photo.jpg';
    expect(variantFor(external, 'facebook')).toBe(external);
  });

  it('builds one per destination', () => {
    const variants = variantsFor(cloudinary, ['facebook', 'x']);
    expect(Object.keys(variants)).toEqual(['facebook', 'x']);
    expect(variants.facebook).not.toEqual(variants.x);
  });

  it('has a frame for every destination', () => {
    expect(Object.keys(DESTINATION_FRAMES).sort()).toEqual(
      ['facebook', 'instagram', 'linkedin', 'threads', 'x'].sort(),
    );
  });
});

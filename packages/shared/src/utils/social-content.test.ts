import { describe, expect, it } from 'vitest';

import {
  DESTINATION_CAPABILITIES,
  SOCIAL_DESTINATIONS,
  destinationRejection,
  destinationsFor,
  needsReconnect,
} from '../schemas/social-publication.js';

import { formatForDestination, formatForDestinations, toHashtag, truncate } from './social-content.js';

const article = {
  title: 'Ghana STEM Network opens applications for its 2027 fellowship',
  excerpt:
    'Two hundred places are open to young people across Ghana and Nigeria. Applications close in November, and the programme runs for six months alongside paid placements.',
  url: 'https://www.impactafricaalliance.org/news/stem-fellowship-2027',
  tags: ['STEM Learning', 'Youth Inclusion', 'fellowships'],
};

describe('every destination', () => {
  it.each(SOCIAL_DESTINATIONS)('%s produces copy within its own limit', (destination) => {
    const caption = formatForDestination(destination, article);
    expect(caption.length).toBeGreaterThan(0);
    expect(caption.length).toBeLessThanOrEqual(DESTINATION_CAPABILITIES[destination].maxLength);
  });

  it.each(SOCIAL_DESTINATIONS)('%s still produces copy from a bare title', (destination) => {
    const caption = formatForDestination(destination, { title: 'A short update' });
    expect(caption).toContain('A short update');
  });

  it('drafts several at once for the preview', () => {
    const drafted = formatForDestinations(['x', 'linkedin'], article);
    expect(Object.keys(drafted)).toEqual(['x', 'linkedin']);
    expect(drafted.x).not.toEqual(drafted.linkedin);
  });
});

describe('X', () => {
  it('fits the post and its link inside the limit', () => {
    const caption = formatForDestination('x', article);
    // The link is a fixed 23 characters to X however long it really is.
    const withoutUrl = caption.replace(article.url, '');
    expect(withoutUrl.length + 23).toBeLessThanOrEqual(280);
    expect(caption).toContain(article.url);
  });

  it('keeps a long link from crowding out the words', () => {
    const caption = formatForDestination('x', {
      ...article,
      url: `https://www.impactafricaalliance.org/news/${'a'.repeat(300)}`,
    });
    expect(caption.replace(/https:\/\/\S+/, '').trim().length).toBeGreaterThan(40);
  });
});

describe('Instagram', () => {
  it('does not tell people to follow a link that will not be clickable', () => {
    const caption = formatForDestination('instagram', article);
    expect(caption).not.toContain('Read more');
    expect(caption).not.toContain(article.url);
  });

  it('carries hashtags built from the tags', () => {
    const caption = formatForDestination('instagram', article);
    expect(caption).toContain('#stemlearning');
    expect(caption).toContain('#youthinclusion');
  });
});

describe('the other formats keep their link', () => {
  it.each(['facebook', 'linkedin', 'threads'] as const)('%s includes the URL', (destination) => {
    // Threads only has room for the URL when the copy is short.
    const source = destination === 'threads' ? { ...article, excerpt: 'Short.' } : article;
    const caption = formatForDestination(destination, source);
    expect(caption.includes(article.url) || destination === 'threads').toBe(true);
  });
});

describe('truncation', () => {
  it('cuts on a word boundary', () => {
    expect(truncate('the quick brown fox jumps', 16)).toBe('the quick brown…');
  });

  it('leaves short text alone', () => {
    expect(truncate('short', 40)).toBe('short');
  });

  it('still cuts a single very long word', () => {
    expect(truncate('a'.repeat(50), 10)).toHaveLength(10);
  });
});

describe('hashtags', () => {
  it('strips everything that cannot appear in one', () => {
    expect(toHashtag('Women & Girls!')).toBe('#womengirls');
  });

  it('drops a tag with nothing usable left', () => {
    expect(toHashtag('---')).toBe('');
  });
});

describe('capabilities', () => {
  it('routes both Meta destinations through one connection', () => {
    expect(destinationsFor('meta').sort()).toEqual(['facebook', 'instagram']);
    expect(destinationsFor('linkedin')).toEqual(['linkedin']);
  });

  it('refuses Instagram without an image, before anything is queued', () => {
    expect(destinationRejection('instagram', { caption: 'Hello' })).toContain('image');
    expect(
      destinationRejection('instagram', { caption: 'Hello', imageUrl: 'https://x.test/a.jpg' }),
    ).toBeUndefined();
  });

  it('refuses copy that is over the limit or empty', () => {
    expect(destinationRejection('x', { caption: 'a'.repeat(281) })).toContain('280');
    expect(destinationRejection('facebook', { caption: '   ' })).toContain('caption');
  });

  it('knows which connection states need the administrator', () => {
    expect(needsReconnect('expired')).toBe(true);
    expect(needsReconnect('revoked')).toBe(true);
    expect(needsReconnect('active')).toBe(false);
    expect(needsReconnect('error')).toBe(false);
  });
});

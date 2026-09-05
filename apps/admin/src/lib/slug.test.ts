import { describe, expect, it } from 'vitest';

import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('Ready for Work')).toBe('ready-for-work');
  });

  it('drops punctuation rather than encoding it', () => {
    expect(slugify('"Ready for Work": Land Your Dream Job!')).toBe(
      'ready-for-work-land-your-dream-job',
    );
  });

  it('strips accents instead of dropping the letter', () => {
    expect(slugify("Côte d'Ivoire")).toBe('cote-divoire');
  });

  it('collapses runs of separators and trims the ends', () => {
    expect(slugify('  Youth   &&  Skills  ')).toBe('youth-skills');
  });

  it('returns an empty string when there is nothing usable', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('caps the length so a long headline cannot produce an unusable URL', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

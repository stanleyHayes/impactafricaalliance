import { describe, expect, it } from 'vitest';

import { escapeRegex, searchRegex } from './regex.js';

describe('escapeRegex', () => {
  it('leaves ordinary text alone', () => {
    expect(escapeRegex('Ama Boateng')).toBe('Ama Boateng');
  });

  it('turns every special character into a literal one', () => {
    const special = '.*+?^${}()|[]\\';
    const pattern = new RegExp(`^${escapeRegex(special)}$`);
    expect(pattern.test(special)).toBe(true);
    expect(pattern.test('anything else')).toBe(false);
  });

  it('stops a wildcard from matching everything', () => {
    const pattern = new RegExp(escapeRegex('.*'));
    expect(pattern.test('ama@example.org')).toBe(false);
    expect(pattern.test('looking for .* literally')).toBe(true);
  });
});

describe('searchRegex', () => {
  it('matches a fragment anywhere, in any case', () => {
    const pattern = searchRegex('boat');
    expect(pattern.test('Ama Boateng')).toBe(true);
    expect(pattern.test('Tunde Bello')).toBe(false);
  });

  it('ignores the spaces around what was typed', () => {
    expect(searchRegex('  ama ').test('Ama Boateng')).toBe(true);
  });

  it('matches a hostile pattern only as literal text, and quickly', () => {
    const started = Date.now();
    const pattern = searchRegex('(a+)+$');
    expect(pattern.test(`${'a'.repeat(5000)}!`)).toBe(false);
    expect(pattern.test('literally (a+)+$ here')).toBe(true);
    expect(Date.now() - started).toBeLessThan(100);
  });
});

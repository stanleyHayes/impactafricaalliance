import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { brandFonts } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

/** Runs from the workspace or from the repo root, so find the app either way. */
const APP_ROOT = [process.cwd(), join(process.cwd(), 'apps/marketing')].find((dir) =>
  existsSync(join(dir, 'index.html')),
) as string;

/**
 * Families the browser resolves on its own. Anything else has to arrive from
 * the stylesheet in index.html, or it silently renders as the system default.
 */
const SYSTEM_FAMILIES = new Set([
  '-apple-system',
  'BlinkMacSystemFont',
  'Georgia',
  'Helvetica',
  'Helvetica Neue',
  'Menlo',
  'SFMono-Regular',
  'Segoe UI',
  'Times New Roman',
  'cursive',
  'inherit',
  'monospace',
  'sans-serif',
  'serif',
  'system-ui',
  'ui-monospace',
  'ui-sans-serif',
  'ui-serif',
]);

interface LoadedFamily {
  name: string;
  allows: (weight: number) => boolean;
}

/** Reads index.html and works out which families and weights actually ship. */
const loadedFamilies = (): LoadedFamily[] => {
  const html = readFileSync(join(APP_ROOT, 'index.html'), 'utf8');
  const href = /href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/.exec(html)?.[1];
  expect(href, 'index.html must load the brand fonts').toBeTruthy();

  return ((href as string).split('?')[1] ?? '')
    .split('&')
    .filter((part) => part.startsWith('family='))
    .map((part) => {
      const spec = decodeURIComponent(part.slice('family='.length)).replace(/\+/g, ' ');
      const [name, axes = ''] = spec.split(':');
      const weights = /wght@([\d.;]+)/.exec(axes)?.[1] ?? '';
      const range = /^(\d+)\.\.(\d+)$/.exec(weights);
      if (range) {
        const [, low, high] = range;
        return {
          name: name as string,
          allows: (weight: number) => weight >= Number(low) && weight <= Number(high),
        };
      }
      const listed = new Set(weights.split(';').filter(Boolean).map(Number));
      return { name: name as string, allows: (weight: number) => listed.has(weight) };
    });
};

/** Every source file except the tests, which name fonts only to assert on them. */
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });

/** The first family in a stack is the one that renders when it is available. */
const primaryFamily = (stack: string): string =>
  (stack.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '');

describe('the fonts the pages ask for', () => {
  const families = loadedFamilies();
  const isLoaded = (name: string): boolean => families.some((family) => family.name === name);

  it('loads both brand faces', () => {
    expect(families.map((family) => family.name).sort()).toEqual(['Fraunces', 'Outfit']);
  });

  it('names only families that are loaded or built into the browser', () => {
    const orphans = sourceFiles(join(APP_ROOT, 'src')).flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/fontFamily:\s*(['"])([^'"]*(?:'[^']*')?[^'"]*)\1/g)]
        .map((match) => primaryFamily(match[2] as string))
        .filter((family) => family !== '' && !isLoaded(family) && !SYSTEM_FAMILIES.has(family))
        .map((family) => `${path.replace(APP_ROOT, '')}: ${family}`),
    );

    // A family nobody loaded does not fall back to the brand face — it falls
    // back to whatever the browser ships, which is how three headings ended up
    // in Arial while the stylesheet was perfectly healthy.
    expect(orphans).toEqual([]);
  });

  it('keeps the brand stacks pointed at loaded faces', () => {
    for (const stack of Object.values(brandFonts)) {
      expect(isLoaded(primaryFamily(stack)), stack).toBe(true);
    }
  });

  it('asks only for weights the stylesheet actually serves', () => {
    const unavailable = sourceFiles(join(APP_ROOT, 'src')).flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/fontWeight:\s*(\d{3})\b/g)]
        .map((match) => Number(match[1]))
        .filter((weight) => !families.every((family) => family.allows(weight)))
        .map((weight) => `${path.replace(APP_ROOT, '')}: ${weight}`),
    );

    // Listing discrete weights rather than a range is what made 650, 750, 800
    // and 850 render identically to 700.
    expect(unavailable).toEqual([]);
  });
});

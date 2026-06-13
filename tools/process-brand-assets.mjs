/**
 * Brand asset pipeline.
 *
 * Reads the raw IAA brand-identity exports, trims their transparent padding,
 * resizes them to sensible web dimensions, and writes optimised PNG + WebP
 * variants (plus favicons) into every front-end's `public/brand` folder.
 *
 * Run once after updating the source logos:  node tools/process-brand-assets.mjs
 */
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, '..');
const srcDir = join(repoRoot, '.brand-extract', 'IAA BRAND IDENTITY');

const targets = [
  join(repoRoot, 'apps', 'marketing', 'public', 'brand'),
  join(repoRoot, 'apps', 'admin', 'public', 'brand'),
];

/** Source logo → output basename. Each is trimmed then emitted at `widths`. */
const logos = [
  { src: '20260501_230203.png', name: 'logo-primary', widths: [240, 480] }, // dark wordmark / light bg
  { src: '20260501_230307.png', name: 'logo-white', widths: [240, 480] }, // white / dark bg
  { src: '20260501_232445.png', name: 'logo-emerald', widths: [240, 480] }, // single-colour emerald
];

const trim = (file) => sharp(file).trim({ threshold: 10 });

async function emitLogo(target, logo) {
  const source = join(srcDir, logo.src);
  for (const width of logo.widths) {
    const suffix = width === Math.max(...logo.widths) ? '' : `@${width}`;
    const base = join(target, `${logo.name}${suffix}`);
    const pipeline = trim(source).resize({ width, withoutEnlargement: true });
    await pipeline.clone().png({ quality: 90, compressionLevel: 9 }).toFile(`${base}.png`);
    await pipeline.clone().webp({ quality: 90 }).toFile(`${base}.webp`);
  }
}

async function emitFavicons(target) {
  // Crop the symbol (left square) out of the trimmed primary lockup.
  const trimmed = await trim(join(srcDir, logos[0].src))
    .png()
    .toBuffer({ resolveWithObject: true });
  const { height } = trimmed.info;
  // The symbol sits at the left of the lockup and is roughly 0.7× as wide as it
  // is tall; extract that slab so favicons show the mark without wordmark bleed.
  const markWidth = Math.round(height * 0.7);
  const mark = sharp(trimmed.data)
    .extract({ left: 0, top: 0, width: markWidth, height })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });

  await mark.clone().resize(32, 32).png().toFile(join(target, 'favicon-32.png'));
  await mark.clone().resize(180, 180).png().toFile(join(target, 'apple-touch-icon.png'));
  await mark.clone().resize(512, 512).png().toFile(join(target, 'icon-512.png'));
}

async function run() {
  for (const target of targets) {
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    for (const logo of logos) {
      await emitLogo(target, logo);
    }
    await emitFavicons(target);
    // eslint-disable-next-line no-console
    console.log(`✓ brand assets written to ${target}`);
  }
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to process brand assets:', error);
  process.exit(1);
});

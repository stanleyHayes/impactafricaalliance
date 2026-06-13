/**
 * Optimise a source photo into web-ready JPEG + WebP at a target width.
 * Usage: node tools/process-photo.mjs <input> <output-basename-without-ext> [width]
 */
import sharp from 'sharp';

const [, , input, outBase, widthArg] = process.argv;
const width = Number(widthArg) || 1600;

if (!input || !outBase) {
  // eslint-disable-next-line no-console
  console.error('Usage: process-photo.mjs <input> <outBase> [width]');
  process.exit(1);
}

const pipeline = sharp(input).resize({ width, withoutEnlargement: true });
await pipeline.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(`${outBase}.jpg`);
await pipeline.clone().webp({ quality: 78 }).toFile(`${outBase}.webp`);
// eslint-disable-next-line no-console
console.log(`✓ ${outBase}.jpg / .webp (${width}px)`);

#!/usr/bin/env node
/**
 * Normalise a team portrait for the website.
 *
 * Source photos arrive at wildly different sizes and aspect ratios — studio
 * portraits, phone snaps, even landscape shots. The team cards render 4:5, so
 * everything is cropped to that rather than squashed.
 *
 * By default the crop uses sharp's `attention` strategy, which picks the most
 * salient region instead of the geometric centre. That keeps a face in shot,
 * but it cannot control how *large* the face lands: a photographer who stood
 * back produces a portrait whose head is half the size of everyone else's, and
 * the row of cards then looks wrong even though each picture is fine on its
 * own. `--zoom` and `--focus` exist for those, and are worth setting by eye.
 *
 * Output is 900x1125 — 2x the ~400px the card displays at — as WebP and JPEG.
 *
 * Usage:
 *   node tools/process-portrait.mjs <input> <slug> [outDir] [--zoom 1.7] [--focus 0.51,0.47]
 *
 *   --zoom   how much tighter than the whole frame to crop; 1 keeps the
 *            current attention behaviour, 1.7 crops to a bit under two-thirds
 *   --focus  where the centre of that crop sits, as fractions of width,height
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import sharp from 'sharp';

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? undefined : argv[index + 1];
};
const positional = argv.filter((value, index) => {
  if (value.startsWith('--')) return false;
  return !(index > 0 && argv[index - 1].startsWith('--'));
});

const [input, slug, outDirArg] = positional;
if (!input || !slug) {
  console.error(
    'Usage: process-portrait.mjs <input> <slug> [outDir] [--zoom 1.7] [--focus 0.5,0.45]',
  );
  process.exit(1);
}

const WIDTH = 900;
const HEIGHT = 1125;
const ASPECT = WIDTH / HEIGHT;
const zoom = Number(flag('zoom') ?? 1);
const [focusX, focusY] = (flag('focus') ?? '0.5,0.5').split(',').map(Number);
const outDir = outDirArg ?? 'portraits';
mkdirSync(outDir, { recursive: true });

const meta = await sharp(input).rotate().metadata();
const { width: srcWidth = 0, height: srcHeight = 0 } = meta;

/**
 * The 4:5 box to take out of the source, clamped so it never runs past an
 * edge — a crop that hangs off the frame throws rather than silently shifting.
 */
const cropBox = () => {
  let height = Math.round(srcHeight / zoom);
  let width = Math.round(height * ASPECT);
  if (width > srcWidth) {
    width = srcWidth;
    height = Math.round(width / ASPECT);
  }
  const clamp = (value, max) => Math.max(0, Math.min(Math.round(value), max));
  return {
    left: clamp(focusX * srcWidth - width / 2, srcWidth - width),
    top: clamp(focusY * srcHeight - height / 2, srcHeight - height),
    width,
    height,
  };
};

const framed = () => {
  const pipeline = sharp(input).rotate();
  if (zoom === 1) {
    // No explicit framing asked for, so let sharp find the subject.
    return pipeline.resize(WIDTH, HEIGHT, { fit: 'cover', position: sharp.strategy.attention });
  }
  return pipeline.extract(cropBox()).resize(WIDTH, HEIGHT, { fit: 'cover' });
};

await framed().webp({ quality: 82 }).toFile(path.join(outDir, `${slug}.webp`));
await framed().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outDir, `${slug}.jpg`));

const how = zoom === 1 ? 'attention crop' : `zoom ${zoom} at ${focusX},${focusY}`;
console.log(`${slug}: ${srcWidth}x${srcHeight} -> ${WIDTH}x${HEIGHT} (${how}, webp + jpg in ${outDir}/)`);

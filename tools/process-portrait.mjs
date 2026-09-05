#!/usr/bin/env node
/**
 * Normalise a team portrait for the website.
 *
 * Source photos arrive at wildly different sizes and aspect ratios — studio
 * portraits, phone snaps, even landscape shots. The team cards render 4:5, so
 * everything is cropped to that rather than squashed.
 *
 * The crop uses sharp's `attention` strategy, which picks the most salient
 * region (skin tones, saturation, edges) instead of the geometric centre. That
 * matters for landscape sources, where a centre crop can miss the face.
 *
 * Output is 900x1125 — 2x the ~400px the card displays at — as WebP and JPEG.
 *
 * Usage:
 *   node tools/process-portrait.mjs <input> <slug> [outDir]
 *   node tools/process-portrait.mjs photo.jpg jane-doe ./portraits
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import sharp from 'sharp';

const [, , input, slug, outDirArg] = process.argv;

if (!input || !slug) {
  console.error('Usage: process-portrait.mjs <input> <slug> [outDir]');
  process.exit(1);
}

const WIDTH = 900;
const HEIGHT = 1125;
const outDir = outDirArg ?? 'portraits';
mkdirSync(outDir, { recursive: true });

const source = sharp(input).rotate();
const meta = await source.metadata();

const framed = () =>
  sharp(input)
    // `.rotate()` with no argument applies the EXIF orientation, so phone
    // photos are not silently sideways.
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: sharp.strategy.attention });

await framed().webp({ quality: 82 }).toFile(path.join(outDir, `${slug}.webp`));
await framed().jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outDir, `${slug}.jpg`));

console.log(`${slug}: ${meta.width}x${meta.height} -> ${WIDTH}x${HEIGHT} (webp + jpg in ${outDir}/)`);

#!/usr/bin/env node
/**
 * Publish supplied photography into the CMS.
 *
 * Does the whole journey for a picture that arrives as a file: optimise it,
 * upload it to Cloudinary, record it in the media library so it can be reused,
 * and point the slot that needs it at the result.
 *
 * Slots come in two kinds. `pillar:<key>` sets one of the four programme
 * photographs; `site:<key>` sets a banner or piece of artwork from
 * SITE_IMAGE_SLOTS. Both are upserts keyed on the slot, so re-running replaces
 * rather than accumulating.
 *
 * DRY-RUN by default. Pass --confirm to upload and write.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { v2 as cloudinary } from 'cloudinary';
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import sharp from 'sharp';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
loadEnv({ path: envFlag !== -1 ? args[envFlag + 1] : 'apps/api/.env.production' });

/** What to publish, and where it goes. Edit here rather than passing a dozen flags. */
const JOBS = [
  {
    file: 'IMG_0300.PNG',
    slot: 'pillar:women-empowerment',
    slug: 'women-empowerment',
    alt: 'Women of the Impact Africa Alliance team at work on crafts, sewing, photography and a laptop.',
    tags: ['women', 'empowerment', 'pillar'],
  },
  {
    file: 'IMG_0301.PNG',
    slot: 'pillar:youth-inclusion',
    slug: 'youth-inclusion',
    alt: 'Three young people in Impact Africa Alliance shirts building a robotic arm beside a laptop.',
    tags: ['youth', 'pillar'],
  },
  {
    file: 'IMG_0429.JPEG',
    slot: 'pillar:stem-learning',
    slug: 'stem-learning',
    alt: 'A facilitator leading a STEM session for a full classroom of secondary school students.',
    tags: ['stem', 'training', 'pillar'],
  },
  {
    file: 'IMG_0427.JPEG',
    slot: 'site:impact-banner',
    slug: 'impact-banner',
    alt: 'Secondary school students and Impact Africa Alliance facilitators together after a school visit.',
    tags: ['impact', 'banner', 'schools'],
  },
];

// Wide enough for a full-bleed banner on a large display, without shipping a
// 3.5 MB phone photograph to every visitor.
const MAX_WIDTH = 2000;
const FOLDER = `${process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'iaa'}/site`;

const uri = process.env.MONGODB_URI_DIRECT ?? process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Optimise in memory; nothing is written beside the original. */
const optimise = async (file) => {
  const input = readFileSync(file);
  const pipeline = sharp(input).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const buffer = await pipeline.webp({ quality: 82 }).toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width, height: meta.height, bytes: buffer.length };
};

const uploadBuffer = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: FOLDER, public_id: publicId, overwrite: true, resource_type: 'image' },
        (error, result) => (error ? reject(error) : resolve(result)),
      )
      .end(buffer);
  });

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20_000 });
  const db = mongoose.connection.db;
  const pillarImages = db.collection('pillarimages');
  const siteImages = db.collection('siteimages');
  const mediaItems = db.collection('mediaitems');

  console.log(confirm ? 'MODE: CONFIRM\n' : 'MODE: dry-run (pass --confirm)\n');

  for (const job of JOBS) {
    const source = path.resolve(job.file);
    const { buffer, width, height, bytes } = await optimise(source);
    const sizeIn = readFileSync(source).length;
    console.log(
      `${job.file}  ${(sizeIn / 1024 / 1024).toFixed(1)}MB -> ${(bytes / 1024).toFixed(0)}KB  ${width}x${height}  ->  ${job.slot}`,
    );
    if (!confirm) continue;

    const uploaded = await uploadBuffer(buffer, job.slug);
    const now = new Date();
    const asset = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      alt: job.alt,
    };

    // Into the library first, so the picture is reusable even if the slot
    // write is changed later.
    await mediaItems.updateOne(
      { publicId: asset.publicId },
      {
        $set: {
          url: asset.url,
          filename: job.file,
          folder: 'site',
          altText: job.alt,
          tags: job.tags,
          width: asset.width,
          height: asset.height,
          bytes: uploaded.bytes,
          format: uploaded.format,
          updatedAt: now,
        },
        $setOnInsert: { publicId: asset.publicId, createdAt: now },
      },
      { upsert: true },
    );

    const [kind, key] = job.slot.split(':');
    const collection = kind === 'pillar' ? pillarImages : siteImages;
    const keyField = kind === 'pillar' ? 'pillarKey' : 'key';
    await collection.updateOne(
      { [keyField]: key },
      {
        $set: { image: asset, alt: job.alt, isActive: true, updatedAt: now },
        $setOnInsert: { [keyField]: key, createdAt: now },
      },
      { upsert: true },
    );
    console.log(`  -> ${asset.url}`);
  }

  await mongoose.disconnect();
  console.log(confirm ? '\nDone.' : '\nDry run only. Re-run with --confirm to upload and write.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

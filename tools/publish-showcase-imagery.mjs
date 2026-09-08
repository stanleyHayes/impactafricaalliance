#!/usr/bin/env node
// Dry-run by default. Only the six manifest slots are changed.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolveSrv } from 'node:dns/promises';
import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import mongoose from 'mongoose';
import sharp from 'sharp';

const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
config({ path: envIndex >= 0 ? args[envIndex + 1] : 'apps/api/.env.production', quiet: true });
const jobs = JSON.parse(readFileSync(new URL('./showcase-imagery.json', import.meta.url)));
const confirm = args.includes('--confirm');

async function run() {
  const assets = await Promise.all(
    jobs.map(async (job) => {
      const buffer = readFileSync(job.file);
      const meta = await sharp(buffer).metadata();
      console.log(`${job.key}: ${meta.width}x${meta.height}, ${buffer.length} bytes`);
      return { job, buffer };
    }),
  );
  let uri = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI;
  if (!uri) throw new Error('MongoDB configuration is missing');
  if (uri.startsWith('mongodb+srv://')) {
    const parsed = new URL(uri);
    const hosts = await resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
    const params = parsed.searchParams;
    params.set('tls', 'true');
    if (!params.has('authSource')) params.set('authSource', 'admin');
    uri = `mongodb://${parsed.username}:${parsed.password}@${hosts.map((host) => `${host.name}:${host.port}`).join(',')}${parsed.pathname || '/'}?${params}`;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const slots = db.collection('siteimages');
  const keys = jobs.map((job) => job.key);
  const before = await slots.find({ key: { $in: keys } }).toArray();
  console.log(
    `Found ${before.length} existing CMS slots. Mode: ${confirm ? 'publish' : 'dry-run'}`,
  );
  if (!confirm) return;
  mkdirSync('output/showcase-imagery', { recursive: true });
  const backup = `output/showcase-imagery/before-${Date.now()}.json`;
  writeFileSync(backup, JSON.stringify(before, null, 2), { mode: 0o600 });
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  for (const { job, buffer } of assets) {
    const uploaded = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER || 'iaa'}/site`,
            public_id: `${job.key}-generated-v2`,
            overwrite: false,
            resource_type: 'image',
          },
          (error, result) => (error ? reject(error) : resolve(result)),
        )
        .end(buffer);
    });
    const image = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      alt: job.alt,
    };
    const now = new Date();
    await db.collection('mediaitems').updateOne(
      { publicId: image.publicId },
      {
        $set: {
          url: image.url,
          filename: job.file.split('/').pop(),
          folder: 'site',
          altText: job.alt,
          tags: ['showcase', 'ai-generated', job.key],
          width: image.width,
          height: image.height,
          bytes: uploaded.bytes,
          format: uploaded.format,
          updatedAt: now,
        },
        $setOnInsert: { publicId: image.publicId, createdAt: now },
      },
      { upsert: true },
    );
    await slots.updateOne(
      { key: job.key },
      {
        $set: { image, alt: job.alt, isActive: true, updatedAt: now },
        $setOnInsert: { key: job.key, createdAt: now },
      },
      { upsert: true },
    );
    const saved = await slots.findOne({ key: job.key });
    if (saved.image.url !== image.url || !saved.isActive)
      throw new Error(`Verification failed: ${job.key}`);
    console.log(`Verified ${job.key}: ${image.url}`);
  }
  console.log(`Published all six slots. Previous records saved to ${backup}`);
}
try {
  await run();
} catch (error) {
  console.error(
    `Showcase publishing failed (${error.name}). Check connectivity and configuration.`,
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

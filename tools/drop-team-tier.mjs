#!/usr/bin/env node
/**
 * Drop the retired `tier` field from existing team member documents.
 *
 * `tier` (leadership / advisory / country) was removed from the team schema —
 * nothing groups, sorts or filters by it any more. Mongoose ignores the leftover
 * field, so this is housekeeping rather than a fix: it removes the stale value
 * and the `tier_1` index the old schema's `index: true` created, which Mongoose
 * does NOT drop on its own when a field disappears from the schema.
 *
 * DRY-RUN by default — reports what it would change without modifying anything.
 * Pass --confirm to apply.
 *
 * Usage (from repo root):
 *   node tools/drop-team-tier.mjs                      # dry-run against apps/api/.env.production
 *   node tools/drop-team-tier.mjs --env apps/api/.env  # dry-run against another env file
 *   node tools/drop-team-tier.mjs --confirm            # apply the $unset and drop the index
 */
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import process from 'node:process';

const COLLECTION = 'teammembers';
const FIELD = 'tier';
const INDEX = 'tier_1';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlagIndex = args.indexOf('--env');
const envFile = envFlagIndex !== -1 ? args[envFlagIndex + 1] : 'apps/api/.env.production';

loadEnv({ path: envFile });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(`MONGODB_URI not found (env file: ${envFile})`);
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const names = new Set((await db.listCollections().toArray()).map((c) => c.name));

  console.log(
    confirm ? 'MODE: CONFIRM — changes WILL be applied\n' : 'MODE: dry-run (pass --confirm to apply)\n',
  );

  if (!names.has(COLLECTION)) {
    console.log(`${COLLECTION}: collection not found — nothing to do.`);
    return;
  }

  const collection = db.collection(COLLECTION);
  const filter = { [FIELD]: { $exists: true } };
  const affected = await collection.countDocuments(filter);

  if (affected === 0) {
    console.log(`${COLLECTION}: no document still carries "${FIELD}".`);
  } else {
    const sample = await collection
      .find(filter, { projection: { name: 1, role: 1, [FIELD]: 1 } })
      .limit(10)
      .toArray();
    console.log(`${COLLECTION}: ${affected} document(s) still carry "${FIELD}":`);
    for (const doc of sample) {
      console.log(`  ${doc.name ?? '(unnamed)'} — ${doc.role ?? '?'} [${FIELD}=${doc[FIELD]}]`);
    }
    if (affected > sample.length) {
      console.log(`  …and ${affected - sample.length} more`);
    }

    if (confirm) {
      const { modifiedCount } = await collection.updateMany(filter, { $unset: { [FIELD]: '' } });
      console.log(`${COLLECTION}: unset "${FIELD}" on ${modifiedCount} document(s)`);
    } else {
      console.log(`${COLLECTION}: "${FIELD}" would be unset on ${affected} document(s)`);
    }
  }

  // The old schema declared `tier: { index: true }`. Removing the field from the
  // schema leaves that index behind, so clear it explicitly.
  const indexes = await collection.indexes();
  const hasIndex = indexes.some((i) => i.name === INDEX);
  if (!hasIndex) {
    console.log(`${COLLECTION}: index "${INDEX}" not present — nothing to drop.`);
  } else if (confirm) {
    await collection.dropIndex(INDEX);
    console.log(`${COLLECTION}: dropped index "${INDEX}"`);
  } else {
    console.log(`${COLLECTION}: index "${INDEX}" would be dropped`);
  }

  console.log(confirm ? '\nDone.' : '\nDry-run complete. Re-run with --confirm to apply.');
};

run()
  .catch((error) => {
    console.error('Drop failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

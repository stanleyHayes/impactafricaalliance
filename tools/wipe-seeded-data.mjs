#!/usr/bin/env node
/**
 * Wipe seeded content from the IAA database.
 *
 * Deletes every document in: Articles (News & Blog), Stories (Impact Stories),
 * Team, Partners, Reports, Jobs (Careers), Submissions, Subscribers, Donations,
 * and all Users EXCEPT any user whose email or name contains KEEP_USER_MATCH
 * (default: hayfordstanley). Page settings, site settings, events, gallery and
 * impact stats are left untouched.
 *
 * DRY-RUN by default — prints per-collection counts and the users that would be
 * kept/deleted without modifying anything. Pass --confirm to actually delete.
 *
 * Usage (from repo root):
 *   node tools/wipe-seeded-data.mjs                      # dry-run against apps/api/.env.production
 *   node tools/wipe-seeded-data.mjs --env apps/api/.env  # dry-run against another env file
 *   node tools/wipe-seeded-data.mjs --confirm            # DESTRUCTIVE: perform the deletions
 */
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import process from 'node:process';

const KEEP_USER_MATCH = /hayford/i;

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

const COLLECTIONS = ['articles', 'stories', 'teammembers', 'partners', 'reports', 'jobs', 'submissions', 'subscribers', 'donations'];

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const existing = await db.listCollections().toArray();
  const names = new Set(existing.map((c) => c.name));

  console.log(confirm ? 'MODE: CONFIRM — deletions WILL be applied\n' : 'MODE: dry-run (pass --confirm to delete)\n');

  for (const name of COLLECTIONS) {
    if (!names.has(name)) {
      console.log(`${name}: collection not found — skipped`);
      continue;
    }
    const collection = db.collection(name);
    const count = await collection.countDocuments();
    if (confirm) {
      const { deletedCount } = await collection.deleteMany({});
      console.log(`${name}: deleted ${deletedCount} document(s)`);
    } else {
      console.log(`${name}: ${count} document(s) would be deleted`);
    }
  }

  if (names.has('users')) {
    const users = db.collection('users');
    const all = await users.find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    const keep = all.filter((u) => KEEP_USER_MATCH.test(u.email ?? '') || KEEP_USER_MATCH.test(u.name ?? ''));
    const remove = all.filter((u) => !keep.includes(u));

    console.log('\nusers:');
    for (const u of keep) {
      console.log(`  KEEP    ${u.email ?? '(no email)'} (${u.name ?? 'unnamed'}, ${u.role ?? '?'})`);
    }
    for (const u of remove) {
      console.log(`  DELETE  ${u.email ?? '(no email)'} (${u.name ?? 'unnamed'}, ${u.role ?? '?'})`);
    }
    if (keep.length === 0) {
      console.error('\nABORT: no user matches the keep filter — refusing to delete all users.');
      process.exitCode = 1;
      return;
    }
    if (confirm) {
      const { deletedCount } = await users.deleteMany({
        _id: { $in: remove.map((u) => u._id) },
      });
      console.log(`users: deleted ${deletedCount} document(s), kept ${keep.length}`);
    } else {
      console.log(`users: ${remove.length} would be deleted, ${keep.length} kept`);
    }
  }

  console.log(confirm ? '\nDone.' : '\nDry-run complete. Re-run with --confirm to apply.');
};

run()
  .catch((error) => {
    console.error('Wipe failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

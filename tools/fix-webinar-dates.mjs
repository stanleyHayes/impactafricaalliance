#!/usr/bin/env node
/**
 * Correct the webinar dates after the 5 September update to the review doc.
 *
 * All four sessions moved. Matching is by title rather than id so this works
 * against any environment, and it reports anything it cannot find rather than
 * silently doing nothing.
 *
 * DRY-RUN by default. Pass --confirm to write.
 */
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import process from 'node:process';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
loadEnv({ path: envFlag !== -1 ? args[envFlag + 1] : 'apps/api/.env.production' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found');
  process.exit(1);
}

// Doc order changed too: Scholarships moved earlier, Scaling moved to October.
const MOVES = [
  { match: /Leveraging AI/i, startAt: '2026-09-11T17:00:00.000Z', label: 'Leveraging AI' },
  { match: /Scholarships, Fellowships/i, startAt: '2026-09-18T17:00:00.000Z', label: 'Scholarships' },
  { match: /Ready for Work/i, startAt: '2026-09-25T17:00:00.000Z', label: 'Ready for Work' },
  { match: /Scaling Your Business/i, startAt: '2026-10-02T17:00:00.000Z', label: 'Scaling Business' },
];

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const events = mongoose.connection.db.collection('events');
  console.log(confirm ? 'MODE: CONFIRM — writes WILL be applied\n' : 'MODE: dry-run (pass --confirm to apply)\n');

  const all = await events.find({}).toArray();
  let changed = 0;

  for (const move of MOVES) {
    const doc = all.find((e) => move.match.test(e.title));
    if (!doc) {
      console.log(`${move.label}: NOT FOUND — skipped`);
      continue;
    }
    const current = new Date(doc.startAt).toISOString();
    const next = new Date(move.startAt).toISOString();
    if (current === next) {
      console.log(`${move.label}: already ${next.slice(0, 10)} — skipped`);
      continue;
    }
    changed += 1;
    if (confirm) {
      await events.updateOne(
        { _id: doc._id },
        { $set: { startAt: new Date(move.startAt), updatedAt: new Date() } },
      );
      console.log(`${move.label}: ${current.slice(0, 10)} -> ${next.slice(0, 10)}`);
    } else {
      console.log(`${move.label}: would move ${current.slice(0, 10)} -> ${next.slice(0, 10)}`);
    }
  }

  console.log(
    changed === 0
      ? '\nNothing to change.'
      : confirm
        ? `\nDone. ${changed} event(s) moved.`
        : `\nDry-run complete. ${changed} would move. Re-run with --confirm.`,
  );
};

run()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

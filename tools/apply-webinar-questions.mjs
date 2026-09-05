#!/usr/bin/env node
/**
 * Attach each webinar's own questionnaire, from the 5 September update to the
 * review doc.
 *
 * Section 1 ("About You") is asked by every event and lives in the registration
 * schema itself, so it is NOT repeated here. These are the session-specific
 * sections: the shared journey questions, the topical section for that webinar,
 * and the closing community questions.
 *
 * Matched by title so it works against any environment. Replaces an event's
 * question list wholesale, which is what makes it safe to re-run.
 *
 * DRY-RUN by default. Pass --confirm to write.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
loadEnv({ path: envFlag !== -1 ? args[envFlag + 1] : 'apps/api/.env.production' });

const setsFlag = args.indexOf('--sets');
const setsPath = setsFlag !== -1 ? args[setsFlag + 1] : 'tools/webinar-questions.json';
const SETS = JSON.parse(readFileSync(setsPath, 'utf-8'));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found');
  process.exit(1);
}

const clean = (question) => ({
  id: question.id,
  label: question.label,
  type: question.type,
  options: question.options ?? [],
  required: Boolean(question.required),
  ...(question.helpText ? { helpText: question.helpText } : {}),
});

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const events = mongoose.connection.db.collection('events');
  console.log(confirm ? 'MODE: CONFIRM — writes WILL be applied\n' : 'MODE: dry-run (pass --confirm to apply)\n');

  const all = await events.find({}).toArray();

  for (const [titleFragment, questions] of Object.entries(SETS)) {
    const doc = all.find((e) => e.title.includes(titleFragment));
    if (!doc) {
      console.log(`${titleFragment}: NOT FOUND — skipped`);
      continue;
    }
    const next = questions.map(clean);
    const before = (doc.questions ?? []).length;
    if (confirm) {
      await events.updateOne(
        { _id: doc._id },
        { $set: { questions: next, registrationEnabled: true, updatedAt: new Date() } },
      );
      console.log(`${titleFragment}: ${before} -> ${next.length} question(s)`);
    } else {
      console.log(`${titleFragment}: would go ${before} -> ${next.length} question(s)`);
      next.forEach((q) => console.log(`   - [${q.type}] ${q.label.slice(0, 62)}`));
    }
  }

  console.log(confirm ? '\nDone.' : '\nDry-run complete. Re-run with --confirm to apply.');
};

run()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

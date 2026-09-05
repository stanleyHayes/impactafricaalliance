#!/usr/bin/env node
/**
 * Re-apply each user's role template to their stored permission list.
 *
 * Permissions are persisted per user, not derived from the role at request
 * time, so adding a resource to AdminResource grants nothing to accounts that
 * already exist. This backfills them.
 *
 * Only ever ADDS permissions their role template entitles them to; it never
 * removes any, so a hand-tailored account keeps its extras.
 *
 * DRY-RUN by default. Pass --confirm to write.
 */
import process from 'node:process';

import { ROLE_TEMPLATES } from '@iaa/shared';
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
loadEnv({ path: envFlag !== -1 ? args[envFlag + 1] : 'apps/api/.env.production' });

const uri = process.env.MONGODB_URI_DIRECT ?? process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found');
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const users = mongoose.connection.db.collection('users');
  console.log(confirm ? 'MODE: CONFIRM\n' : 'MODE: dry-run (pass --confirm)\n');

  for (const user of await users.find({}).toArray()) {
    const template = ROLE_TEMPLATES[user.role] ?? [];
    const current = new Set(user.permissions ?? []);
    const missing = template.filter((permission) => !current.has(permission));
    if (missing.length === 0) {
      console.log(`${user.email}: up to date (${current.size})`);
      continue;
    }
    if (confirm) {
      await users.updateOne(
        { _id: user._id },
        { $set: { permissions: [...current, ...missing], updatedAt: new Date() } },
      );
      console.log(`${user.email}: +${missing.length} -> ${current.size + missing.length}`);
    } else {
      console.log(`${user.email}: would add ${missing.length}: ${missing.join(', ')}`);
    }
  }
  console.log(confirm ? '\nDone.' : '\nDry-run complete.');
};

run()
  .catch((error) => { console.error('Failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());

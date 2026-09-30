import 'reflect-metadata';

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';

import { CounterModel } from './common/counter.model.js';
import { loadConfig } from './config/env.js';
import { AuditEventModel } from './modules/audit/audit.model.js';
import { SiteImageModel } from './modules/content/models/site-image.model.js';
import { FormSubmissionModel } from './modules/forms/form-submission.model.js';
import { FormVersionModel } from './modules/forms/form-version.model.js';
import { FormModel } from './modules/forms/form.model.js';
import { ImpactStoryModel } from './modules/impact-stories/impact-story.model.js';
import { ProjectModel } from './modules/projects/project.model.js';
import { TaskCommentModel } from './modules/tasks/task-comment.model.js';
import { TaskModel } from './modules/tasks/task.model.js';

/**
 * Build the indexes the admin platform expansion declares (plan D11).
 *
 * Production connects with `autoIndex` off and nothing else builds indexes,
 * so without this a new collection would have no unique slug, no unique task
 * key and no TTL on abandoned drafts. Run once per environment after a deploy
 * and before the permission backfill:
 *
 *   npm run indexes:sync -w @iaa/api                 # dry run: what exists, what would be built
 *   npm run indexes:sync -w @iaa/api -- --confirm    # build the missing ones
 *
 * Reads `apps/api/.env` unless `--env <file>` names another. It only ever
 * creates indexes; it never drops one, so an index someone added by hand
 * stays.
 */

/** The parts of a Mongoose model this script uses, whatever its document type. */
interface IndexedModel {
  modelName: string;
  collection: { collectionName: string };
  schema: { indexes(): [Record<string, unknown>, Record<string, unknown>][] };
  listIndexes(): Promise<{ key: Record<string, unknown> }[]>;
  createIndexes(): Promise<unknown>;
}

const MODELS: readonly IndexedModel[] = [
  ProjectModel,
  TaskModel,
  TaskCommentModel,
  FormModel,
  FormVersionModel,
  FormSubmissionModel,
  ImpactStoryModel,
  AuditEventModel,
  CounterModel,
  // One record per site image slot. The collection is older than this
  // script, and without the unique key a second upload for a slot could be
  // saved beside the first rather than refused.
  SiteImageModel,
];

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
const envPath = envFlag === -1 ? undefined : args[envFlag + 1];

const write = (line = ''): void => {
  process.stdout.write(`${line}\n`);
};

const describeKey = (key: Record<string, unknown>): string => JSON.stringify(key);

// The options that change what an index does, so the dry run shows them.
const describeOptions = (options: Record<string, unknown>): string => {
  const notes: string[] = [];
  if (options.unique) {
    notes.push('unique');
  }
  if (options.partialFilterExpression) {
    notes.push(`partial ${JSON.stringify(options.partialFilterExpression)}`);
  }
  if (typeof options.expireAfterSeconds === 'number') {
    notes.push(`TTL ${options.expireAfterSeconds}s`);
  }
  return notes.length > 0 ? ` (${notes.join(', ')})` : '';
};

/** The keys of the indexes a collection already has, or null when it does not exist yet. */
const existingKeys = async (model: IndexedModel): Promise<Set<string> | null> => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Not connected to a database');
  }
  const collections = await db
    .listCollections({ name: model.collection.collectionName }, { nameOnly: true })
    .toArray();
  if (collections.length === 0) {
    return null;
  }
  const indexes = await model.listIndexes();
  return new Set(indexes.map((index) => describeKey(index.key)));
};

/** Report one model and, with --confirm, build what it is missing. True when nothing failed. */
const syncModel = async (model: IndexedModel): Promise<boolean> => {
  const declared = model.schema.indexes();
  try {
    const existing = await existingKeys(model);
    write(
      `${model.modelName} (${model.collection.collectionName})${existing ? '' : ' — collection not created yet'}`,
    );
    let missing = 0;
    for (const [key, options] of declared) {
      const present = existing?.has(describeKey(key)) ?? false;
      missing += present ? 0 : 1;
      write(`  ${present ? 'exists ' : 'missing'} ${describeKey(key)}${describeOptions(options)}`);
    }
    if (declared.length === 0) {
      write('  (no indexes beyond _id)');
    }
    if (confirm && missing > 0) {
      await model.createIndexes();
      write(`  built ${missing}`);
    }
    return true;
  } catch (error) {
    // Most often an existing index with the same keys but other options,
    // which createIndexes will not replace. Reported, never dropped.
    write(`  FAILED: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

const run = async (): Promise<void> => {
  loadEnv(envPath ? { path: envPath, quiet: true } : { quiet: true });
  const config = loadConfig();
  // Not connectDatabase: outside production it turns autoIndex on, and
  // Mongoose would then build every index the moment a model is used, which
  // would make the dry run write. autoCreate off keeps it from creating
  // empty collections too.
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: false,
    autoCreate: false,
  });
  try {
    write(
      confirm
        ? 'MODE: confirm — building missing indexes'
        : 'MODE: dry run (pass --confirm to build)',
    );
    write(`Database: ${mongoose.connection.name} on ${mongoose.connection.host}`);
    write();
    let failures = 0;
    for (const model of MODELS) {
      failures += (await syncModel(model)) ? 0 : 1;
    }
    write();
    write(failures === 0 ? 'Done.' : `Finished with ${failures} failure(s).`);
    if (failures > 0) {
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error: unknown) => {
  process.stderr.write(
    `Index sync failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});

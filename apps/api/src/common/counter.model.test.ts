import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CounterModel, nextSequence } from './counter.model.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT ??= '60000';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await CounterModel.deleteMany({}).exec();
});

describe('nextSequence', () => {
  it('starts at 1 and counts up', async () => {
    expect(await nextSequence('task')).toBe(1);
    expect(await nextSequence('task')).toBe(2);
    expect(await nextSequence('task')).toBe(3);
  });

  it('keeps each named counter separate', async () => {
    await nextSequence('task');
    await nextSequence('task');
    expect(await nextSequence('application')).toBe(1);
  });

  it('never hands out the same number twice, even all at once', async () => {
    const numbers = await Promise.all(Array.from({ length: 25 }, () => nextSequence('task')));
    expect(new Set(numbers).size).toBe(25);
    expect(Math.max(...numbers)).toBe(25);
  });
});

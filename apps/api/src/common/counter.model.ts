import { Schema, model } from 'mongoose';

/**
 * A named running number, such as the one behind task keys (`IAA-42`).
 *
 * `_id` is the counter's name, so each counter is exactly one document and the
 * name needs no index of its own.
 */
export interface CounterDocument {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDocument>(
  {
    _id: { type: String, required: true },
    // No default: the first increment creates the document, and a default
    // would compete with `$inc` for the same field on that insert.
    seq: { type: Number, required: true },
  },
  // Deliberately not baseSchemaOptions: a counter is never sent to a client,
  // and timestamps would add a write to every number handed out.
  { collection: 'counters', versionKey: false },
);

export const CounterModel = model<CounterDocument>('Counter', counterSchema);

// MongoDB error code for a unique index violation.
const DUPLICATE_KEY = 11000;

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === DUPLICATE_KEY;

/**
 * The next number in a named sequence, starting at 1.
 *
 * One atomic `findOneAndUpdate` with `$inc`, so two tasks created in the same
 * instant can never draw the same number, with no transaction (the test
 * database runs without a replica set, where transactions are unavailable).
 * Numbers are never reused: one drawn for a create that then fails is simply
 * skipped.
 *
 * The very first call for a name races to create the document. The server
 * retries that race itself on most versions; the single retry here covers
 * the ones that report the duplicate instead.
 */
export const nextSequence = async (name: string): Promise<number> => {
  const increment = () =>
    CounterModel.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    )
      .lean<CounterDocument>()
      .exec();
  let counter: CounterDocument | null;
  try {
    counter = await increment();
  } catch (error) {
    if (!isDuplicateKey(error)) {
      throw error;
    }
    counter = await increment();
  }
  if (!counter) {
    throw new Error(`Counter ${name} did not return a value`);
  }
  return counter.seq;
};

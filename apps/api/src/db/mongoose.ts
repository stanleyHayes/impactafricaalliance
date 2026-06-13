import mongoose from 'mongoose';

import type { AppConfig } from '../config/env.js';
import type { AppLogger } from '../config/logger.js';

/** Open the MongoDB connection. Idempotent — safe to call once at boot. */
export const connectDatabase = async (
  config: AppConfig,
  logger: AppLogger,
): Promise<typeof mongoose> => {
  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: !config.isProduction,
  });
  logger.info('Connected to MongoDB');
  return connection;
};

/** Close the MongoDB connection during graceful shutdown. */
export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};

import 'reflect-metadata';

import { UserRole } from '@iaa/shared';

import { loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './db/mongoose.js';
import { PasswordService } from './modules/auth/password.service.js';
import { UserModel } from './modules/users/user.model.js';

/** Idempotently create the first administrator account from environment config. */
const seed = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger(config.env);
  await connectDatabase(config, logger);

  try {
    const existing = await UserModel.findOne({ email: config.seedAdmin.email }).exec();
    if (existing) {
      logger.info(`Admin ${config.seedAdmin.email} already exists — nothing to seed`);
      return;
    }
    const passwordHash = await new PasswordService().hash(config.seedAdmin.password);
    await UserModel.create({
      name: config.seedAdmin.name,
      email: config.seedAdmin.email,
      passwordHash,
      role: UserRole.Admin,
    });
    logger.info(`Seeded admin user ${config.seedAdmin.email}`);
  } finally {
    await disconnectDatabase();
  }
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

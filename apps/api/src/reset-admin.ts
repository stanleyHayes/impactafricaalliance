import 'reflect-metadata';
import 'dotenv/config';

import { createInterface } from 'node:readline/promises';

import { ROLE_TEMPLATES, UserRole } from '@iaa/shared';
import mongoose from 'mongoose';

import { PasswordService } from './modules/auth/password.service.js';
import { UserModel } from './modules/users/user.model.js';

const DEFAULT_ADMIN_EMAIL = 'admin@impactafricaalliance.org';
const MIN_PASSWORD_LENGTH = 10;

const resetAdmin = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  const email = (process.argv[2] ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const password = await prompt.question(`New password for ${email}: `);
  prompt.close();

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const passwordHash = await new PasswordService().hash(password);
    const admin = await UserModel.findOneAndUpdate(
      { email },
      {
        $set: {
          name: 'IAA Administrator',
          passwordHash,
          role: UserRole.Admin,
          permissions: ROLE_TEMPLATES[UserRole.Admin],
          isActive: true,
          mfaEnabled: false,
          refreshTokens: [],
        },
        $unset: {
          mfaSecret: 1,
          mfaTempSecret: 1,
          mfaRecoveryCodes: 1,
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).exec();

    if (!admin) {
      throw new Error('Admin reset did not return a user');
    }

    const verified = await new PasswordService().compare(password, admin.passwordHash);
    if (!verified || admin.role !== UserRole.Admin || !admin.isActive) {
      throw new Error('Admin reset verification failed');
    }

    process.stdout.write(`\nAdmin ${email} reset and verified.\n`);
  } finally {
    await mongoose.disconnect();
  }
};

resetAdmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown admin reset error';
  process.stderr.write(`\nAdmin reset failed: ${message}\n`);
  process.exitCode = 1;
});

import type { CreateUserInput, Permission, UpdateUserInput, UserRole } from '@iaa/shared';
import { injectable } from 'tsyringe';

import { UserModel, type RefreshTokenRecord, type UserHydrated } from './user.model.js';

export interface NewUserData extends Omit<CreateUserInput, 'password'> {
  passwordHash: string;
  permissions: Permission[];
}

const MAX_REFRESH_TOKENS = 10;

/** Data-access boundary for the `users` collection. */
@injectable()
export class UserRepository {
  findById(id: string): Promise<UserHydrated | null> {
    return UserModel.findById(id).exec();
  }

  findByEmail(email: string): Promise<UserHydrated | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findByRefreshTokenHash(tokenHash: string): Promise<UserHydrated | null> {
    return UserModel.findOne({ 'refreshTokens.tokenHash': tokenHash }).exec();
  }

  findAll(): Promise<UserHydrated[]> {
    return UserModel.find().sort({ createdAt: -1 }).exec();
  }

  create(data: NewUserData): Promise<UserHydrated> {
    return UserModel.create(data);
  }

  async update(id: string, changes: UpdateUserInput): Promise<UserHydrated | null> {
    return UserModel.findByIdAndUpdate(id, changes, { new: true }).exec();
  }

  async updatePermissions(id: string, role: UserRole, permissions: Permission[]): Promise<UserHydrated | null> {
    return UserModel.findByIdAndUpdate(id, { role, permissions }, { new: true }).exec();
  }

  async updateProfile(
    id: string,
    changes: { name?: string; email?: string },
  ): Promise<UserHydrated | null> {
    return UserModel.findByIdAndUpdate(id, changes, { new: true }).exec();
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { passwordHash }).exec();
  }

  async addRefreshToken(
    id: string,
    token: RefreshTokenRecord,
  ): Promise<void> {
    // Remove expired tokens and cap the number of stored tokens per user.
    await UserModel.updateOne(
      { _id: id },
      {
        $push: {
          refreshTokens: {
            $each: [token],
            $slice: -MAX_REFRESH_TOKENS,
          },
        },
      },
    ).exec();
    await UserModel.updateOne(
      { _id: id },
      { $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } } },
    ).exec();
  }

  async removeRefreshToken(id: string, tokenHash: string): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { $pull: { refreshTokens: { tokenHash } } },
    ).exec();
  }

  async revokeRefreshTokenFamily(id: string, family: string): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { $pull: { refreshTokens: { family } } },
    ).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  count(role?: UserRole): Promise<number> {
    return UserModel.countDocuments(role ? { role } : {}).exec();
  }

  async setMfaTempSecret(id: string, tempSecret: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { mfaTempSecret: tempSecret }).exec();
  }

  async enableMfa(
    id: string,
    secret: string,
    recoveryCodes: string[],
  ): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { mfaEnabled: true, mfaSecret: secret, mfaRecoveryCodes: recoveryCodes, mfaTempSecret: undefined },
    ).exec();
  }

  async disableMfa(id: string): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { mfaEnabled: false, mfaSecret: undefined, mfaTempSecret: undefined, mfaRecoveryCodes: undefined },
    ).exec();
  }

  async removeRecoveryCode(id: string, index: number): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $unset: { [`mfaRecoveryCodes.${index}`]: 1 } }).exec();
    await UserModel.updateOne({ _id: id }, { $pull: { mfaRecoveryCodes: null } }).exec();
  }

  async setPasswordResetToken(id: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    ).exec();
  }

  async findByPasswordResetTokenHash(tokenHash: string): Promise<UserHydrated | null> {
    return UserModel.findOne({ passwordResetTokenHash: tokenHash }).exec();
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
    ).exec();
  }
}

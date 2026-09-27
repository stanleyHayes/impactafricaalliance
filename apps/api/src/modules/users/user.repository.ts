import type { CreateUserInput, Permission, UpdateUserInput, UserRole } from '@iaa/shared';
import type { Types } from 'mongoose';
import { injectable } from 'tsyringe';

import { searchRegex } from '../../common/regex.js';

import { UserModel, type RefreshTokenRecord, type UserHydrated } from './user.model.js';

export interface NewUserData extends Omit<CreateUserInput, 'password'> {
  passwordHash: string;
  permissions: Permission[];
}

/**
 * The few fields the people directory reads. Never the password hash, tokens,
 * MFA secrets or permissions: the projection is what keeps them out, not a
 * transform applied afterwards.
 */
export interface UserSummaryRow {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface DirectoryQuery {
  q?: string;
  ids?: readonly string[];
  page: number;
  pageSize: number;
}

const SUMMARY_PROJECTION = { name: 1, email: 1, role: 1, isActive: 1 } as const;

// Sorts "ama" beside "Ama" rather than after every capitalised name.
const NAME_COLLATION = { locale: 'en', strength: 2 } as const;

const OBJECT_ID = /^[a-f\d]{24}$/i;

// `$ne: false` rather than `true`, so an account saved before the flag existed
// still counts as active, as it does at login.
const ACTIVE = { $ne: false } as const;

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

  /**
   * A page of the people directory: active accounts only, sorted by name.
   * `q` matches part of a name or email in any case, as literal text; `ids`
   * narrows to the people already attached to a record.
   */
  async findDirectory({
    q,
    ids,
    page,
    pageSize,
  }: DirectoryQuery): Promise<{ items: UserSummaryRow[]; total: number }> {
    const filter: Record<string, unknown> = { isActive: ACTIVE };
    if (q) {
      const pattern = searchRegex(q);
      filter.$or = [{ name: pattern }, { email: pattern }];
    }
    if (ids) {
      filter._id = { $in: ids.filter((id) => OBJECT_ID.test(id)) };
    }
    const [items, total] = await Promise.all([
      UserModel.find(filter, SUMMARY_PROJECTION)
        .collation(NAME_COLLATION)
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<UserSummaryRow[]>()
        .exec(),
      UserModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  /**
   * The directory fields for a set of ids, in no particular order. Ids that
   * are not ObjectIds are skipped rather than failing the query, since they
   * come from stored records that may predate a check.
   */
  findSummaries(
    ids: readonly string[],
    options: { activeOnly?: boolean } = {},
  ): Promise<UserSummaryRow[]> {
    const valid = ids.filter((id) => OBJECT_ID.test(id));
    if (valid.length === 0) {
      return Promise.resolve([]);
    }
    const filter: Record<string, unknown> = { _id: { $in: valid } };
    if (options.activeOnly) {
      filter.isActive = ACTIVE;
    }
    return UserModel.find(filter, SUMMARY_PROJECTION).lean<UserSummaryRow[]>().exec();
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

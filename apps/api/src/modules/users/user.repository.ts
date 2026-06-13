import type { CreateUserInput, UpdateUserInput, UserRole } from '@iaa/shared';
import { injectable } from 'tsyringe';

import { UserModel, type UserHydrated } from './user.model.js';

export interface NewUserData extends Omit<CreateUserInput, 'password'> {
  passwordHash: string;
}

/** Data-access boundary for the `users` collection. */
@injectable()
export class UserRepository {
  findById(id: string): Promise<UserHydrated | null> {
    return UserModel.findById(id).exec();
  }

  findByEmail(email: string): Promise<UserHydrated | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
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

  async updateProfile(
    id: string,
    changes: { name?: string; email?: string },
  ): Promise<UserHydrated | null> {
    return UserModel.findByIdAndUpdate(id, changes, { new: true }).exec();
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { passwordHash }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  count(role?: UserRole): Promise<number> {
    return UserModel.countDocuments(role ? { role } : {}).exec();
  }
}

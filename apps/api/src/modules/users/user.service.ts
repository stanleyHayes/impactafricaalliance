import {
  ROLE_TEMPLATES,
  UserRole,
  type CreateUserInput,
  type Permission,
  type PublicUser,
  type UpdateUserInput,
  type UpdateUserPermissionsInput,
  type UserRole as UserRoleType,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { ConflictError, NotFoundError, ValidationError } from '../../common/errors.js';
import { PasswordService } from '../auth/password.service.js';

import { toPublicUser } from './user.model.js';
import { UserRepository } from './user.repository.js';

/** Admin-only management of console users. */
@injectable()
export class UserService {
  constructor(
    @inject(UserRepository) private readonly users: UserRepository,
    @inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  async list(): Promise<PublicUser[]> {
    const docs = await this.users.findAll();
    return docs.map(toPublicUser);
  }

  derivePermissions(role: UserRoleType, overrides?: Permission[]): Permission[] {
    return overrides?.length ? overrides : ROLE_TEMPLATES[role];
  }

  async create(input: CreateUserInput): Promise<PublicUser> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }
    const passwordHash = await this.passwords.hash(input.password);
    const created = await this.users.create({
      name: input.name,
      email: input.email,
      role: input.role,
      permissions: this.derivePermissions(input.role),
      passwordHash,
    });
    return toPublicUser(created);
  }

  async updatePermissions(id: string, input: UpdateUserPermissionsInput): Promise<PublicUser> {
    if (input.role !== UserRole.Admin) {
      await this.guardLastAdmin(id);
    }
    const updated = await this.users.updatePermissions(id, input.role, input.permissions);
    if (!updated) {
      throw new NotFoundError('User');
    }
    return toPublicUser(updated);
  }

  async update(id: string, input: UpdateUserInput): Promise<PublicUser> {
    if (input.role && input.role !== UserRole.Admin) {
      await this.guardLastAdmin(id);
    }
    if (input.isActive === false) {
      await this.guardLastAdmin(id);
    }
    const updated = await this.users.update(id, input);
    if (!updated) {
      throw new NotFoundError('User');
    }
    return toPublicUser(updated);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) {
      throw new ValidationError('You cannot delete your own account');
    }
    await this.guardLastAdmin(id);
    const deleted = await this.users.delete(id);
    if (!deleted) {
      throw new NotFoundError('User');
    }
  }

  /** Prevent demoting/removing/deactivating the final active admin or stripping their permissions. */
  private async guardLastAdmin(targetId: string): Promise<void> {
    const target = await this.users.findById(targetId);
    if (!target) {
      throw new NotFoundError('User');
    }
    if (target.role !== UserRole.Admin) {
      return;
    }
    const adminCount = await this.users.count(UserRole.Admin);
    if (adminCount <= 1) {
      throw new ValidationError('At least one administrator must remain');
    }
  }
}

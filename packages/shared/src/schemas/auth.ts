import { z } from 'zod';

import { USER_ROLES, type UserRole } from '../enums.js';

import type { Timestamped } from './common.js';

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128);

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must differ from the current password',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  role: z.enum(USER_ROLES as [UserRole, ...UserRole[]]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2).max(120).trim().optional(),
  role: z.enum(USER_ROLES as [UserRole, ...UserRole[]]).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface PublicUser extends Timestamped {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

/** Decoded JWT access-token payload. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: UserRole;
}

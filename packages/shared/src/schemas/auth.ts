import { z } from 'zod';

import {
  ADMIN_RESOURCES,
  ALL_PERMISSIONS,
  PERMISSION_ACTIONS,
  USER_ROLES,
  type AdminResource,
  type Permission,
  type PermissionAction,
  type UserRole,
} from '../enums.js';

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

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(120).trim().optional(),
    email: z.string().email().toLowerCase().trim().optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: 'Provide a name or email to update',
  });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

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
  mfaEnabled?: boolean;
  permissions: Permission[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export const mfaRequiredResponseSchema = z.object({
  mfaRequired: z.literal(true),
  email: z.string().email(),
});
export type MfaRequiredResponse = z.infer<typeof mfaRequiredResponseSchema>;

export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter a 6-digit code');

export const mfaLoginSchema = loginSchema.extend({
  totpCode: totpCodeSchema.optional(),
});
export type MfaLoginInput = z.infer<typeof mfaLoginSchema>;

export const setupMfaSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});
export type SetupMfaInput = z.infer<typeof setupMfaSchema>;

export const verifyMfaSetupSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  totpCode: totpCodeSchema,
});
export type VerifyMfaSetupInput = z.infer<typeof verifyMfaSetupSchema>;

export const disableMfaSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  totpCode: totpCodeSchema,
});
export type DisableMfaInput = z.infer<typeof disableMfaSchema>;

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  manualEntry: string;
}

export interface MfaStatusResponse {
  mfaEnabled: boolean;
}

export interface MfaVerifySetupResponse extends MfaStatusResponse {
  recoveryCodes: string[];
}

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(USER_ROLES as [UserRole, ...UserRole[]]),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [Permission, ...Permission[]])).optional(),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, 'Invitation token is required'),
    name: z.string().min(2).max(120).trim(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const updateUserPermissionsSchema = z.object({
  role: z.enum(USER_ROLES as [UserRole, ...UserRole[]]),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [Permission, ...Permission[]])),
});
export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>;

export const permissionQuerySchema = z.object({
  resource: z.enum(ADMIN_RESOURCES as [AdminResource, ...AdminResource[]]).optional(),
  action: z.enum(PERMISSION_ACTIONS as [PermissionAction, ...PermissionAction[]]).optional(),
});
export type PermissionQuery = z.infer<typeof permissionQuerySchema>;

/** Decoded JWT access-token payload. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

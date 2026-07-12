import { ROLE_TEMPLATES, USER_ROLES, UserRole, type Permission, type PublicUser } from '@iaa/shared';
import { type HydratedDocument, Schema, type SchemaOptions, model } from 'mongoose';

const stripSensitive = (_doc: unknown, ret: Record<string, unknown>): void => {
  ret.id = ret._id?.toString();
  delete ret._id;
  delete ret.passwordHash;
  delete ret.refreshTokens;
  delete ret.mfaSecret;
  delete ret.mfaTempSecret;
  delete ret.mfaRecoveryCodes;
  delete ret.passwordResetTokenHash;
  delete ret.passwordResetExpiresAt;
};

/** Like the shared base options, but also strips sensitive fields from JSON/Object output. */
const userSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      stripSensitive(_doc, ret);
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      stripSensitive(_doc, ret);
      return ret;
    },
  },
} satisfies SchemaOptions;

export interface RefreshTokenRecord {
  tokenHash: string;
  family: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaTempSecret?: string;
  mfaRecoveryCodes?: string[];
  refreshTokens: RefreshTokenRecord[];
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserHydrated = HydratedDocument<UserDocument>;

const refreshTokenSchema = new Schema<RefreshTokenRecord>(
  {
    tokenHash: { type: String, required: true, index: true },
    family: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: UserRole.Editor, required: true },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, required: false },
    mfaTempSecret: { type: String, required: false },
    mfaRecoveryCodes: { type: [String], required: false },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    passwordResetTokenHash: { type: String, required: false },
    passwordResetExpiresAt: { type: Date, required: false },
  },
  userSchemaOptions,
);

export const toPublicUser = (doc: UserHydrated): PublicUser => ({
  id: doc.id,
  name: doc.name,
  email: doc.email,
  role: doc.role,
  permissions: doc.permissions?.length ? (doc.permissions as Permission[]) : ROLE_TEMPLATES[doc.role],
  isActive: doc.isActive,
  mfaEnabled: doc.mfaEnabled,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const UserModel = model<UserDocument>('User', userSchema);

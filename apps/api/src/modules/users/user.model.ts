import { USER_ROLES, UserRole, type PublicUser } from '@iaa/shared';
import { type HydratedDocument, Schema, type SchemaOptions, model } from 'mongoose';

/** Like the shared base options, but also strips the password hash from JSON. */
const userSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  },
  toObject: { virtuals: true },
} satisfies SchemaOptions;

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserHydrated = HydratedDocument<UserDocument>;

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: UserRole.Editor, required: true },
    isActive: { type: Boolean, default: true },
  },
  userSchemaOptions,
);

export const toPublicUser = (doc: UserHydrated): PublicUser => ({
  id: doc.id,
  name: doc.name,
  email: doc.email,
  role: doc.role,
  isActive: doc.isActive,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const UserModel = model<UserDocument>('User', userSchema);

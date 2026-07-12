import { USER_ROLES, type Permission, type UserRole } from '@iaa/shared';
import { type HydratedDocument, Schema, model } from 'mongoose';

export interface UserInvitationDocument {
  email: string;
  role: UserRole;
  permissions: Permission[];
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserInvitationHydrated = HydratedDocument<UserInvitationDocument>;

const userInvitationSchema = new Schema<UserInvitationDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: USER_ROLES, required: true },
    permissions: { type: [String], required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, required: false },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const UserInvitationModel = model<UserInvitationDocument>('UserInvitation', userInvitationSchema);

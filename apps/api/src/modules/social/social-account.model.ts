import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export const SOCIAL_PLATFORMS = ['linkedin', 'meta', 'x'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialAccountDocument {
  platform: SocialPlatform;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  accountId: string;
  accountName?: string;
  accountHandle?: string;
  metadata?: Record<string, unknown>;
  connectedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const socialAccountSchema = new Schema<SocialAccountDocument>(
  {
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
    accountId: { type: String, required: true },
    accountName: { type: String },
    accountHandle: { type: String },
    metadata: { type: Schema.Types.Mixed },
    connectedBy: { type: String },
  },
  baseSchemaOptions,
);

export const SocialAccountModel = model<SocialAccountDocument>('SocialAccount', socialAccountSchema);

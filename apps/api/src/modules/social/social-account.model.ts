import { SOCIAL_CONNECTION_STATUSES, type SocialConnectionStatus } from '@iaa/shared';
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
  /** What the provider actually granted, so a missing capability is explainable. */
  scopes: string[];
  /**
   * Whether this connection can still be published through. Set from the
   * provider's own answer, so the dashboard can offer Reconnect rather than
   * failing every post with the same opaque error.
   */
  status: SocialConnectionStatus;
  connectedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const socialAccountSchema = new Schema<SocialAccountDocument>(
  {
    // Not unique on platform alone: a provider may allow more than one account
    // or Page, and the spec asks for several to be storable side by side.
    platform: { type: String, enum: SOCIAL_PLATFORMS, required: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
    accountId: { type: String, required: true },
    accountName: { type: String },
    accountHandle: { type: String },
    metadata: { type: Schema.Types.Mixed },
    scopes: { type: [String], default: [] },
    status: {
      type: String,
      enum: SOCIAL_CONNECTION_STATUSES,
      default: 'active',
      required: true,
      index: true,
    },
    connectedBy: { type: String },
  },
  baseSchemaOptions,
);

// Re-connecting the same account updates it rather than adding a duplicate.
socialAccountSchema.index({ platform: 1, accountId: 1 }, { unique: true });

export const SocialAccountModel = model<SocialAccountDocument>('SocialAccount', socialAccountSchema);

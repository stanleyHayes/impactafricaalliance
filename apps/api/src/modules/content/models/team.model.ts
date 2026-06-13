import { TEAM_TIERS, TeamTier, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface TeamMemberDocument {
  name: string;
  role: string;
  tier: TeamTier;
  bio?: string;
  photo?: MediaAsset;
  linkedInUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<TeamMemberDocument>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    tier: { type: String, enum: TEAM_TIERS, default: TeamTier.Leadership, index: true },
    bio: { type: String },
    photo: { type: mediaSubSchema, required: false },
    linkedInUrl: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const TeamMemberModel = model<TeamMemberDocument>('TeamMember', teamSchema);

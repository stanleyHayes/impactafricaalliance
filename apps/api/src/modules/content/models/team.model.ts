import { type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface TeamMemberDocument {
  name: string;
  role: string;
  bio?: string;
  photo?: MediaAsset;
  linkedInUrl?: string;
  xUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<TeamMemberDocument>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    bio: { type: String },
    photo: { type: mediaSubSchema, required: false },
    linkedInUrl: { type: String },
    xUrl: { type: String },
    facebookUrl: { type: String },
    instagramUrl: { type: String },
    tiktokUrl: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const TeamMemberModel = model<TeamMemberDocument>('TeamMember', teamSchema);

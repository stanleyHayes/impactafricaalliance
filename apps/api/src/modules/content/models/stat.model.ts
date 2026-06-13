import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../../common/model-helpers.js';

export interface ImpactStatDocument {
  key: string;
  label: string;
  value: number;
  suffix: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const statSchema = new Schema<ImpactStatDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true },
    value: { type: Number, required: true, min: 0 },
    suffix: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const ImpactStatModel = model<ImpactStatDocument>('ImpactStat', statSchema);

import { z } from 'zod';

import { slugSchema, type Timestamped } from './common.js';
import { partialForUpdate } from './update.js';

export const impactStatInputSchema = z.object({
  key: slugSchema,
  label: z.string().min(2).max(80).trim(),
  value: z.number().int().min(0),
  suffix: z.string().max(8).default(''),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type ImpactStatInput = z.infer<typeof impactStatInputSchema>;

export const impactStatUpdateSchema = partialForUpdate(impactStatInputSchema);
export type ImpactStatUpdate = z.infer<typeof impactStatUpdateSchema>;

export interface ImpactStat extends Timestamped {
  key: string;
  label: string;
  value: number;
  suffix: string;
  order: number;
  isActive: boolean;
}

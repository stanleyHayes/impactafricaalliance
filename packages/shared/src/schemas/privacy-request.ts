import { z } from 'zod';

import type { Timestamped } from './common.js';

export const PRIVACY_REQUEST_TYPES = ['access', 'rectify', 'delete', 'restrict', 'object'] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_STATUSES = ['pending', 'verified', 'fulfilled', 'rejected'] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const privacyRequestInputSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  type: z.enum(PRIVACY_REQUEST_TYPES),
  details: z.string().max(2000).trim().optional(),
});
export type PrivacyRequestInput = z.infer<typeof privacyRequestInputSchema>;

export const updatePrivacyRequestSchema = z.object({
  status: z.enum(PRIVACY_REQUEST_STATUSES).optional(),
  notes: z.string().max(2000).trim().optional(),
});
export type UpdatePrivacyRequestInput = z.infer<typeof updatePrivacyRequestSchema>;

export interface PrivacyRequest extends Timestamped {
  email: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  details?: string;
  verificationToken: string;
  fulfilledAt?: string;
  notes?: string;
}

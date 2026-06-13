import { z } from 'zod';

import {
  SUBMISSION_STATUSES,
  SubmissionType,
  type SubmissionStatus,
  type SubmissionType as SubmissionTypeT,
} from '../enums.js';

import type { Timestamped } from './common.js';

const email = z.string().email().toLowerCase().trim();
const shortText = z.string().min(2).max(160).trim();
const message = z.string().min(10).max(4000).trim();

/** Public contact form (docs/website-content.md — Contact page). */
export const contactSubmissionSchema = z.object({
  type: z.literal(SubmissionType.Contact),
  name: shortText,
  email,
  subject: z.string().min(2).max(200).trim(),
  message,
});

/** Partner-with-us form (Get Involved → Partner). */
export const partnerSubmissionSchema = z.object({
  type: z.literal(SubmissionType.Partner),
  organizationName: shortText,
  name: shortText,
  email,
  country: z.string().min(2).max(80).trim(),
  partnershipInterest: z.string().min(2).max(120).trim(),
  message,
});

/** Volunteer / mentor form (Get Involved → Volunteer). */
export const volunteerSubmissionSchema = z.object({
  type: z.literal(SubmissionType.Volunteer),
  name: shortText,
  email,
  country: z.string().min(2).max(80).trim(),
  expertise: z.string().min(2).max(160).trim(),
  availabilityHoursPerMonth: z.coerce.number().int().min(1).max(744).optional(),
  message,
});

export const submissionSchema = z.discriminatedUnion('type', [
  contactSubmissionSchema,
  partnerSubmissionSchema,
  volunteerSubmissionSchema,
]);
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
export type PartnerSubmissionInput = z.infer<typeof partnerSubmissionSchema>;
export type VolunteerSubmissionInput = z.infer<typeof volunteerSubmissionSchema>;

export const updateSubmissionStatusSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES as [SubmissionStatus, ...SubmissionStatus[]]),
});

export interface Submission extends Timestamped {
  type: SubmissionTypeT;
  status: SubmissionStatus;
  payload: Record<string, unknown>;
}

/** Newsletter subscribe (footer + homepage banner). */
export const subscribeSchema = z.object({
  email,
  name: shortText.optional(),
  source: z.string().max(60).optional(),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export interface Subscriber extends Timestamped {
  email: string;
  name?: string;
  source?: string;
  unsubscribedAt?: string;
}

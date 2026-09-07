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
const url = z.string().url().trim();

export const CONSENT_VERSION = '2026-07-11';

export const consentSchema = z.object({
  consent: z.boolean().refine((value) => value === true, 'You must agree to the privacy policy'),
  consentVersion: z.string().optional(),
});

/** Public contact form (docs/website-content.md — Contact page). */
export const contactSubmissionSchema = z.object({
  type: z.literal(SubmissionType.Contact),
  name: shortText,
  email,
  subject: z.string().min(2).max(200).trim(),
  message,
}).merge(consentSchema);

/** Partner-with-us form (Get Involved → Partner). */
export const partnerSubmissionSchema = z.object({
  type: z.literal(SubmissionType.Partner),
  organizationName: shortText,
  name: shortText,
  email,
  country: z.string().min(2).max(80).trim(),
  partnershipInterest: z.string().min(2).max(120).trim(),
  message,
}).merge(consentSchema);

/** Volunteer / mentor form (Get Involved → Volunteer). */
export const volunteerSubmissionSchema = z.object({
  type: z.literal(SubmissionType.Volunteer),
  name: shortText,
  email,
  country: z.string().min(2).max(80).trim(),
  expertise: z.string().min(2).max(160).trim(),
  availabilityHoursPerMonth: z.coerce.number().int().min(1).max(744).optional(),
  message,
}).merge(consentSchema);

/** Job application form (Careers → Apply). */
export const jobSubmissionSchema = z.object({
  type: z.literal(SubmissionType.Job),
  jobSlug: z.string().min(1).trim(),
  jobTitle: z.string().min(1).trim(),
  name: shortText,
  email,
  phone: z.string().max(40).trim().optional().or(z.literal('')),
  country: z.string().min(2).max(80).trim(),
  linkedInUrl: url.optional().or(z.literal('')),
  portfolioUrl: url.optional().or(z.literal('')),
  coverLetter: z.string().min(20).max(4000).trim(),
  resumeUrl: url,
  resumePublicId: z.string().optional(),
}).merge(consentSchema);

export const submissionSchema = z.discriminatedUnion('type', [
  contactSubmissionSchema,
  partnerSubmissionSchema,
  volunteerSubmissionSchema,
  jobSubmissionSchema,
]);
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type JobSubmissionInput = z.infer<typeof jobSubmissionSchema>;
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
/**
 * E.164, because that is what the WhatsApp Cloud API addresses people by and
 * a locally-formatted number simply fails to deliver.
 */
export const E164 = /^\+[1-9]\d{7,14}$/;

export const subscribeSchema = z
  .object({
    email,
    name: shortText.optional(),
    source: z.string().max(60).optional(),
    /** Only stored when they have actually asked for WhatsApp updates. */
    whatsappPhone: z
      .string()
      .trim()
      .regex(E164, 'Enter the number in international format, e.g. +233201234567')
      .optional(),
    whatsappOptIn: z.boolean().optional(),
  })
  .merge(consentSchema)
  // A separate, explicit opt-in. Consent to email is not consent to be
  // messaged on WhatsApp, and a number captured without it must never be
  // treated as a subscription.
  .refine((value) => !value.whatsappOptIn || Boolean(value.whatsappPhone), {
    path: ['whatsappPhone'],
    message: 'Add the WhatsApp number to receive updates there.',
  })
  .refine((value) => !value.whatsappPhone || value.whatsappOptIn === true, {
    path: ['whatsappOptIn'],
    message: 'Tick the box to confirm you want WhatsApp updates.',
  });
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const unsubscribeSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;

export interface Subscriber extends Timestamped {
  email: string;
  name?: string;
  source?: string;
  whatsappPhone?: string;
  whatsappOptIn?: boolean;
  whatsappOptInAt?: string;
  consentVersion?: string;
  consentedAt?: string;
  unsubscribedAt?: string;
}

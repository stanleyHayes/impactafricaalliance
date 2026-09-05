import { z } from 'zod';

import type { Timestamped } from './common.js';

const optional = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional();

/**
 * One answer to an event's own question. The label is denormalised so an export
 * stays readable after the question is renamed or removed.
 */
export const eventAnswerSchema = z.object({
  questionId: z.string().min(1).max(60),
  label: z.string().min(1).max(300),
  value: z.union([z.string().max(2000), z.array(z.string().max(200)).max(30)]),
});
export type EventAnswer = z.infer<typeof eventAnswerSchema>;

/**
 * Registration for a free event.
 *
 * The named fields mirror "Section 1 — About You" from the programme
 * questionnaire: the audience profile every session asks for. Only a name,
 * an email and consent are required; everything else is research the visitor
 * is free to skip. Session-specific questions live on the event itself and
 * arrive in `answers`.
 */
export const eventRegistrationInputSchema = z.object({
  fullName: z.string().min(2).max(160).trim(),
  email: z.string().email().max(200).toLowerCase().trim(),
  phone: optional(50),
  country: optional(100),
  city: optional(120),
  ageRange: optional(20),
  gender: optional(40),
  /** "Student", "Entrepreneur/Business owner", and so on. */
  describesYou: optional(80),
  educationLevel: optional(80),
  field: optional(160),
  answers: z.array(eventAnswerSchema).max(60).default([]),
  consent: z
    .boolean()
    .refine((value) => value, { message: 'Please accept the privacy notice to register.' }),
});
export type EventRegistrationInput = z.infer<typeof eventRegistrationInputSchema>;

export interface EventRegistration extends Timestamped {
  id: string;
  eventId: string;
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  ageRange?: string;
  gender?: string;
  describesYou?: string;
  educationLevel?: string;
  field?: string;
  answers: EventAnswer[];
  consent: boolean;
  consentedAt?: string;
}

export interface EventRegistrationResult {
  registered: boolean;
  /** True when this email had already registered for the event. */
  alreadyRegistered: boolean;
}

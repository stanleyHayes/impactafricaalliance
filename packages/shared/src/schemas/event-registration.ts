import { z } from 'zod';

import type { Timestamped } from './common.js';

const optional = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

/**
 * One answer to an event's custom question. The label is denormalised so an
 * export stays readable even after the question is renamed or removed.
 */
export const eventAnswerSchema = z.object({
  questionId: z.string().min(1).max(60),
  label: z.string().min(1).max(300),
  value: z.union([z.string().max(2000), z.array(z.string().max(200)).max(30)]),
});
export type EventAnswer = z.infer<typeof eventAnswerSchema>;

/**
 * Registration for a free event. Only a name, email and consent are required —
 * the rest is audience research the visitor is free to skip.
 */
export const eventRegistrationInputSchema = z.object({
  fullName: z.string().min(2).max(160).trim(),
  email: z.string().email().max(200).toLowerCase().trim(),
  phone: optional(50),
  dateOfBirth: optional(30),
  occupation: optional(160),
  organisation: optional(200),
  country: optional(100),
  answers: z.array(eventAnswerSchema).max(40).default([]),
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
  dateOfBirth?: string;
  occupation?: string;
  organisation?: string;
  country?: string;
  answers: EventAnswer[];
  consent: boolean;
  consentedAt?: string;
}

export interface EventRegistrationResult {
  registered: boolean;
  /** True when this email had already registered for the event. */
  alreadyRegistered: boolean;
}
